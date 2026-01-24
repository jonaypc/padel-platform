-- Añadir policy para que admins del club puedan actualizar su club
CREATE POLICY "Club admins can update their club"
ON public.clubs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = clubs.id
    AND club_members.user_id = auth.uid()
    AND club_members.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = clubs.id
    AND club_members.user_id = auth.uid()
    AND club_members.role = 'admin'
  )
);
