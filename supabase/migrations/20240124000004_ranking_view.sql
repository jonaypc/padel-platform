-- Vista para calcular rankings dinámicamente
CREATE OR REPLACE VIEW public.player_rankings AS
WITH match_results AS (
  SELECT 
    mp.user_id,
    m.id as match_id,
    m.played_at,
    CASE
      -- Determinar si el usuario es Equipo A (player/partner) o Equipo B (opponent)
      WHEN mp.role IN ('player', 'partner') THEN 'A'
      ELSE 'B'
    END as team,
    -- Calcular sets ganados por equipo A
    (CASE WHEN m.set1_us > m.set1_them THEN 1 ELSE 0 END +
     CASE WHEN m.set2_us > m.set2_them THEN 1 ELSE 0 END +
     CASE WHEN m.set3_us > m.set3_them THEN 1 ELSE 0 END) as sets_a,
     -- Calcular sets ganados por equipo B
    (CASE WHEN m.set1_them > m.set1_us THEN 1 ELSE 0 END +
     CASE WHEN m.set2_them > m.set2_us THEN 1 ELSE 0 END +
     CASE WHEN m.set3_them > m.set3_us THEN 1 ELSE 0 END) as sets_b
  FROM match_participants mp
  JOIN matches m ON mp.match_id = m.id
  WHERE 
    m.status IN ('confirmed', 'pending_confirmation') -- Solo partidos confirmados o pendientes de verificar
    AND (
      (m.set1_us IS NOT NULL AND m.set1_them IS NOT NULL) -- Al menos un set jugado
    )
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
  -- Fórmula básica: 100 base + 10 por victoria - 5 por derrota (min 0)
  GREATEST(0, 100 + (COALESCE(s.wins, 0) * 10) - (COALESCE(s.losses, 0) * 5)) as points,
  CASE 
    WHEN COALESCE(s.matches_played, 0) > 0 
    THEN ROUND((COALESCE(s.wins, 0)::numeric / s.matches_played::numeric) * 100, 1)
    ELSE 0
  END as win_rate
FROM profiles p
LEFT JOIN user_stats s ON p.id = s.user_id;

-- Permisos
GRANT SELECT ON public.player_rankings TO authenticated;
GRANT SELECT ON public.player_rankings TO anon;
