-- 1. Asegurar que la tabla match_participants tenga la columna role
ALTER TABLE match_participants 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'player' -- provisional default
CHECK (role IN ('player', 'partner', 'opponent1', 'opponent2'));

-- 2. Corregir roles para datos existentes (lógica simple de inferencia)
-- El creador del partido (matches.user_id) debe ser 'player'
UPDATE match_participants mp
SET role = 'player'
FROM matches m
WHERE mp.match_id = m.id AND mp.user_id = m.user_id;

-- Los demás por defecto serán 'opponent1' si no tienen rol definido (asumiendo 1vs1 básico por ahora)
-- Esto es para asegurar que la vista funcione aunque los datos sean imperfectos
UPDATE match_participants mp
SET role = 'opponent1'
WHERE role IS NULL OR role = 'player' -- si quedó como default pero no era el owner
AND user_id NOT IN (SELECT user_id FROM matches WHERE id = mp.match_id);


-- 3. Crear la vista de rankings
CREATE OR REPLACE VIEW public.player_rankings AS
WITH match_results AS (
  SELECT 
    mp.user_id,
    m.id as match_id,
    m.played_at,
    CASE
      -- Team A: Creador (player) y su compañero (partner)
      WHEN mp.role IN ('player', 'partner') THEN 'A'
      ELSE 'B' -- Team B: opponent1, opponent2
    END as team,
    -- Sets ganados por A
    (CASE WHEN m.set1_us > m.set1_them THEN 1 ELSE 0 END +
     CASE WHEN m.set2_us > m.set2_them THEN 1 ELSE 0 END +
     CASE WHEN m.set3_us > m.set3_them THEN 1 ELSE 0 END) as sets_a,
     -- Sets ganados por B
    (CASE WHEN m.set1_them > m.set1_us THEN 1 ELSE 0 END +
     CASE WHEN m.set2_them > m.set2_us THEN 1 ELSE 0 END +
     CASE WHEN m.set3_them > m.set3_us THEN 1 ELSE 0 END) as sets_b
  FROM match_participants mp
  JOIN matches m ON mp.match_id = m.id
  WHERE 
    m.status IN ('confirmed', 'pending_confirmation')
    AND (m.set1_us IS NOT NULL AND m.set1_them IS NOT NULL)
),
user_stats AS (
  SELECT 
    user_id,
    COUNT(*) as matches_played,
    SUM(CASE 
      WHEN team = 'A' AND sets_a > sets_b THEN 1
      WHEN team = 'B' AND sets_b > sets_a THEN 1
      ELSE 0
    END) as wins,
    SUM(CASE 
      WHEN team = 'A' AND sets_a < sets_b THEN 1
      WHEN team = 'B' AND sets_b < sets_a THEN 1
      ELSE 0
    END) as losses
  FROM match_results
  GROUP BY user_id
)
SELECT 
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(s.matches_played, 0) as matches_played,
  COALESCE(s.wins, 0) as wins,
  COALESCE(s.losses, 0) as losses,
  GREATEST(0, 100 + (COALESCE(s.wins, 0) * 10) - (COALESCE(s.losses, 0) * 5)) as points,
  CASE 
    WHEN COALESCE(s.matches_played, 0) > 0 
    THEN ROUND((COALESCE(s.wins, 0)::numeric / s.matches_played::numeric) * 100, 1)
    ELSE 0
  END as win_rate
FROM profiles p
LEFT JOIN user_stats s ON p.id = s.user_id;

-- 4. Permisos
GRANT SELECT ON public.player_rankings TO authenticated;
GRANT SELECT ON public.player_rankings TO anon;
