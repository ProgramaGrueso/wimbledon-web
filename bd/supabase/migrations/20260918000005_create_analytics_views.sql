-- =====================================================================
-- Migración 005: Vistas Analíticas y Funciones RPC
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- ── Vista 1: Estado actual de todas las habitaciones ─────────────────
CREATE OR REPLACE VIEW public.v_room_status_now AS
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

-- ── Vista 2: Ocupación agrupada por día, mes y año ───────────────────
CREATE OR REPLACE VIEW public.v_occupancy_by_period AS
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

-- ── Vista 3: Distribución horaria de check-ins ───────────────────────
CREATE OR REPLACE VIEW public.v_checkin_peak_hours AS
SELECT
    EXTRACT(HOUR FROM res.hora_ingreso) AS hora,
    COUNT(*) AS total_checkins
FROM public.reservations res
WHERE res.estado IN ('checkin', 'finalizada')
GROUP BY 1
ORDER BY 1;

-- ── Vista 4: Adopción del check-in virtual (QR) vs presencial ────────
CREATE OR REPLACE VIEW public.v_virtual_checkin_ratio AS
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

-- ── Función RPC: Tasa de cancelación en un rango de fechas ───────────
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
