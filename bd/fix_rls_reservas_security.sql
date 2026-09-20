-- =====================================================================
-- HOTEL WIMBLEDON — SCRIPT DE CORRECCIÓN RLS ESTRICTA DE SUPABASE (POSTGRESQL)
-- Solución Definitiva de Seguridad:
--  1. Creación de tabla public.staff para blindaje contra registro público (signUp).
--  2. Revocación total de permisos a rol anónimo (anon) sobre reservas,
--     rack de 132 habitaciones, movimientos de caja y vistas financieras.
--  3. Permisos granulares columna por columna para authenticated (solo staff activo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLA DE STAFF AUTORIZADO
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'RECEPCIONISTA', 'LIMPIEZA')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff FROM anon;
REVOKE ALL ON public.staff FROM authenticated;

DROP POLICY IF EXISTS "Staff consulta su propio registro" ON public.staff;
CREATE POLICY "Staff consulta su propio registro" ON public.staff
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

GRANT SELECT ON public.staff TO authenticated;

-- ---------------------------------------------------------------------
-- 2. TABLA RESERVAS
-- ---------------------------------------------------------------------
-- Revocar todos los privilegios por defecto
REVOKE ALL ON public.reservas FROM anon;
REVOKE ALL ON public.reservas FROM authenticated;

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion reservas" ON public.reservas;
DROP POLICY IF EXISTS "Gestion reservas staff autenticado" ON public.reservas;
DROP POLICY IF EXISTS "Lectura publica reserva por qr_token" ON public.reservas;
DROP POLICY IF EXISTS "Staff autenticado lee reservas" ON public.reservas;
DROP POLICY IF EXISTS "Staff autenticado marca checkin" ON public.reservas;
DROP POLICY IF EXISTS "Solo staff activo lee reservas" ON public.reservas;
DROP POLICY IF EXISTS "Solo staff activo actualiza checkin" ON public.reservas;

-- Lectura: Solo staff activo en public.staff
CREATE POLICY "Solo staff activo lee reservas"
  ON public.reservas FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.staff WHERE activo = true));

-- Actualización: Solo columnas de check-in por staff activo
CREATE POLICY "Solo staff activo actualiza checkin"
  ON public.reservas FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.staff WHERE activo = true)
    AND estado IN ('pendiente', 'confirmada', 'checkin')
  )
  WITH CHECK (estado IN ('checkin', 'cancelada'));

GRANT SELECT ON public.reservas TO authenticated;
GRANT UPDATE (estado, adelanto, metodo_pago, qr_usado, qr_usado_en) ON public.reservas TO authenticated;

-- ---------------------------------------------------------------------
-- 3. TABLA HABITACIONES_FISICAS (132 PUERTAS)
-- ---------------------------------------------------------------------
REVOKE ALL ON public.habitaciones_fisicas FROM anon;
REVOKE ALL ON public.habitaciones_fisicas FROM authenticated;

ALTER TABLE public.habitaciones_fisicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso publico habitaciones_fisicas" ON public.habitaciones_fisicas;
DROP POLICY IF EXISTS "Lectura publica habitaciones_fisicas" ON public.habitaciones_fisicas;
DROP POLICY IF EXISTS "Gestion staff habitaciones_fisicas" ON public.habitaciones_fisicas;
DROP POLICY IF EXISTS "Staff autenticado lee habitaciones_fisicas" ON public.habitaciones_fisicas;
DROP POLICY IF EXISTS "Staff autenticado actualiza estado habitacion" ON public.habitaciones_fisicas;
DROP POLICY IF EXISTS "Solo staff activo lee habitaciones_fisicas" ON public.habitaciones_fisicas;
DROP POLICY IF EXISTS "Solo staff activo actualiza estado habitacion" ON public.habitaciones_fisicas;

CREATE POLICY "Solo staff activo lee habitaciones_fisicas"
  ON public.habitaciones_fisicas FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.staff WHERE activo = true));

CREATE POLICY "Solo staff activo actualiza estado habitacion"
  ON public.habitaciones_fisicas FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.staff WHERE activo = true))
  WITH CHECK (true);

GRANT SELECT ON public.habitaciones_fisicas TO authenticated;
GRANT UPDATE (estado, updated_at) ON public.habitaciones_fisicas TO authenticated;

-- ---------------------------------------------------------------------
-- 4. TABLA MOVIMIENTOS_DIARIOS (AUDITORÍA DE CAJA)
-- ---------------------------------------------------------------------
REVOKE ALL ON public.movimientos_diarios FROM anon;
REVOKE ALL ON public.movimientos_diarios FROM authenticated;

ALTER TABLE public.movimientos_diarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion movimientos" ON public.movimientos_diarios;
DROP POLICY IF EXISTS "Gestion staff movimientos" ON public.movimientos_diarios;
DROP POLICY IF EXISTS "Staff autenticado lee movimientos" ON public.movimientos_diarios;
DROP POLICY IF EXISTS "Staff autenticado inserta movimientos" ON public.movimientos_diarios;
DROP POLICY IF EXISTS "Solo staff activo lee movimientos" ON public.movimientos_diarios;
DROP POLICY IF EXISTS "Solo staff activo inserta movimientos" ON public.movimientos_diarios;

CREATE POLICY "Solo staff activo lee movimientos"
  ON public.movimientos_diarios FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.staff WHERE activo = true));

CREATE POLICY "Solo staff activo inserta movimientos"
  ON public.movimientos_diarios FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.staff WHERE activo = true)
    AND tipo IN ('cobro', 'checkin', 'adelanto', 'servicio_habitacion')
  );

GRANT SELECT, INSERT ON public.movimientos_diarios TO authenticated;

-- ---------------------------------------------------------------------
-- 5. VISTAS SENSIBLES: RACK 132 Y KPIS FINANCIEROS
-- ---------------------------------------------------------------------
REVOKE ALL ON public.v_rack_habitaciones_132 FROM anon;
REVOKE ALL ON public.v_kpis_financieros FROM anon;

GRANT SELECT ON public.v_rack_habitaciones_132 TO authenticated;
GRANT SELECT ON public.v_kpis_financieros TO authenticated;

-- ---------------------------------------------------------------------
-- 6. TABLAS PÚBLICAS DE CONSULTA GENERAL
-- ---------------------------------------------------------------------
ALTER TABLE public.tipos_habitacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carta_gastronomia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica tipos_habitacion" ON public.tipos_habitacion;
DROP POLICY IF EXISTS "Lectura publica carta_gastronomia" ON public.carta_gastronomia;

CREATE POLICY "Lectura publica tipos_habitacion"
  ON public.tipos_habitacion FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Lectura publica carta_gastronomia"
  ON public.carta_gastronomia FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.tipos_habitacion TO anon, authenticated;
GRANT SELECT ON public.carta_gastronomia TO anon, authenticated;
