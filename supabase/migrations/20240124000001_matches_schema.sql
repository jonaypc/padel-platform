-- =============================================
-- FASE 5: Sistema de Partidos (Matches)
-- =============================================

-- 1. Enum para estado de confirmación del resultado
CREATE TYPE match_status AS ENUM ('draft', 'pending_confirmation', 'confirmed', 'disputed');

-- 2. Tabla principal de partidos
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Creador del partido
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL, -- Vinculación opcional a reserva
  club_id uuid REFERENCES clubs(id) ON DELETE SET NULL, -- Vinculación opcional a club
  
  played_at timestamptz NOT NULL DEFAULT now(),
  match_type text DEFAULT 'doubles' CHECK (match_type IN ('singles', 'doubles')),
  location text, -- Ubicación libre si no hay club
  
  -- Jugadores (texto flexible: nombres o usernames)
  partner_name text,
  opponent1_name text,
  opponent2_name text,
  
  -- Resultados por set
  set1_us integer,
  set1_them integer,
  set2_us integer,
  set2_them integer,
  set3_us integer,
  set3_them integer,
  
  -- Metadatos
  overall_feeling integer CHECK (overall_feeling IS NULL OR (overall_feeling BETWEEN 1 AND 5)),
  notes text,
  status match_status DEFAULT 'draft',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Tabla de participantes (para vincular múltiples usuarios a un partido)
CREATE TABLE match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'player' CHECK (role IN ('player', 'partner', 'opponent1', 'opponent2')),
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- 4. Índices para rendimiento
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_played_at ON matches(played_at DESC);
CREATE INDEX idx_matches_club_id ON matches(club_id);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);

-- 5. Habilitar RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS PARA MATCHES
-- =============================================

-- SELECT: Ver partidos propios o donde participo
CREATE POLICY "Users can view their own matches"
ON matches FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR id IN (SELECT match_id FROM match_participants WHERE user_id = auth.uid())
);

-- INSERT: Crear partidos propios
CREATE POLICY "Users can create matches"
ON matches FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Modificar partidos propios
CREATE POLICY "Users can update their own matches"
ON matches FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Eliminar partidos propios
CREATE POLICY "Users can delete their own matches"
ON matches FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- POLÍTICAS RLS PARA MATCH_PARTICIPANTS
-- =============================================

-- SELECT: Ver participaciones propias o de partidos que creé
CREATE POLICY "Users can view their participations"
ON match_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR match_id IN (SELECT id FROM matches WHERE user_id = auth.uid())
);

-- INSERT/UPDATE/DELETE: Solo el creador del partido gestiona participantes
CREATE POLICY "Match owners can manage participants"
ON match_participants FOR ALL
TO authenticated
USING (match_id IN (SELECT id FROM matches WHERE user_id = auth.uid()));

-- Participantes pueden confirmar su participación
CREATE POLICY "Participants can confirm themselves"
ON match_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
