-- =====================================================================
-- Hotel Wimbledon — Base de Datos Oficial Consolidada de Producción
-- Arquitectura: 132 Habitaciones Físicas (4 Pisos), 16 Categorías de Catálogo,
-- DNI Único por Huésped, Inventario/Stock de Alimentos y Bebidas,
-- RLS, Triggers de Integridad, Vistas Analíticas y 1 Mes de Operación Histórica.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 0. LIMPIEZA IDEMPOTENTE PREVIA ──────────────────────────────────
DROP VIEW IF EXISTS public.v_kpis_financieros CASCADE;
DROP VIEW IF EXISTS public.v_ratio_checkin_virtual CASCADE;
DROP VIEW IF EXISTS public.v_horas_pico_checkin CASCADE;
DROP VIEW IF EXISTS public.v_ocupacion_por_periodo CASCADE;
DROP VIEW IF EXISTS public.v_rack_habitaciones_132 CASCADE;
DROP VIEW IF EXISTS public.v_estado_habitaciones CASCADE;

DROP TABLE IF EXISTS public.consumos_pedidos CASCADE;
DROP TABLE IF EXISTS public.carta_gastronomia CASCADE;
DROP TABLE IF EXISTS public.turnos CASCADE;
DROP TABLE IF EXISTS public.incidencias CASCADE;
DROP TABLE IF EXISTS public.movimientos_diarios CASCADE;
DROP TABLE IF EXISTS public.reservas CASCADE;
DROP TABLE IF EXISTS public.habitaciones_fisicas CASCADE;
DROP TABLE IF EXISTS public.tipos_habitacion CASCADE;
DROP TABLE IF EXISTS public.perfiles CASCADE;

