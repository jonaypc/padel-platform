-- 1. Eliminar vista antigua (ahora usaremos tabla real)
DROP VIEW IF EXISTS public.player_rankings;

-- 2. Añadir columnas ELO
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS elo_rating integer DEFAULT 1200;

ALTER TABLE public.match_participants 
ADD COLUMN IF NOT EXISTS elo_change integer;

-- 3. Función para calcular ganador (Auxiliar)
CREATE OR REPLACE FUNCTION get_match_winner(match_id uuid)
RETURNS text AS $$
DECLARE
  m record;
  sets_a integer := 0;
  sets_b integer := 0;
BEGIN
  SELECT * INTO m FROM matches WHERE id = match_id;
  
  -- Contar sets
  IF (m.set1_us > m.set1_them) THEN sets_a := sets_a + 1; END IF;
  IF (m.set1_them > m.set1_us) THEN sets_b := sets_b + 1; END IF;
  
  IF (m.set2_us > m.set2_them) THEN sets_a := sets_a + 1; END IF;
  IF (m.set2_them > m.set2_us) THEN sets_b := sets_b + 1; END IF;
  
  IF (m.set3_us > m.set3_them) THEN sets_a := sets_a + 1; END IF;
  IF (m.set3_them > m.set3_us) THEN sets_b := sets_b + 1; END IF;

  IF sets_a > sets_b THEN RETURN 'A';
  ELSIF sets_b > sets_a THEN RETURN 'B';
  ELSE RETURN 'DRAW';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Función Principal de Cálculo ELO
CREATE OR REPLACE FUNCTION calculate_elo_updates()
RETURNS TRIGGER AS $$
DECLARE
  -- Variables para jugadores
  p_a1 uuid; p_a2 uuid; -- Team A
  p_b1 uuid; p_b2 uuid; -- Team B
  
  elo_a1 int; elo_a2 int;
  elo_b1 int; elo_b2 int;
  
  avg_a float;
  avg_b float;
  
  expected_a float;
  expected_b float;
  
  k_factor int := 32;
  
  winner text;
  actual_score_a float;
  
  rating_change int;
BEGIN
  -- Solo ejecutar si el status cambia a confirmed
  IF NEW.status <> 'confirmed' OR OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Obtener IDs de jugadores y sus ELOs actuales
  -- Asumimos roles: 'player' y 'partner' son Team A. 'opponent1' y 'opponent2' son Team B.
  
  -- Team A Player 1 (Creator)
  SELECT user_id, p.elo_rating INTO p_a1, elo_a1
  FROM match_participants mp
  JOIN profiles p ON p.id = mp.user_id
  WHERE mp.match_id = NEW.id AND mp.role = 'player';
  
  -- Team A Player 2 (Partner)
  SELECT user_id, p.elo_rating INTO p_a2, elo_a2
  FROM match_participants mp
  JOIN profiles p ON p.id = mp.user_id
  WHERE mp.match_id = NEW.id AND mp.role = 'partner';
  
  -- Team B Player 1
  SELECT user_id, p.elo_rating INTO p_b1, elo_b1
  FROM match_participants mp
  JOIN profiles p ON p.id = mp.user_id
  WHERE mp.match_id = NEW.id AND mp.role = 'opponent1';
  
  -- Team B Player 2
  SELECT user_id, p.elo_rating INTO p_b2, elo_b2
  FROM match_participants mp
  JOIN profiles p ON p.id = mp.user_id
  WHERE mp.match_id = NEW.id AND mp.role = 'opponent2';

  -- Validar que existan jugadores (al menos 1 vs 1, pero idealmente 2 vs 2 para este sistema)
  -- Si faltan partners, usamos el ELO del jugador único como media
  IF p_a2 IS NULL THEN elo_a2 := elo_a1; END IF;
  IF p_b2 IS NULL THEN elo_b2 := elo_b1; END IF;
  
  -- 1. Calcular Medias
  avg_a := (elo_a1 + elo_a2) / 2.0;
  avg_b := (elo_b1 + elo_b2) / 2.0;
  
  -- 2. Calcular Expectativa (Fórmula ELO standard)
  -- Ea = 1 / (1 + 10 ^ ((Rb - Ra) / 400))
  expected_a := 1.0 / (1.0 + power(10.0, (avg_b - avg_a) / 400.0));
  
  -- 3. Determinar Ganador Real
  winner := get_match_winner(NEW.id);
  
  IF winner = 'A' THEN actual_score_a := 1.0;
  ELSIF winner = 'B' THEN actual_score_a := 0.0;
  ELSE RETURN NEW; -- Empate no afecta (o se podría manejar como 0.5)
  END IF;
  
  -- 4. Calcular Cambio
  -- Delta = K * (Actual - Expected)
  rating_change := round(k_factor * (actual_score_a - expected_a));
  
  -- 5. Actualizar Profiles y Guardar Histórico
  
  -- Team A (Ganan o Pierden lo mismo)
  UPDATE profiles SET elo_rating = elo_rating + rating_change WHERE id IN (select user_id from match_participants where match_id = NEW.id and role IN ('player', 'partner'));
  UPDATE match_participants SET elo_change = rating_change WHERE match_id = NEW.id AND role IN ('player', 'partner');
  
  -- Team B (Inverso)
  UPDATE profiles SET elo_rating = elo_rating - rating_change WHERE id IN (select user_id from match_participants where match_id = NEW.id and role IN ('opponent1', 'opponent2'));
  UPDATE match_participants SET elo_change = -rating_change WHERE match_id = NEW.id AND role IN ('opponent1', 'opponent2');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger
DROP TRIGGER IF EXISTS on_match_confirmed_elo ON matches;
CREATE TRIGGER on_match_confirmed_elo
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION calculate_elo_updates();
