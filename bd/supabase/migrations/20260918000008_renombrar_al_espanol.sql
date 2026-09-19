-- =====================================================================
-- Migración 008: Renombrar tablas y columnas al español
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- ── 1. Eliminar vistas primero (dependen de los nombres de tablas) ───
DROP VIEW IF EXISTS public.v_room_status_now;
DROP VIEW IF EXISTS public.v_occupancy_by_period;
DROP VIEW IF EXISTS public.v_checkin_peak_hours;
DROP VIEW IF EXISTS public.v_virtual_checkin_ratio;

-- ── 2. Renombrar tablas ──────────────────────────────────────────────
ALTER TABLE public.profiles        RENAME TO perfiles;
ALTER TABLE public.rooms           RENAME TO habitaciones;
ALTER TABLE public.reservations    RENAME TO reservas;
ALTER TABLE public.daily_movements RENAME TO movimientos_diarios;
ALTER TABLE public.incidents       RENAME TO incidencias;

-- ── 3. Renombrar columnas en inglés dentro de cada tabla ─────────────

-- reservas: room_id → habitacion_id, client_id → cliente_id
ALTER TABLE public.reservas RENAME COLUMN room_id    TO habitacion_id;
ALTER TABLE public.reservas RENAME COLUMN client_id  TO cliente_id;

-- movimientos_diarios: reservation_id → reserva_id, room_id → habitacion_id, user_id → usuario_id
ALTER TABLE public.movimientos_diarios RENAME COLUMN reservation_id TO reserva_id;
ALTER TABLE public.movimientos_diarios RENAME COLUMN room_id        TO habitacion_id;
ALTER TABLE public.movimientos_diarios RENAME COLUMN user_id        TO usuario_id;

-- incidencias: room_id → habitacion_id, reported_by → reportado_por
ALTER TABLE public.incidencias RENAME COLUMN room_id      TO habitacion_id;
ALTER TABLE public.incidencias RENAME COLUMN reported_by  TO reportado_por;

-- ── 4. Actualizar funciones que mencionan nombres de tablas ──────────

-- handle_new_user: apunta a perfiles en lugar de profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre, email, rol)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'rol')::public.user_role, 'cliente')
    );
    RETURN NEW;
END;
$$;

-- current_user_role: apunta a perfiles en lugar de profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- get_cancellation_rate: apunta a reservas en lugar de reservations
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
        COUNT(*)                                                    AS total_reservas,
        COUNT(*) FILTER (WHERE estado = 'cancelada')               AS total_canceladas,
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE estado = 'cancelada')
            / NULLIF(COUNT(*), 0),
            2
        )                                                           AS tasa_cancelacion
    FROM public.reservas
    WHERE fecha BETWEEN fecha_inicio AND fecha_fin;
$$;

-- ── 5. Recrear vistas con nombres en español ─────────────────────────

-- Vista 1: Estado actual de habitaciones
CREATE VIEW public.v_estado_habitaciones
WITH (security_invoker = true)
AS
SELECT
    h.id,
    h.nombre,
    h.tipo,
    h.tarifa_base,
    h.estado,
    h.imagen_url,
    COUNT(r.id) FILTER (
        WHERE r.estado IN ('confirmada', 'checkin')
          AND r.fecha = CURRENT_DATE
    ) AS reservas_hoy
FROM public.habitaciones h
LEFT JOIN public.reservas r ON r.habitacion_id = h.id
GROUP BY h.id, h.nombre, h.tipo, h.tarifa_base, h.estado, h.imagen_url;

-- Vista 2: Ocupación por período
CREATE VIEW public.v_ocupacion_por_periodo
WITH (security_invoker = true)
AS
SELECT
    DATE_TRUNC('day',   r.fecha::TIMESTAMPTZ) AS por_dia,
    DATE_TRUNC('month', r.fecha::TIMESTAMPTZ) AS por_mes,
    DATE_TRUNC('year',  r.fecha::TIMESTAMPTZ) AS por_año,
    COUNT(*)                                   AS total_reservas,
    COUNT(*) FILTER (WHERE r.estado = 'finalizada') AS finalizadas,
    COUNT(*) FILTER (WHERE r.estado = 'cancelada')  AS canceladas,
    SUM(h.tarifa_base) FILTER (WHERE r.estado = 'finalizada') AS ingresos_soles
FROM public.reservas r
JOIN public.habitaciones h ON h.id = r.habitacion_id
GROUP BY 1, 2, 3
ORDER BY por_dia DESC;

-- Vista 3: Horas pico de check-in
CREATE VIEW public.v_horas_pico_checkin
WITH (security_invoker = true)
AS
SELECT
    EXTRACT(HOUR FROM r.hora_ingreso) AS hora,
    COUNT(*) AS total_checkins
FROM public.reservas r
WHERE r.estado IN ('checkin', 'finalizada')
GROUP BY 1
ORDER BY 1;

-- Vista 4: Ratio check-in virtual vs presencial
CREATE VIEW public.v_ratio_checkin_virtual
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
FROM public.reservas
WHERE estado IN ('checkin', 'finalizada');
