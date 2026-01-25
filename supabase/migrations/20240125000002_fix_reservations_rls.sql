-- Reparar RLS de Reservations y Club Members

-- 1. Asegurar lectura pública/autenticada de club_members
-- (Necesario para que las policies de reservations funcionen)
DROP POLICY IF EXISTS "Members viewable by club members" ON public.club_members;
CREATE POLICY "Members viewable by all authenticated" ON public.club_members
  FOR SELECT TO authenticated USING (true);

-- 2. Refrescar policies de reservations
DROP POLICY IF EXISTS "Club staff can view all reservations" ON reservations;
DROP POLICY IF EXISTS "Club staff can manage all reservations" ON reservations;
DROP POLICY IF EXISTS "Players can view active reservations" ON reservations;
DROP POLICY IF EXISTS "Players can create their own reservations" ON reservations;
DROP POLICY IF EXISTS "Players can update their own reservations" ON reservations;

-- CLUB STAFF: Ver y Gestionar (Unificamos para evitar confusiones)
CREATE POLICY "Club staff can manage own club reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = reservations.club_id
    AND club_members.user_id = auth.uid()
  )
);

-- PLAYERS: Ver disponibilidad (Solo confirmadas)
CREATE POLICY "Players can view active reservations"
ON reservations
FOR SELECT
TO authenticated
USING (
  status = 'confirmed'
);

-- PLAYERS: Crear reserva (Solo booking, confirmada, y propia)
CREATE POLICY "Players can create their own reservations"
ON reservations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  status = 'confirmed' AND
  type = 'booking'
);

-- PLAYERS: Modificar propia (Cancelar)
CREATE POLICY "Players can update their own reservations"
ON reservations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
