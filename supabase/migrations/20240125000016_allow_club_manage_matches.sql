-- =============================================
-- Permisos RLS para que los Clubs gestionen sus partidos
-- =============================================

-- 1. DROP old policies if they conflict (though mostly we are adding new ones or extending)
-- Revisar si existen políticas que ya cubran esto (No las hay)

-- 2. SELECT: Club Staff puede ver partidos de su club
CREATE POLICY "Clubs can view matches at their location"
ON public.matches FOR SELECT
TO authenticated
USING (
  club_id IN (
    SELECT club_id 
    FROM public.club_members 
    WHERE user_id = auth.uid()
  )
);

-- 3. UPDATE: Club Admin/Staff puede actualizar partidos (ej. poner resultado)
-- Limitamos esto a poner resultados y status, pero PG RLS es a nivel de fila.
CREATE POLICY "Clubs can update matches at their location"
ON public.matches FOR UPDATE
TO authenticated
USING (
  club_id IN (
    SELECT club_id 
    FROM public.club_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  club_id IN (
    SELECT club_id 
    FROM public.club_members 
    WHERE user_id = auth.uid()
  )
);

-- NOTA: Insert y Delete se reservan generalmente al usuario creador (jugador),
-- o se podrían habilitar si el Club quiere crear partidos manualmente.
-- Por ahora, el requisito es "Validar Resultados", que es UPDATE.
