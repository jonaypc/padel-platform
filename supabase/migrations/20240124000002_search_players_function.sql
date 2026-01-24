-- Función para buscar jugadores por nombre o email (para invitaciones)
CREATE OR REPLACE FUNCTION search_players(search_term text, result_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.username,
    p.avatar_url
  FROM public.profiles p
  WHERE 
    p.display_name ILIKE '%' || search_term || '%'
    OR p.username ILIKE '%' || search_term || '%'
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Permisos
GRANT EXECUTE ON FUNCTION search_players(text, integer) TO authenticated;
