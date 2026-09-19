-- =====================================================================
-- Migración 001: Perfiles y Roles
-- Hotel Wimbledon — Supabase / PostgreSQL
-- Curso Integrador — UTP
-- =====================================================================

-- Tipo ENUM para los roles del sistema
CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'administrador',
    'recepcionista',
    'limpieza',
    'cliente'
);

-- Tabla de perfiles vinculada a auth.users de Supabase
CREATE TABLE public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    rol         public.user_role NOT NULL DEFAULT 'cliente',
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas frecuentes por rol
CREATE INDEX idx_profiles_rol ON public.profiles(rol);

-- ── Trigger: actualizar updated_at automáticamente ──────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: crear perfil automáticamente al registrar un usuario ───
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

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
