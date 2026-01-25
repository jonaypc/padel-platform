-- Helper robusto para chequear permisos
-- SECURITY DEFINER permite leer club_members saltando sus propias policies
CREATE OR REPLACE FUNCTION public.is_club_member(_club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar Reservations Policy para usar el helper
DROP POLICY IF EXISTS "Club staff can manage own club reservations" ON public.reservations;

-- Recrear con el helper
CREATE POLICY "Club staff can manage own club reservations"
ON public.reservations
FOR ALL
TO authenticated
USING (
  is_club_member(club_id)
);

-- Asegurar permisos en el helper
GRANT EXECUTE ON FUNCTION public.is_club_member TO authenticated;
