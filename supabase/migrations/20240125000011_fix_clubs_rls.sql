-- Fix RLS policies for clubs table to allow authenticated users to read

-- Habilitar RLS si no está habilitado
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de SELECT si existen
DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
DROP POLICY IF EXISTS "Clubs are viewable by authenticated users" ON public.clubs;
DROP POLICY IF EXISTS "Anyone can view clubs" ON public.clubs;

-- Crear política que permite a usuarios autenticados leer todos los clubs
CREATE POLICY "Authenticated users can view all clubs"
ON public.clubs
FOR SELECT
TO authenticated
USING (true);

-- También permitir lectura pública (anónima) de clubs (para la app de player)
CREATE POLICY "Public can view clubs"
ON public.clubs
FOR SELECT
TO anon
USING (true);

-- Asegurar que admins pueden insertar/actualizar clubs
DROP POLICY IF EXISTS "Admins can insert clubs" ON public.clubs;
DROP POLICY IF EXISTS "Admins can update clubs" ON public.clubs;

CREATE POLICY "Admins can insert clubs"
ON public.clubs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update clubs"
ON public.clubs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