-- Limpieza de tipos ENUM previos para asegurar que contengan todos los valores
DROP TYPE IF EXISTS public.movement_type CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.reservation_origin CASCADE;
DROP TYPE IF EXISTS public.reservation_status CASCADE;
DROP TYPE IF EXISTS public.room_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- ── 1. TIPOS ENUMERADOS ─────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'super_admin',
        'administrador',
        'recepcionista',
        'limpieza',
        'cliente'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.room_status AS ENUM (
        'disponible',
        'ocupada',
        'limpieza_pendiente',
        'en_proceso',
        'mantenimiento'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.reservation_status AS ENUM (
        'pendiente',
        'confirmada',
        'checkin',
        'finalizada',
        'cancelada'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.reservation_origin AS ENUM (
        'online',
        'manual'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM (
        'yape',
        'plin',
        'tarjeta',
        'efectivo',
        'transferencia'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.movement_type AS ENUM (
        'cobro',
        'cambio_estado',
        'checkin',
        'checkout',
        'cancelacion',
        'incidencia',
        'consumo',
        'nota'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 2. TABLAS PRINCIPALES ───────────────────────────────────────────

-- 2.1 Perfiles de Usuarios y Huéspedes con DNI Único Obligatorio
CREATE TABLE public.perfiles (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id        UUID            REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_documento      VARCHAR(10)     NOT NULL DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'CE', 'PASAPORTE')),
    numero_documento    VARCHAR(20)     NOT NULL UNIQUE, -- 1 persona = 1 DNI único e irrepetible
    nombre              VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    telefono            VARCHAR(30)     NOT NULL,
    rol                 public.user_role NOT NULL DEFAULT 'cliente',
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfiles_documento ON public.perfiles(numero_documento);
CREATE INDEX idx_perfiles_rol       ON public.perfiles(rol);
CREATE INDEX idx_perfiles_email     ON public.perfiles(email);

-- 2.2 Catálogo Oficial de los 16 Tipos de Habitación (Comercial)
CREATE TABLE public.tipos_habitacion (
    id                      INT             PRIMARY KEY, -- ID oficial de catálogo
    slug                    VARCHAR(80)     NOT NULL UNIQUE,
    nombre                  VARCHAR(120)    NOT NULL,
    categoria               VARCHAR(60)     NOT NULL,
    frase_destacada         TEXT,
    descripcion             TEXT            NOT NULL,
    tarifa_base             NUMERIC(10,2)   NOT NULL,
    tarifa_exacta           NUMERIC(10,2)   NOT NULL,
    duracion_bloque_horas   INT             NOT NULL DEFAULT 6,
    capacidad_personas      INT             NOT NULL DEFAULT 2,
    imagen_url              VARCHAR(350)    NOT NULL,
    comodidades             JSONB           DEFAULT '[]'::jsonb,
    creado_en               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 2.3 Las 132 Habitaciones Físicas Reales del Hotel Wimbledon (Distribuidas en 4 Pisos)
CREATE TABLE public.habitaciones_fisicas (
    id                      INT             PRIMARY KEY, -- Número de puerta físico: 101..134, 201..238, 301..336, 401..424
    numero                  VARCHAR(10)     NOT NULL UNIQUE,
    piso                    INT             NOT NULL CHECK (piso BETWEEN 1 AND 4),
    tipo_id                 INT             NOT NULL REFERENCES public.tipos_habitacion(id),
    tiene_cochera_directa   BOOLEAN         NOT NULL DEFAULT FALSE,
    estado                  public.room_status NOT NULL DEFAULT 'disponible',
    notas_operativas        VARCHAR(255),
    creado_en               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hab_fisicas_piso    ON public.habitaciones_fisicas(piso);
CREATE INDEX idx_hab_fisicas_tipo    ON public.habitaciones_fisicas(tipo_id);
CREATE INDEX idx_hab_fisicas_estado  ON public.habitaciones_fisicas(estado);

-- 2.4 Reservas de Habitaciones (Asignadas a una Habitación Física Específica)
CREATE TABLE public.reservas (
    id                  SERIAL              PRIMARY KEY,
    habitacion_fisica_id INT                NOT NULL REFERENCES public.habitaciones_fisicas(id),
    cliente_id          UUID                REFERENCES public.perfiles(id) ON DELETE SET NULL,

    -- Datos del huésped con documento verificado
    tipo_documento      VARCHAR(10)         NOT NULL DEFAULT 'DNI',
    numero_documento    VARCHAR(20)         NOT NULL,
    nombre_huesped      VARCHAR(150)        NOT NULL,
    telefono            VARCHAR(30)         NOT NULL,
    email               VARCHAR(150)        NOT NULL,

    -- Fechas y bloques horarios
    fecha               DATE                NOT NULL,
    hora_ingreso        TIME                NOT NULL,
    hora_salida         TIME                NOT NULL,
    duracion_horas      INT                 NOT NULL DEFAULT 6,

    -- Comercial y pagos
    monto_total         NUMERIC(10,2)       NOT NULL,
    adelanto            NUMERIC(10,2)       NOT NULL DEFAULT 0.00,
    metodo_pago         public.payment_method NOT NULL DEFAULT 'yape',
    notas               VARCHAR(255),
    estado              public.reservation_status NOT NULL DEFAULT 'pendiente',
    origen              public.reservation_origin NOT NULL DEFAULT 'online',

    -- Check-in virtual QR discreto
    qr_token            VARCHAR(64)         NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    qr_usado            BOOLEAN             NOT NULL DEFAULT FALSE,
    qr_usado_en         TIMESTAMPTZ,

    -- Cancelación consistente
    cancelado_en        TIMESTAMPTZ,
    motivo_cancelacion  VARCHAR(255),

    metadata            JSONB               DEFAULT '{}'::jsonb,
    creado_en           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservas_hab_fisica ON public.reservas(habitacion_fisica_id);
CREATE INDEX idx_reservas_cliente    ON public.reservas(cliente_id);
CREATE INDEX idx_reservas_doc        ON public.reservas(numero_documento);
CREATE INDEX idx_reservas_fecha      ON public.reservas(fecha);
CREATE INDEX idx_reservas_estado     ON public.reservas(estado);
CREATE INDEX idx_reservas_qr         ON public.reservas(qr_token);

-- 2.5 Bitácora de Movimientos y Transacciones de Caja
CREATE TABLE public.movimientos_diarios (
    id                  BIGSERIAL           PRIMARY KEY,
    reserva_id          INT                 REFERENCES public.reservas(id) ON DELETE SET NULL,
    habitacion_fisica_id INT                REFERENCES public.habitaciones_fisicas(id) ON DELETE SET NULL,
    usuario_id          UUID                REFERENCES public.perfiles(id) ON DELETE SET NULL,
    tipo                public.movement_type NOT NULL,
    descripcion         TEXT                NOT NULL,
    monto               NUMERIC(10,2)       DEFAULT 0.00,
    metadata            JSONB               DEFAULT '{}'::jsonb,
    creado_en           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimientos_reserva ON public.movimientos_diarios(reserva_id);
CREATE INDEX idx_movimientos_hab     ON public.movimientos_diarios(habitacion_fisica_id);
CREATE INDEX idx_movimientos_tipo    ON public.movimientos_diarios(tipo);

-- 2.6 Carta Gastronómica y Bebidas con Control de Stock en Tiempo Real
CREATE TABLE public.carta_gastronomia (
    id              SERIAL          PRIMARY KEY,
    nombre          VARCHAR(120)    NOT NULL UNIQUE,
    categoria       VARCHAR(50)     NOT NULL, -- 'plato', 'hamburguesa', 'desayuno', 'piqueo', 'bebida'
    precio          NUMERIC(8,2)    NOT NULL,
    stock_actual    INT             NOT NULL DEFAULT 20 CHECK (stock_actual >= 0),
    stock_minimo    INT             NOT NULL DEFAULT 5,
    descripcion     TEXT,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 2.7 Pedidos de Room Service / Frigobar asociados a la Reserva
CREATE TABLE public.consumos_pedidos (
    id              SERIAL          PRIMARY KEY,
    reserva_id      INT             NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    item_id         INT             NOT NULL REFERENCES public.carta_gastronomia(id),
    cantidad        INT             NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario NUMERIC(8,2)    NOT NULL,
    subtotal        NUMERIC(8,2)    GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    estado          VARCHAR(20)     NOT NULL DEFAULT 'entregado' CHECK (estado IN ('solicitado', 'en_preparacion', 'entregado', 'cancelado')),
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 2.8 Incidencias de Mantenimiento (Housekeeping / Limpieza)
CREATE TABLE public.incidencias (
    id                  SERIAL          PRIMARY KEY,
    habitacion_fisica_id INT            NOT NULL REFERENCES public.habitaciones_fisicas(id) ON DELETE CASCADE,
    reportado_por       UUID            REFERENCES public.perfiles(id) ON DELETE SET NULL,
    descripcion         VARCHAR(255)    NOT NULL,
    prioridad           VARCHAR(10)     NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA','MEDIA','ALTA')),
    estado              VARCHAR(15)     NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','EN_REVISION','RESUELTA')),
    creado_en           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidencias_hab    ON public.incidencias(habitacion_fisica_id);
CREATE INDEX idx_incidencias_estado ON public.incidencias(estado);

-- 2.9 Turnos de Personal
CREATE TABLE public.turnos (
    id              SERIAL          PRIMARY KEY,
    usuario_id      UUID            NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    fecha           DATE            NOT NULL,
    hora_inicio     TIME            NOT NULL,
    hora_fin        TIME            NOT NULL,
    creado_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 3. TRIGGERS DE NEGOCIO Y CONTROL DE INVENTARIO ──────────────────

-- 3.1 Actualizador de timestamp
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

CREATE TRIGGER trg_perfiles_upd BEFORE UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hab_fisicas_upd BEFORE UPDATE ON public.habitaciones_fisicas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reservas_upd BEFORE UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_incidencias_upd BEFORE UPDATE ON public.incidencias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.2 Descuento automático de Stock al pedir comida o bebidas
CREATE OR REPLACE FUNCTION public.descontar_stock_consumo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    stock_disponible INT;
BEGIN
    SELECT stock_actual INTO stock_disponible
    FROM public.carta_gastronomia
    WHERE id = NEW.item_id
    FOR UPDATE;

    IF stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID %. Disponible: %, Solicitado: %', 
            NEW.item_id, stock_disponible, NEW.cantidad;
    END IF;

    UPDATE public.carta_gastronomia
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.item_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_descontar_stock
    BEFORE INSERT ON public.consumos_pedidos
    FOR EACH ROW EXECUTE FUNCTION public.descontar_stock_consumo();

-- 3.3 Check-in automático al leer QR y actualizar estado de la habitación física a 'ocupada'
CREATE OR REPLACE FUNCTION public.handle_qr_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.qr_usado = TRUE AND (OLD.qr_usado IS NULL OR OLD.qr_usado = FALSE) THEN
        NEW.qr_usado_en = NOW();
        IF NEW.estado IN ('confirmada', 'pendiente') THEN
            NEW.estado = 'checkin';
        END IF;

        -- Marcar la habitación física como OCUPADA automáticamente
        UPDATE public.habitaciones_fisicas
        SET estado = 'ocupada'
        WHERE id = NEW.habitacion_fisica_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservas_qr_used
    BEFORE UPDATE ON public.reservas
    FOR EACH ROW EXECUTE FUNCTION public.handle_qr_used();

-- ── 4. VISTAS ANALÍTICAS Y RACK DE 132 HABITACIONES ─────────────────

-- 4.1 Rack Maestro en Vivo de las 132 Habitaciones Físicas
CREATE OR REPLACE VIEW public.v_rack_habitaciones_132
WITH (security_invoker = true)
AS
SELECT
    hf.id AS habitacion_id,
    hf.numero,
    hf.piso,
    hf.tiene_cochera_directa,
    hf.estado AS estado_fisico,
    th.id AS tipo_id,
    th.nombre AS tipo_nombre,
    th.categoria,
    th.tarifa_base,
    th.duracion_bloque_horas,
    th.imagen_url,
    COALESCE(
        (
            SELECT json_build_object(
                'reserva_id', r.id,
                'nombre_huesped', r.nombre_huesped,
                'dni', r.numero_documento,
                'hora_ingreso', r.hora_ingreso,
                'hora_salida', r.hora_salida,
                'estado', r.estado,
                'qr_token', r.qr_token
            )
            FROM public.reservas r
            WHERE r.habitacion_fisica_id = hf.id
              AND r.fecha = CURRENT_DATE
              AND r.estado = 'checkin'
            LIMIT 1
        ),
        NULL
    ) AS ocupacion_actual
FROM public.habitaciones_fisicas hf
JOIN public.tipos_habitacion th ON th.id = hf.tipo_id
ORDER BY hf.id ASC;

-- 4.2 Métricas de ocupación e ingresos agrupados
CREATE OR REPLACE VIEW public.v_ocupacion_por_periodo
WITH (security_invoker = true)
AS
SELECT
    DATE_TRUNC('day',   r.fecha::TIMESTAMPTZ) AS por_dia,
    DATE_TRUNC('month', r.fecha::TIMESTAMPTZ) AS por_mes,
    COUNT(*)                                   AS total_reservas,
    COUNT(*) FILTER (WHERE r.estado IN ('finalizada', 'checkin')) AS efectivas,
    COUNT(*) FILTER (WHERE r.estado = 'cancelada')                AS canceladas,
    COALESCE(SUM(r.monto_total) FILTER (WHERE r.estado IN ('finalizada', 'checkin')), 0) AS ingresos_soles
FROM public.reservas r
GROUP BY 1, 2
ORDER BY por_dia DESC;

-- 4.3 Horas pico de check-in
CREATE OR REPLACE VIEW public.v_horas_pico_checkin
WITH (security_invoker = true)
AS
SELECT
    EXTRACT(HOUR FROM r.hora_ingreso) AS hora,
    COUNT(*) AS total_checkins
FROM public.reservas r
WHERE r.estado IN ('checkin', 'finalizada')
GROUP BY 1
ORDER BY 1;

-- 4.4 Ratio de Check-in Virtual QR vs Mostrador
CREATE OR REPLACE VIEW public.v_ratio_checkin_virtual
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

-- 4.5 Resumen Financiero y KPIs del Hotel Wimbledon
CREATE OR REPLACE VIEW public.v_kpis_financieros
WITH (security_invoker = true)
AS
SELECT
    COUNT(*) AS total_historico_reservas,
    COALESCE(SUM(monto_total) FILTER (WHERE estado IN ('finalizada', 'checkin')), 0) AS facturacion_total_soles,
    ROUND(AVG(monto_total) FILTER (WHERE estado IN ('finalizada', 'checkin')), 2) AS ticket_promedio_soles,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE estado = 'cancelada') / NULLIF(COUNT(*), 0),
        2
    ) AS tasa_cancelacion_pct,
    COUNT(*) FILTER (WHERE origen = 'online') AS reservas_web,
    COUNT(*) FILTER (WHERE origen = 'manual') AS reservas_mostrador,
    (SELECT COUNT(*) FROM public.habitaciones_fisicas WHERE estado = 'ocupada') AS habitaciones_ocupadas_ahora,
    (SELECT COUNT(*) FROM public.habitaciones_fisicas) AS total_habitaciones_inventario
FROM public.reservas;

-- ── 5. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS) ────────────

ALTER TABLE public.perfiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_habitacion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones_fisicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_diarios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carta_gastronomia    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumos_pedidos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos                ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso publico tipos_habitacion"     ON public.tipos_habitacion FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Acceso publico habitaciones_fisicas" ON public.habitaciones_fisicas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestion reservas"                    ON public.reservas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestion movimientos"                 ON public.movimientos_diarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestion carta"                       ON public.carta_gastronomia FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestion consumos"                    ON public.consumos_pedidos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestion incidencias"                 ON public.incidencias FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestion perfiles"                    ON public.perfiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestion turnos"                      ON public.turnos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 6. CARGA DE DATOS OFICIALES Y GENERACIÓN DE 132 HABITACIONES ────

-- 6.1 Catálogo Oficial de los 16 Tipos de Habitaciones
INSERT INTO public.tipos_habitacion (id, slug, nombre, categoria, frase_destacada, descripcion, tarifa_base, tarifa_exacta, duracion_bloque_horas, imagen_url, comodidades) VALUES
(860, 'suite-presidencial', 'Suite Presidencial', 'Presidencial', 
 '¡Ten los sueños más placenteros! Habitación de lujo equipada con todos los detalles de la realeza.',
 'Cama redonda, Sillón Tántrico de Cuarzo, Cámara Seca, Ducha española, Jacuzzi con Hidromasaje, Pole Dance, Baño privado y Frigobar.',
 156.00, 156.36, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/12/suite-presidencial-1.jpg',
 '["Cama redonda", "Sillón Tántrico de Cuarzo", "Cámara Seca", "Ducha española", "Jacuzzi Hidromasaje", "Pole Dance", "Baño privado", "Frigobar"]'::jsonb),

(528, 'tropical-dreams', 'Tropical Dreams', 'Temática',
 'Habitación de lujo diseñada para vivir un momento inolvidable con ambientación exótica.',
 'Cama Queen confort 100%, Pole Dance, Jacuzzi, Ducha Española, Frigo bar.',
 125.00, 125.08, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/Tropical-Dreams.jpg',
 '["Cama Queen Confort 100%", "Ducha española", "Jacuzzi", "Pole Dance", "Frigo bar", "Luces LED RGB"]'::jsonb),

(526, 'riverside-dreams-presidencial', 'Riverside Dreams Presidencial', 'Presidencial',
 '¡Dónde fluye la pasión! Con vista a un río artificial y diseño de máxima categoría.',
 'Vista a un río artificial, Cama King, Jacuzzi, Pole Dance, Sillón Tántrico, Frigo bar.',
 156.00, 156.36, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/Riverside-Dreams-Presidencial.jpg',
 '["Vista a un río artificial", "Sillón Tántrico", "Cama King size", "Jacuzzi", "Pole Dance", "Frigo bar"]'::jsonb),

(523, 'suite-presidencial-con-camara-seca', 'Suite Presidencial con Cámara Seca', 'Presidencial',
 'Equipada con sauna seco privado de madera nórdica y jacuzzi hidromasaje.',
 'Cama redonda, Sillón Tántrico de Cuarzo, Cámara Seca, Ducha española, Jacuzzi, Pole Dance, Frigobar.',
 200.00, 200.00, 7, 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/Suite-Presidencial-Camara-Seca.jpg',
 '["Cama redonda", "Sillón Tántrico de Cuarzo", "Cámara Seca", "Ducha Española", "Jacuzzi", "Pole Dance", "Frigo bar"]'::jsonb),

(227, 'dark-fantasies', 'Dark Fantasies', 'Temática',
 '¡El límite lo pones tú! Exclusiva con cruz y pared de sumisión para juego erótico.',
 'Cama King, Cruz de sumisión, Pared de sumisión, Ducha española, Jacuzzi, Pole dance, Sillón Tántrico y Frigobar.',
 208.00, 208.47, 7, 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/dark-fantasies.jpg',
 '["Cama King size", "Cruz de sumisión", "Ducha española", "Jacuzzi", "Pole Dance", "Sillón Tántrico", "Frigo bar"]'::jsonb),

(43, 'habitacion-especial', 'Habitación Especial', 'Especial',
 '¡Un espacio único! Con cochera privada directa para máxima discreción vehicular.',
 'Estacionamiento directo a la Habitación, Cama redonda, Sillón tántrico, Ducha española, Jacuzzi, Frigobar.',
 150.00, 150.00, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/habitacion-especial.jpg',
 '["Estacionamiento directo a la Habitación", "Cama redonda", "Sillón tántrico", "Ducha española", "Jacuzzi", "Frigobar"]'::jsonb),

(35, 'habitacion-delux', 'Habitación Delux', 'Deluxe',
 'Confortable y accesible para un instante de descanso y placer.',
 'Cama de Dos Plazas, Baño con Agua Fría y Caliente, Frigobar.',
 55.00, 55.00, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/simple-vista-al-mar.jpg',
 '["Cama 2 plazas", "Baño con agua fría y caliente", "Frigo bar"]'::jsonb),

(33, 'hawaian-dreams', 'Hawaian Dreams', 'Temática',
 'Detalles tropicales que recrean un ambiente de playa y relax.',
 'Cama 2 Plazas confort 100%, Aire acondicionado, Baño agua fría – caliente, Frigobar.',
 73.00, 72.97, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/08/hawaiam-dreams.jpg',
 '["Cama 2 plazas confort 100%", "Aire acondicionado", "Baño agua fría y caliente", "Frigobar"]'::jsonb),

(31, 'simple-con-jacuzzi', 'Simple con Jacuzzi', 'Simple',
 'Cochera directa y tina con hidromasaje individual.',
 'Parking directo a la habitación, Cama 2 Plazas, Ducha Española, Baño agua fría – caliente, Frigobar.',
 89.00, 88.60, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/simple-con-jacuzzi-1.jpg',
 '["Parking directo a la habitación", "Cama 2 plazas confort 100%", "Ducha española", "Jacuzzi", "Frigobar"]'::jsonb),

(29, 'simple-vista-al-mar', 'Simple Vista al Mar', 'Simple',
 'Habitación con vista frontal al Océano Pacífico.',
 'Vista al mar, Cama 2 Plazas confort 100%, Baño agua fría – caliente, Frigobar.',
 73.00, 72.97, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/simple-vista-al-mar.jpg',
 '["Vista al mar", "Cama 2 plazas confort 100%", "Frigo bar", "Baño agua fría y caliente"]'::jsonb),

(27, 'habitacion-con-jacuzzi-deluxe', 'Jacuzzi Deluxe', 'Deluxe',
 'Elegante y espaciosa con jacuzzi de hidromasaje y pole dance.',
 'Cama Queen confort 100%, Pole dance, Jacuzzi, Aire acondicionado, Frigobar.',
 104.00, 104.24, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/Jacuzzi-Deluxe.jpg',
 '["Cama Queen size", "Jacuzzi", "Pole dance", "Baño agua fría y caliente", "Frigo bar"]'::jsonb),

(24, 'camara-seca-y-jacuzzi', 'Cámara Seca y Jacuzzi', 'Presidencial',
 'Experiencia de spa integral con cámara seca y tina de hidromasaje.',
 'Cama redonda confort 100%, Cámara seca, Pole dance, Jacuzzi, Ducha española, Frigobar.',
 200.00, 200.00, 7, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/camara-seca-.jpg',
 '["Cámara redonda confort 100%", "Cámara seca", "Jacuzzi", "Pole Dance", "Ducha española", "Frigo bar"]'::jsonb),

(22, 'riverside-dreams', 'Riverside Dreams', 'Temática',
 'Diseño temático con vista al río artificial y jacuzzi.',
 'Cama Queen confort 100%, Pole dance, Jacuzzi, Aire acondicionado, Frigobar.',
 125.00, 125.08, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/riverside-dreams.jpg',
 '["Cama Queen size", "Jacuzzi", "Pole Dance", "Aire acondicionado", "Frigo bar"]'::jsonb),

(20, 'venetian-flowers', 'Venetian Flowers', 'Temática',
 'Decoración floral renacentista con luces tenues y jacuzzi.',
 'Cama Queen confort 100%, Pole dance, Jacuzzi, Aire acondicionado, Frigobar.',
 100.00, 100.00, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/venetian-flowers.jpg',
 '["Cama Queen size", "Jacuzzi", "Aire acondicionado", "Baño agua fría y caliente", "Frigo bar"]'::jsonb),

(16, 'pacific-dreams', 'Pacific Dreams', 'Temática',
 'Vista al mar panorámica, cama Queen y cabina hidromasaje.',
 'Vista al mar, Cama Queen size, Sillón tántrico, Ducha española, Jacuzzi, Pole Dance, Frigobar.',
 125.00, 125.08, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/pacific-dreams.jpg',
 '["Vista al mar", "Cama Queen size", "Ducha española", "Jacuzzi", "Pole Dance", "Frigobar"]'::jsonb),

(14, 'pacific-dreams-presidencial', 'Pacific Dreams Presidencial', 'Presidencial',
 'La suite insignia frente al Pacífico con la mayor vista y amenidades completas.',
 'Vista al mar, Cama King size, Sillón tántrico, Cabina hidromasaje, Ducha española, Jacuzzi, Pole Dance, Frigobar.',
 177.00, 177.20, 6, 'https://wimbledon-hotel.com/wp-content/uploads/2022/07/pacific-dreams-presidencial.jpg',
 '["Vista al mar", "Cama King size", "Sillón tántrico", "Ducha española", "Jacuzzi", "Pole Dance", "Frigobar"]'::jsonb);

-- 6.2 Generación de las 132 Habitaciones Físicas Reales (4 Pisos)
-- Piso 1 (101 a 134 = 34 habs con cochera directa y estándar)
-- Piso 2 (201 a 238 = 38 habs delux y temáticas intermedias)
-- Piso 3 (301 a 336 = 36 habs con vistas y jacuzzi)
-- Piso 4 (401 a 424 = 24 suites presidenciales, saunas y temáticas premium)
-- Total = exatamente 132 habitaciones
DO $$
DECLARE
    i INT;
BEGIN
    -- PISO 1 (34 Habitaciones: 101 al 134) - Cochera directa y accesos vehiculares
    FOR i IN 101..110 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 1, 43, true, 'disponible'); -- 10 Habitación Especial con cochera
    END LOOP;

    FOR i IN 111..120 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 1, 35, false, 'disponible'); -- 10 Habitación Delux
    END LOOP;

    FOR i IN 121..134 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 1, 31, true, 'disponible'); -- 14 Simple con Jacuzzi y parking directo
    END LOOP;

    -- PISO 2 (38 Habitaciones: 201 al 238)
    FOR i IN 201..210 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 2, 35, false, 'disponible'); -- 10 Habitación Delux
    END LOOP;

    FOR i IN 211..220 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 2, 33, false, 'disponible'); -- 10 Hawaian Dreams
    END LOOP;

    FOR i IN 221..230 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 2, 27, false, 'disponible'); -- 10 Jacuzzi Deluxe
    END LOOP;

    FOR i IN 231..238 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 2, 20, false, 'disponible'); -- 8 Venetian Flowers
    END LOOP;

    -- PISO 3 (36 Habitaciones: 301 al 336)
    FOR i IN 301..308 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 3, 528, false, 'disponible'); -- 8 Tropical Dreams
    END LOOP;

    FOR i IN 309..320 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 3, 29, false, 'disponible'); -- 12 Simple Vista al Mar
    END LOOP;

    FOR i IN 321..328 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 3, 22, false, 'disponible'); -- 8 Riverside Dreams
    END LOOP;

    FOR i IN 329..336 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 3, 16, false, 'disponible'); -- 8 Pacific Dreams
    END LOOP;

    -- PISO 4 (24 Habitaciones: 401 al 424) - Penthouse y Suites Presidenciales
    FOR i IN 401..404 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 4, 860, false, 'disponible'); -- 4 Suite Presidencial
    END LOOP;

    FOR i IN 405..408 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 4, 526, false, 'disponible'); -- 4 Riverside Dreams Presidencial
    END LOOP;

    FOR i IN 409..412 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 4, 523, false, 'disponible'); -- 4 Suite Presidencial con Cámara Seca
    END LOOP;

    FOR i IN 413..416 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 4, 227, false, 'disponible'); -- 4 Dark Fantasies
    END LOOP;

    FOR i IN 417..420 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 4, 24, false, 'disponible'); -- 4 Cámara Seca y Jacuzzi
    END LOOP;

    FOR i IN 421..424 LOOP
        INSERT INTO public.habitaciones_fisicas (id, numero, piso, tipo_id, tiene_cochera_directa, estado)
        VALUES (i, i::text, 4, 14, false, 'disponible'); -- 4 Pacific Dreams Presidencial
    END LOOP;
