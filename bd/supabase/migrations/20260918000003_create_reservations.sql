-- =====================================================================
-- Migración 003: Reservas
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- Estados de reserva (adaptados del modelo MySQL existente)
CREATE TYPE public.reservation_status AS ENUM (
    'pendiente',
    'confirmada',
    'checkin',
    'finalizada',
    'cancelada'
);

-- Origen de la reserva (online vs presencial)
CREATE TYPE public.reservation_origin AS ENUM (
    'online',
    'manual'
);

-- Tabla de reservas (adaptada de la tabla `reservas` en MySQL)
CREATE TABLE public.reservations (
    id                  SERIAL              PRIMARY KEY,
    room_id             INT                 NOT NULL REFERENCES public.rooms(id),
    client_id           UUID                REFERENCES public.profiles(id),

    -- Datos del huésped
    nombre_huesped      VARCHAR(150)        NOT NULL,
    telefono            VARCHAR(30),
    email               VARCHAR(150)        NOT NULL,

    -- Tiempo de estadía
    fecha               DATE                NOT NULL,
    hora_ingreso        TIME                NOT NULL,
    hora_salida         TIME                NOT NULL,

    -- Información adicional
    notas               VARCHAR(255),
    estado              public.reservation_status   NOT NULL DEFAULT 'pendiente',
    origen              public.reservation_origin   NOT NULL DEFAULT 'online',

    -- Check-in virtual con QR
    qr_token            VARCHAR(64)         NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    qr_usado            BOOLEAN             NOT NULL DEFAULT FALSE,
    qr_usado_en         TIMESTAMPTZ,

    -- Cancelación
    cancelado_en        TIMESTAMPTZ,
    motivo_cancelacion  VARCHAR(255),

    -- Auditoría
    creado_en           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- ── Restricciones de integridad ──────────────────────────────────
    -- La hora de salida debe ser posterior a la hora de ingreso
    CONSTRAINT chk_salida_despues_ingreso
        CHECK (hora_salida > hora_ingreso),

    -- Si se cancela, debe existir motivo y fecha de cancelación
    CONSTRAINT chk_cancelacion_consistente
        CHECK (
            (estado = 'cancelada' AND cancelado_en IS NOT NULL AND motivo_cancelacion IS NOT NULL)
            OR estado <> 'cancelada'
        )
);

-- Índices para consultas frecuentes
CREATE INDEX idx_reservations_room_id    ON public.reservations(room_id);
CREATE INDEX idx_reservations_client_id  ON public.reservations(client_id);
CREATE INDEX idx_reservations_fecha      ON public.reservations(fecha);
CREATE INDEX idx_reservations_estado     ON public.reservations(estado);
CREATE INDEX idx_reservations_qr_token   ON public.reservations(qr_token);

-- Trigger: actualizar actualizado_en automáticamente
CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: marcar qr_usado_en cuando se usa el QR ─────────────────
CREATE OR REPLACE FUNCTION public.handle_qr_used()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.qr_usado = TRUE AND OLD.qr_usado = FALSE THEN
        NEW.qr_usado_en = NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservations_qr_used
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.handle_qr_used();
