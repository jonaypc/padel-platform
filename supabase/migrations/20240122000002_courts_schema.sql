-- 1. Tabla de Pistas (Courts)
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('indoor', 'outdoor')),
  surface TEXT NOT NULL CHECK (surface IN ('crystal', 'wall', 'synthetic')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS

-- Lectura: Cualquier usuario autenticado puede ver las pistas (necesario para reservar desde player app)
CREATE POLICY "Courts are viewable by everyone" ON public.courts
  FOR SELECT USING (true);

-- Gestión (Insert/Update/Delete): Solo administradores o staff del club
CREATE POLICY "Club staff can manage own courts" ON public.courts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = courts.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- 4. Trigger para updated_at (opcional pero recomendado)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_court_updated
  BEFORE UPDATE ON public.courts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