END $$;

-- 6.3 Carta Gastronómica Oficial con Stock Real
INSERT INTO public.carta_gastronomia (id, nombre, categoria, precio, stock_actual, stock_minimo, descripcion) VALUES
(1, 'Fetuccini al Alfredo', 'plato', 27.00, 35, 10, 'Fetuccini servido con salsa bechamel, crema de leche, jamón y queso parmesano.'),
(2, 'Hamburguesa con Pollo Broaster', 'hamburguesa', 26.00, 40, 10, 'Pan hamburguesa con 150gr de pollo broaster, acompañado de tomate, lechuga, pickles y papas fritas.'),
(3, 'Hamburguesa SMASH', 'hamburguesa', 20.00, 50, 15, '120gr de carne a la plancha, cebolla caramelizada, tomate, lechuga, queso cheddar y papas fritas.'),
(4, 'Arroz Chaufa con Carne', 'plato', 28.00, 30, 8, '125gr de lomo fino al wok con huevo, arroz, salsa de la casa y cebolla china.'),
(5, 'Milanesa Napolitana con Spaghetti al Pesto', 'plato', 35.00, 25, 5, 'Filete de pollo con salsa napolitana casera y queso, montada sobre spaghetti al pesto.'),
(6, 'Desayuno Mixto', 'desayuno', 19.00, 60, 15, 'Pan grillado con mantequilla, queso Edam y jamón, acompañado de café americano y jugo.'),
(7, 'Triple Point Extremo de Pollo', 'piqueo', 42.00, 20, 5, 'Chicken Crispers, Buffalo wings y Chicken Quesadillas acompañados de palitos de apio.'),
(8, 'Signature Wimbledon Double Cheeseburger', 'hamburguesa', 25.00, 45, 10, 'Clásica hamburguesa 180gr doble queso acompañado de crocantes papas fritas.'),
(9, 'Cerveza Corona Extra 355ml', 'bebida', 16.00, 120, 24, 'Cerveza rubia en botella de vidrio fría.'),
(10, 'Vino Tinto Navarro Correas Colección', 'bebida', 75.00, 18, 4, 'Vino Malbec argentino ideal para velada romántica.'),
(11, 'Agua San Mateo con/sin gas 600ml', 'bebida', 7.00, 200, 30, 'Agua mineral de manantial.'),
(12, 'Pisco Sour Tradicional Catedral', 'bebida', 28.00, 50, 10, 'Pisco Quebranta premium con limón sutil y amargo de angostura.');

