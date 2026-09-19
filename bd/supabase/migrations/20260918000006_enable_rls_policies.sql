-- =====================================================================
-- Migración 006: Row Level Security (RLS) — Control de Acceso por Rol
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- ── Función auxiliar: obtener el rol del usuario actual ──────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;

-- ════════════════════════════════════════════════════════════════════
-- ACTIVAR RLS EN TODAS LAS TABLAS
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents       ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════
-- POLÍTICAS: profiles
-- ════════════════════════════════════════════════════════════════════

-- Cada usuario puede ver y editar solo su propio perfil
CREATE POLICY "Perfil propio — SELECT"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Perfil propio — UPDATE"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- El administrador puede ver todos los perfiles
CREATE POLICY "Administrador — ver todos los perfiles"
    ON public.profiles FOR SELECT
    USING (public.current_user_role() = 'administrador');

-- ════════════════════════════════════════════════════════════════════
-- POLÍTICAS: rooms (habitaciones)
-- ════════════════════════════════════════════════════════════════════

-- Todos los roles autenticados pueden ver las habitaciones
CREATE POLICY "Todos — ver habitaciones"
    ON public.rooms FOR SELECT
    USING (auth.role() = 'authenticated');

-- Solo recepción y administrador pueden actualizar habitaciones
CREATE POLICY "Recepción y Admin — actualizar habitaciones"
    ON public.rooms FOR UPDATE
    USING (public.current_user_role() IN ('recepcionista', 'administrador'));

-- Limpieza puede actualizar el estado de la habitación
CREATE POLICY "Limpieza — actualizar estado de habitación"
    ON public.rooms FOR UPDATE
    USING (public.current_user_role() = 'limpieza')
    WITH CHECK (estado IN ('disponible', 'limpieza_pendiente', 'en_proceso'));

-- Solo administrador puede crear o eliminar habitaciones
CREATE POLICY "Administrador — INSERT habitaciones"
    ON public.rooms FOR INSERT
    WITH CHECK (public.current_user_role() = 'administrador');

CREATE POLICY "Administrador — DELETE habitaciones"
    ON public.rooms FOR DELETE
    USING (public.current_user_role() = 'administrador');

-- ════════════════════════════════════════════════════════════════════
-- POLÍTICAS: reservations (reservas)
-- ════════════════════════════════════════════════════════════════════

-- Clientes: solo ven sus propias reservas
CREATE POLICY "Cliente — ver sus reservas"
    ON public.reservations FOR SELECT
    USING (client_id = auth.uid());

-- Clientes: pueden crear su propia reserva online
CREATE POLICY "Cliente — crear reserva"
    ON public.reservations FOR INSERT
    WITH CHECK (
        public.current_user_role() = 'cliente'
        AND client_id = auth.uid()
        AND origen = 'online'
    );

-- Recepción: ve todas las reservas
CREATE POLICY "Recepción — ver todas las reservas"
    ON public.reservations FOR SELECT
    USING (public.current_user_role() = 'recepcionista');

-- Recepción: puede crear y actualizar reservas (incluyendo manuales)
CREATE POLICY "Recepción — crear reserva"
    ON public.reservations FOR INSERT
    WITH CHECK (public.current_user_role() = 'recepcionista');

CREATE POLICY "Recepción — actualizar reserva"
    ON public.reservations FOR UPDATE
    USING (public.current_user_role() = 'recepcionista');

-- Administrador: control total sobre reservas
CREATE POLICY "Administrador — control total reservas"
    ON public.reservations FOR ALL
    USING (public.current_user_role() = 'administrador');

-- ════════════════════════════════════════════════════════════════════
-- POLÍTICAS: daily_movements (bitácora)
-- ════════════════════════════════════════════════════════════════════

-- Recepción y Administrador pueden insertar en la bitácora
CREATE POLICY "Recepción y Admin — insertar en bitácora"
    ON public.daily_movements FOR INSERT
    WITH CHECK (public.current_user_role() IN ('recepcionista', 'administrador'));

-- Solo administrador puede leer toda la bitácora
CREATE POLICY "Administrador — leer bitácora completa"
    ON public.daily_movements FOR SELECT
    USING (public.current_user_role() = 'administrador');

-- Recepción puede leer solo movimientos del día actual
CREATE POLICY "Recepción — leer bitácora del día"
    ON public.daily_movements FOR SELECT
    USING (
        public.current_user_role() = 'recepcionista'
        AND creado_en::DATE = CURRENT_DATE
    );

-- ════════════════════════════════════════════════════════════════════
-- POLÍTICAS: incidents (incidencias)
-- ════════════════════════════════════════════════════════════════════

-- Limpieza puede ver y crear incidencias
CREATE POLICY "Limpieza — ver incidencias"
    ON public.incidents FOR SELECT
    USING (public.current_user_role() = 'limpieza');

CREATE POLICY "Limpieza — crear incidencias"
    ON public.incidents FOR INSERT
    WITH CHECK (
        public.current_user_role() = 'limpieza'
        AND reported_by = auth.uid()
    );

-- Administrador y Recepción pueden ver todas las incidencias
CREATE POLICY "Admin y Recepción — ver todas las incidencias"
    ON public.incidents FOR SELECT
    USING (public.current_user_role() IN ('administrador', 'recepcionista'));

-- Solo administrador puede actualizar o cerrar incidencias
CREATE POLICY "Administrador — gestionar incidencias"
    ON public.incidents FOR UPDATE
    USING (public.current_user_role() = 'administrador');
