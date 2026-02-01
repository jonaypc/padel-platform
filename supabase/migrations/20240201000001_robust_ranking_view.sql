-- Vista robusta para Ranking y Estadísticas
DROP VIEW IF EXISTS public.player_rankings;

CREATE OR REPLACE VIEW public.player_rankings AS
WITH match_results AS (
  SELECT 
    mp.user_id,
    CASE WHEN mp.role IN ('player', 'partner') THEN 'A' ELSE 'B' END as team,
    (COALESCE(m.set1_us, 0) > COALESCE(m.set1_them, 0)::int)::int +
    (COALESCE(m.set2_us, 0) > COALESCE(m.set2_them, 0)::int)::int +
    (COALESCE(m.set3_us, 0) > COALESCE(m.set3_them, 0)::int)::int as sets_won_a,
    (COALESCE(m.set1_them, 0) > COALESCE(m.set1_us, 0)::int)::int +
    (COALESCE(m.set2_them, 0) > COALESCE(m.set2_us, 0)::int)::int +
    (COALESCE(m.set3_them, 0) > COALESCE(m.set3_us, 0)::int)::int as sets_won_b
  FROM match_participants mp
  JOIN matches m ON mp.match_id = m.id
  WHERE m.status = 'confirmed'
),
user_stats AS (
  SELECT 
    user_id,
    COUNT(*) as matches_played,
    SUM(CASE WHEN (team = 'A' AND sets_won_a > sets_won_b) OR (team = 'B' AND sets_won_b > sets_won_a) THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN (team = 'A' AND sets_won_a < sets_won_b) OR (team = 'B' AND sets_won_b < sets_won_a) THEN 1 ELSE 0 END) as losses
  FROM match_results
  GROUP BY user_id
)
SELECT 
  p.id as user_id,
  p.display_name,
  p.username,
  p.is_public,
  p.avatar_url,
  p.elo_rating as points,
  COALESCE(s.matches_played, 0) as matches_played,
  COALESCE(s.wins, 0) as wins,
  COALESCE(s.losses, 0) as losses,
  CASE WHEN COALESCE(s.matches_played, 0) > 0 
    THEN ROUND((COALESCE(s.wins, 0)::numeric / s.matches_played::numeric) * 100, 1) 
    ELSE 0 END as win_rate
FROM profiles p
LEFT JOIN user_stats s ON p.id = s.user_id;

GRANT SELECT ON public.player_rankings TO authenticated, anon;