SELECT setval('carta_gastronomia_id_seq', (SELECT MAX(id) FROM public.carta_gastronomia));

-- 6.4 Personal del Hotel con DNI Único Verificado
INSERT INTO public.perfiles (id, tipo_documento, numero_documento, nombre, email, telefono, rol, activo) VALUES
('a0000000-0000-0000-0000-000000000001', 'DNI', '10234567', 'Juan Francisco Ganoza', 'superadmin@wimbledon.pe', '+51987654321', 'super_admin', true),
('a0000000-0000-0000-0000-000000000002', 'DNI', '45891234', 'Lic. Vania Cerrón', 'gerencia@wimbledon.pe', '+51987112233', 'administrador', true),
('a0000000-0000-0000-0000-000000000003', 'DNI', '71239845', 'Carlos Mendoza', 'recepcion@wimbledon.pe', '+51977334455', 'recepcionista', true),
('a0000000-0000-0000-0000-000000000004', 'DNI', '73451298', 'Fabiana La Madrid', 'recepcion2@wimbledon.pe', '+51977998877', 'recepcionista', true),
('a0000000-0000-0000-0000-000000000005', 'DNI', '40982314', 'Rosa Quispe (Housekeeping)', 'limpieza1@wimbledon.pe', '+51966554433', 'limpieza', true),
('a0000000-0000-0000-0000-000000000006', 'DNI', '42189034', 'Fernando Effio (Housekeeping)', 'limpieza2@wimbledon.pe', '+51966221100', 'limpieza', true);

