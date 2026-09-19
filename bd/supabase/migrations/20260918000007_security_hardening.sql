-- =====================================================================
-- Migración 007: Correcciones de Seguridad (Security Advisor)
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- ── 1. Fijar search_path en todas las funciones ─────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nombre, email, rol)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'rol')::public.user_role, 'cliente')
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_qr_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.qr_usado = TRUE AND OLD.qr_usado = FALSE THEN
        NEW.qr_usado_en = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_movement_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'La bitácora de movimientos es de solo inserción. No se permiten modificaciones ni eliminaciones.';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cancellation_rate(
    fecha_inicio DATE,
    fecha_fin    DATE
)
RETURNS TABLE (
    total_reservas      BIGINT,
    total_canceladas    BIGINT,
    tasa_cancelacion    NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT
        COUNT(*)                                                        AS total_reservas,
        COUNT(*) FILTER (WHERE estado = 'cancelada')                   AS total_canceladas,
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE estado = 'cancelada')
            / NULLIF(COUNT(*), 0),
            2
        )                                                               AS tasa_cancelacion
    FROM public.reservations
    WHERE fecha BETWEEN fecha_inicio AND fecha_fin;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;

-- ── 2. Revocar ejecución pública de funciones SECURITY DEFINER ───────

-- Solo usuarios autenticados con sesión válida pueden llamar estas funciones
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()   FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
-- handle_new_user solo lo ejecuta el trigger interno (SECURITY DEFINER)

-- ── 3. Recrear vistas con SECURITY INVOKER (respetan el RLS) ─────────

-- Vista 1: Estado actual de habitaciones
DROP VIEW IF EXISTS public.v_room_status_now;
CREATE VIEW public.v_room_status_now
WITH (security_invoker = true)
AS
SELECT
    r.id,
    r.nombre,
    r.tipo,
    r.tarifa_base,
    r.estado,
    r.imagen_url,
    COUNT(res.id) FILTER (
        WHERE res.estado IN ('confirmada', 'checkin')
          AND res.fecha = CURRENT_DATE
    ) AS reservas_hoy
FROM public.rooms r
LEFT JOIN public.reservations res ON res.room_id = r.id
GROUP BY r.id, r.nombre, r.tipo, r.tarifa_base, r.estado, r.imagen_url;

-- Vista 2: Ocupación por período
DROP VIEW IF EXISTS public.v_occupancy_by_period;
CREATE VIEW public.v_occupancy_by_period
WITH (security_invoker = true)
AS
SELECT
    DATE_TRUNC('day',   res.fecha::TIMESTAMPTZ) AS por_dia,
    DATE_TRUNC('month', res.fecha::TIMESTAMPTZ) AS por_mes,
    DATE_TRUNC('year',  res.fecha::TIMESTAMPTZ) AS por_año,
    COUNT(*)                                     AS total_reservas,
    COUNT(*) FILTER (WHERE res.estado = 'finalizada') AS finalizadas,
    COUNT(*) FILTER (WHERE res.estado = 'cancelada')  AS canceladas,
    SUM(r.tarifa_base) FILTER (WHERE res.estado = 'finalizada') AS ingresos_soles
FROM public.reservations res
JOIN public.rooms r ON r.id = res.room_id
GROUP BY 1, 2, 3
ORDER BY por_dia DESC;

-- Vista 3: Horas pico de check-in
DROP VIEW IF EXISTS public.v_checkin_peak_hours;
CREATE VIEW public.v_checkin_peak_hours
WITH (security_invoker = true)
AS
SELECT
    EXTRACT(HOUR FROM res.hora_ingreso) AS hora,
    COUNT(*) AS total_checkins
FROM public.reservations res
WHERE res.estado IN ('checkin', 'finalizada')
GROUP BY 1
ORDER BY 1;

-- Vista 4: Ratio check-in virtual vs presencial
DROP VIEW IF EXISTS public.v_virtual_checkin_ratio;
CREATE VIEW public.v_virtual_checkin_ratio
WITH (security_invoker = true)
AS
SELECT
    COUNT(*) FILTER (WHERE qr_usado = TRUE)  AS checkins_qr,
    COUNT(*) FILTER (WHERE qr_usado = FALSE) AS checkins_presenciales,
    COUNT(*)                                  AS total,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE qr_usado = TRUE) / NULLIF(COUNT(*), 0),
        2
    ) AS porcentaje_qr
FROM public.reservations
WHERE estado IN ('checkin', 'finalizada');
