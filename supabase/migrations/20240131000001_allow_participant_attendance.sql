-- Permitir que los participantes confirmen su asistencia
-- Un usuario puede actualizar la reserva si su ID está en la lista de jugadores (JSONB)

CREATE POLICY "Participants can update their own attendance"
ON reservations
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  players @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
)
WITH CHECK (
  user_id = auth.uid() OR
  players @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
);

-- Nota: Esta política se suma a la existente de "Players can update their own reservations"
-- Pero es más segura si unificamos o simplemente añadimos la condición de participante.