-- 6.5 Generación de 30 Días de Operación Histórica para las 132 Habitaciones
-- Deshabilitar temporalmente el trigger de stock durante la carga de historial retroactivo
ALTER TABLE public.consumos_pedidos DISABLE TRIGGER trg_descontar_stock;

DO $$
DECLARE
    dia_offset INT;
    fecha_actual DATE;
    r_hab RECORD;
    est public.reservation_status;
    orig public.reservation_origin;
    p_method public.payment_method;
    token_val VARCHAR(64);
    huesped VARCHAR(100);
    correo VARCHAR(100);
    tlf VARCHAR(20);
    dni_val VARCHAR(20);
    qr_flag BOOLEAN;
    usado_ts TIMESTAMPTZ;
    canc_ts TIMESTAMPTZ;
    canc_motivo VARCHAR(255);
    nueva_reserva_id INT;
    random_item RECORD;
    idx INT := 0;
    nombres TEXT[] := ARRAY[
        'Alejandro Benavides', 'Claudia Morales', 'Renato Salardi', 'Valeria Barrientos',
        'Diego Alcantara', 'Mariana Chavez', 'Gabriel Tello', 'Lucia Fernandez',
        'Rodrigo Carrillo', 'Stephanie Paz', 'Joaquin Ramos', 'Fiorella Navarro',
        'Carlos Zegarra', 'Camila Ugarte', 'Mateo Arrieta', 'Daniela Villanueva',
        'Gonzalo Rivas', 'Andrea Calderon', 'Sebastian Prada', 'Lorena Cardenas'
    ];
