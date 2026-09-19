-- =====================================================================
-- Migración 004: Bitácora de Movimientos Diarios
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- Tipos de movimiento registrables en la bitácora
CREATE TYPE public.movement_type AS ENUM (
    'cobro',
    'cambio_estado',
    'checkin',
    'checkout',
    'cancelacion',
    'nota'
);

-- Tabla de auditoría (insert-only: nunca se actualiza ni elimina)
CREATE TABLE public.daily_movements (
    id              BIGSERIAL           PRIMARY KEY,
    reservation_id  INT                 REFERENCES public.reservations(id),
    room_id         INT                 REFERENCES public.rooms(id),
    user_id         UUID                REFERENCES public.profiles(id),

    tipo            public.movement_type NOT NULL,
    descripcion     TEXT                NOT NULL,
    metadata        JSONB,              -- datos adicionales (monto, estado anterior, etc.)

    creado_en       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Índices para reportes y auditoría
CREATE INDEX idx_movements_reservation_id ON public.daily_movements(reservation_id);
CREATE INDEX idx_movements_room_id        ON public.daily_movements(room_id);
CREATE INDEX idx_movements_user_id        ON public.daily_movements(user_id);
CREATE INDEX idx_movements_tipo           ON public.daily_movements(tipo);
CREATE INDEX idx_movements_creado_en      ON public.daily_movements(creado_en);

-- ── Protección: impedir UPDATE y DELETE en la bitácora ───────────────
CREATE OR REPLACE FUNCTION public.prevent_movement_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'La bitácora de movimientos es de solo inserción. No se permiten modificaciones ni eliminaciones.';
END;
$$;

CREATE TRIGGER trg_prevent_movements_update
    BEFORE UPDATE ON public.daily_movements
    FOR EACH ROW EXECUTE FUNCTION public.prevent_movement_modification();

CREATE TRIGGER trg_prevent_movements_delete
    BEFORE DELETE ON public.daily_movements
    FOR EACH ROW EXECUTE FUNCTION public.prevent_movement_modification();

-- ── Tabla de incidencias de mantenimiento (reportadas por Limpieza) ──
CREATE TABLE public.incidents (
    id              SERIAL              PRIMARY KEY,
    room_id         INT                 NOT NULL REFERENCES public.rooms(id),
    reported_by     UUID                NOT NULL REFERENCES public.profiles(id),
    descripcion     VARCHAR(255)        NOT NULL,
    prioridad       VARCHAR(10)         NOT NULL DEFAULT 'MEDIA'
                        CHECK (prioridad IN ('BAJA','MEDIA','ALTA')),
    estado          VARCHAR(15)         NOT NULL DEFAULT 'ABIERTA'
                        CHECK (estado IN ('ABIERTA','EN_REVISION','RESUELTA')),
    creado_en       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
