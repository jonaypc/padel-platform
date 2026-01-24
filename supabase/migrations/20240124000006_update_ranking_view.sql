-- Actualizar vista para incluir username e is_public
CREATE OR REPLACE VIEW public.player_rankings AS
WITH match_results AS (
  SELECT 
    mp.user_id,
    CASE WHEN mp.role IN ('player', 'partner') THEN 'A' ELSE 'B' END as team,
    (CASE WHEN m.set1_us > m.set1_them THEN 1 ELSE 0 END +
     CASE WHEN m.set2_us > m.set2_them THEN 1 ELSE 0 END +
     CASE WHEN m.set3_us > m.set3_them THEN 1 ELSE 0 END) as sets_a,
    (CASE WHEN m.set1_them > m.set1_us THEN 1 ELSE 0 END +
     CASE WHEN m.set2_them > m.set2_us THEN 1 ELSE 0 END +
     CASE WHEN m.set3_them > m.set3_us THEN 1 ELSE 0 END) as sets_b
  FROM match_participants mp
  JOIN matches m ON mp.match_id = m.id
  WHERE m.status IN ('confirmed', 'pending_confirmation')
    AND (m.set1_us IS NOT NULL AND m.set1_them IS NOT NULL)
),
user_stats AS (
  SELECT 
    user_id,
    COUNT(*) as matches_played,
    SUM(CASE WHEN (team = 'A' AND sets_a > sets_b) OR (team = 'B' AND sets_b > sets_a) THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN (team = 'A' AND sets_a < sets_b) OR (team = 'B' AND sets_b < sets_a) THEN 1 ELSE 0 END) as losses
  FROM match_results
  GROUP BY user_id
)
SELECT 
  p.id as user_id,
  p.display_name,
  p.username,
  p.is_public,
  p.avatar_url,
  COALESCE(s.matches_played, 0) as matches_played,
  COALESCE(s.wins, 0) as wins,
  COALESCE(s.losses, 0) as losses,
  GREATEST(0, 100 + (COALESCE(s.wins, 0) * 10) - (COALESCE(s.losses, 0) * 5)) as points,
  CASE WHEN COALESCE(s.matches_played, 0) > 0 THEN ROUND((COALESCE(s.wins, 0)::numeric / s.matches_played::numeric) * 100, 1) ELSE 0 END as win_rate
FROM profiles p
LEFT JOIN user_stats s ON p.id = s.user_id;

GRANT SELECT ON public.player_rankings TO authenticated, anon;