BEGIN
    FOR dia_offset IN REVERSE 30..1 LOOP
        fecha_actual := CURRENT_DATE - (dia_offset || ' days')::interval;

        -- Cada día se ocupan entre 18 y 25 habitaciones físicas distintas
        FOR r_hab IN 
            SELECT hf.id AS hab_id, th.tarifa_base, th.duracion_bloque_horas 
            FROM public.habitaciones_fisicas hf
            JOIN public.tipos_habitacion th ON th.id = hf.tipo_id
            ORDER BY random() 
            LIMIT 22
        LOOP
            idx := idx + 1;
            huesped := nombres[1 + floor(random() * array_length(nombres, 1))::int];
            correo := lower(replace(split_part(huesped, ' ', 1), ' ', '')) || '.' || lower(split_part(huesped, ' ', 2)) || '@gmail.com';
            tlf := '+519' || floor(random() * 90000000 + 10000000)::text;
            dni_val := floor(random() * 80000000 + 10000000)::text;
            token_val := 'WIM-' || to_char(fecha_actual, 'YYYYMMDD') || '-H' || r_hab.hab_id || '-' || substr(md5(random()::text), 1, 6);

            IF random() < 0.08 THEN
                est := 'cancelada';
                qr_flag := false;
                usado_ts := NULL;
                canc_ts := fecha_actual + '11:00:00'::time;
                canc_motivo := 'Cambio de itinerario del cliente';
            ELSE
                est := 'finalizada';
                qr_flag := true;
                usado_ts := fecha_actual + '14:05:00'::time;
                canc_ts := NULL;
                canc_motivo := NULL;
            END IF;

            orig := CASE WHEN random() < 0.75 THEN 'online'::public.reservation_origin ELSE 'manual'::public.reservation_origin END;
            p_method := CASE 
                WHEN random() < 0.55 THEN 'yape'::public.payment_method
                WHEN random() < 0.85 THEN 'tarjeta'::public.payment_method
                ELSE 'plin'::public.payment_method 
            END;

            INSERT INTO public.reservas (
                habitacion_fisica_id, tipo_documento, numero_documento, nombre_huesped, telefono, email,
                fecha, hora_ingreso, hora_salida, duracion_horas,
                monto_total, adelanto, metodo_pago, estado, origen,
                qr_token, qr_usado, qr_usado_en, cancelado_en, motivo_cancelacion, creado_en
            ) VALUES (
                r_hab.hab_id, 'DNI', dni_val, huesped, tlf, correo,
                fecha_actual,
                CASE WHEN random() < 0.5 THEN '14:00:00'::time ELSE '21:00:00'::time END,
                CASE WHEN random() < 0.5 THEN '20:00:00'::time ELSE '03:00:00'::time END,
                r_hab.duracion_bloque_horas,
                r_hab.tarifa_base, r_hab.tarifa_base, p_method, est, orig,
                token_val, qr_flag, usado_ts, canc_ts, canc_motivo, (fecha_actual - interval '1 day')::timestamptz
            ) RETURNING id INTO nueva_reserva_id;

            IF est = 'finalizada' THEN
                INSERT INTO public.movimientos_diarios (reserva_id, habitacion_fisica_id, tipo, descripcion, monto, creado_en)
                VALUES (nueva_reserva_id, r_hab.hab_id, 'cobro', 'Cobro de estadía suite ' || r_hab.hab_id || ' - ' || p_method, r_hab.tarifa_base, fecha_actual + '14:00:00'::time);

                -- 35% de los huéspedes pidieron comida o bebidas de la carta
                IF random() < 0.35 THEN
                    SELECT id, nombre, precio INTO random_item 
                    FROM public.carta_gastronomia 
                    ORDER BY random() LIMIT 1;

                    INSERT INTO public.consumos_pedidos (reserva_id, item_id, cantidad, precio_unitario, creado_en)
                    VALUES (nueva_reserva_id, random_item.id, 2, random_item.precio, fecha_actual + '15:30:00'::time);

                    INSERT INTO public.movimientos_diarios (reserva_id, habitacion_fisica_id, tipo, descripcion, monto, creado_en)
                    VALUES (nueva_reserva_id, r_hab.hab_id, 'consumo', 'Consumo Room Service: 2x ' || random_item.nombre, random_item.precio * 2, fecha_actual + '15:30:00'::time);
                END IF;
            END IF;

        END LOOP;
    END LOOP;
