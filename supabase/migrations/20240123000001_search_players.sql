-- Función segura para buscar jugadores por email
-- Solo accesible por usuarios autenticados (club staff)
-- Devuelve info mínima necesaria para vincular reservas

CREATE OR REPLACE FUNCTION get_player_by_email(email_input text)
RETURNS TABLE (
  id uuid,
  display_name text,
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
    p.avatar_url
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.email = email_input;
END;
$$ LANGUAGE plpgsql;

-- Permisos
GRANT EXECUTE ON FUNCTION get_player_by_email(text) TO authenticated;

-- Fix: Asegurar permiso de INSERT para staff del club
-- La policy "FOR ALL" a veces puede ser restrictiva si no se evalúa correctamente el USING en inserts.
-- Añadimos una policy explícita con WITH CHECK.
CREATE POLICY "Club staff can insert reservations fix"
ON public.reservations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = reservations.club_id
    AND club_members.user_id = auth.uid()
  )
);

