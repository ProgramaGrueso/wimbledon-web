-- =====================================================================
-- Migración 002: Habitaciones
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- Estados de habitación (adaptados del modelo MySQL existente)
CREATE TYPE public.room_status AS ENUM (
    'disponible',
    'ocupada',
    'limpieza_pendiente',
    'en_proceso',
    'mantenimiento'
);

-- Tabla de habitaciones (adaptada de la tabla `habitaciones` en MySQL)
CREATE TABLE public.rooms (
    id                      SERIAL      PRIMARY KEY,
    nombre                  VARCHAR(100) NOT NULL,
    tipo                    VARCHAR(60),
    descripcion             TEXT,
    tarifa_base             NUMERIC(8,2) NOT NULL,
    duracion_bloque_horas   INT          NOT NULL DEFAULT 6,
    estado                  public.room_status NOT NULL DEFAULT 'disponible',
    imagen_url              VARCHAR(255),
    creado_en               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger: actualizar actualizado_en automáticamente
CREATE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Datos iniciales (las 3 habitaciones reales del hotel) ────────────
INSERT INTO public.rooms (nombre, tipo, descripcion, tarifa_base, duracion_bloque_horas, imagen_url) VALUES
    ('Suite Presidencial',
     'Presidencial',
     'Jacuzzi hidromasaje, ducha española, pole dance, sillón tántrico, cámara seca.',
     250.00, 6, '/img/suite-presidencial.jpg'),

    ('Tropical Dreams',
     'Temática',
     'Habitación de lujo diseñada para clientes exclusivos. Jacuzzi, ducha española, pole dance, frigobar.',
     180.00, 6, '/img/tropical-dreams.jpg'),

    ('Riverside Dreams Presidencial',
     'Presidencial',
     'Jacuzzi, pole dance, sillón tántrico, cama king, frigobar.',
     220.00, 6, '/img/riverside-dreams.jpg');