END $$;

-- Reactivar trigger de control de stock para todas las órdenes en vivo
ALTER TABLE public.consumos_pedidos ENABLE TRIGGER trg_descontar_stock;

-- 6.6 Reservas Activas para el DÍA DE HOY (Demostración en Vivo en el Rack de 132)
-- 1 habitación física OCUPADA hoy (Habitación 301 - Tropical Dreams)
INSERT INTO public.reservas (
    habitacion_fisica_id, tipo_documento, numero_documento, nombre_huesped, telefono, email,
    fecha, hora_ingreso, hora_salida, duracion_horas,
    monto_total, adelanto, metodo_pago, estado, origen,
    qr_token, qr_usado, qr_usado_en, notas
) VALUES (
    301, 'DNI', '72893412', 'Carlos Prueba UTP', '+51999888777', 'carlos.prueba@utp.edu.pe',
    CURRENT_DATE, '15:00:00', '21:00:00', 6,
    125.00, 125.00, 'yape', 'checkin', 'online',
    'QR-WIM-DEMO-CHECKIN', true, NOW() - interval '2 hours',
    'Huésped en suite 301. Decoración romántica solicitada.'
);

UPDATE public.habitaciones_fisicas SET estado = 'ocupada' WHERE id = 301;

-- 1 habitación física CONFIRMADA hoy lista para Check-in QR en vivo (Habitación 401 - Suite Presidencial)
INSERT INTO public.reservas (
    habitacion_fisica_id, tipo_documento, numero_documento, nombre_huesped, telefono, email,
    fecha, hora_ingreso, hora_salida, duracion_horas,
    monto_total, adelanto, metodo_pago, estado, origen,
    qr_token, qr_usado, qr_usado_en, notas
) VALUES (
    401, 'DNI', '09812345', 'Jurado Evaluador UTP', '+51912345678', 'jurado.evaluador@utp.edu.pe',
    CURRENT_DATE, '20:00:00', '02:00:00', 6,
    156.00, 156.00, 'tarjeta', 'confirmada', 'online',
    'QR-WIM-DEMO-TESTING', false, NULL,
    'Reserva lista para escanear con la cámara/lector QR en el panel de recepción.'
);

