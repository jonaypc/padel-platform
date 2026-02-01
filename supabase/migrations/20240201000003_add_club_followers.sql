-- Tabla para gestionar la comunidad de seguidores de cada club
CREATE TABLE IF NOT EXISTS public.club_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

-- RLS para seguidores
ALTER TABLE public.club_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver seguidores de un club"
ON public.club_followers FOR SELECT
USING (true);

CREATE POLICY "Usuarios pueden unirse o dejar un club"
ON public.club_followers FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Función para buscar jugadores dentro de la comunidad de un club
-- Devuelve tanto seguidores como miembros del staff (que también son jugadores)
CREATE OR REPLACE FUNCTION get_club_community(p_club_id uuid, p_search text)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  username text
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH community_ids AS (
    -- Obtener IDs de usuarios vinculados al club (seguidores + miembros staff)
    SELECT f.user_id FROM public.club_followers f WHERE f.club_id = p_club_id
    UNION
    SELECT m.user_id FROM public.club_members m WHERE m.club_id = p_club_id
  )
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.username
  FROM community_ids c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE 
    (p.display_name ILIKE '%' || p_search || '%' OR 
     p.username ILIKE '%' || p_search || '%')
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_club_community(uuid, text) TO authenticated;