-- 6.7 Incidencias de Mantenimiento Reales por Habitación Física
INSERT INTO public.incidencias (habitacion_fisica_id, reportado_por, descripcion, prioridad, estado, creado_en) VALUES
(401, 'a0000000-0000-0000-0000-000000000005', 'Revisión y desinfección preventiva del sistema de hidromasaje.', 'ALTA', 'RESUELTA', NOW() - interval '8 days'),
(409, 'a0000000-0000-0000-0000-000000000006', 'Calibración de termostato en cámara de vapor seca.', 'MEDIA', 'RESUELTA', NOW() - interval '3 days'),
(102, 'a0000000-0000-0000-0000-000000000005', 'Mantenimiento del portón levadizo de cochera privada.', 'BAJA', 'RESUELTA', NOW() - interval '1 day'),
(301, 'a0000000-0000-0000-0000-000000000005', 'Aseo profundo y recambio de toallas tras check-out.', 'MEDIA', 'ABIERTA', NOW() - interval '30 minutes');

-- 6.8 Turnos del Personal
INSERT INTO public.turnos (usuario_id, fecha, hora_inicio, hora_fin) VALUES
('a0000000-0000-0000-0000-000000000003', CURRENT_DATE, '08:00:00', '16:00:00'),
('a0000000-0000-0000-0000-000000000004', CURRENT_DATE, '16:00:00', '00:00:00'),
('a0000000-0000-0000-0000-000000000005', CURRENT_DATE, '07:00:00', '15:00:00'),
('a0000000-0000-0000-0000-000000000006', CURRENT_DATE, '15:00:00', '23:00:00');

-- Fin del script oficial de producción.
