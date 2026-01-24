-- 1. Añadir configuración de reservas a clubs
ALTER TABLE clubs 
ADD COLUMN booking_duration integer DEFAULT 90;

-- 2. Crear tipos de datos para reservas
CREATE TYPE reservation_status AS ENUM ('confirmed', 'cancelled');
CREATE TYPE reservation_type AS ENUM ('booking', 'maintenance', 'class');

-- 3. Crear tabla de reservas
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  court_id uuid REFERENCES courts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Null si es bloqueo manual
  
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  
  status reservation_status DEFAULT 'confirmed',
  type reservation_type DEFAULT 'booking',
  
  price numeric(10, 2), -- Precio opcional por ahora
  notes text, -- Notas internas para el club
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraint para evitar solapamientos en la misma pista (excluyendo canceladas)
  CONSTRAINT no_overlap EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled')
);

-- 4. Habilitar RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 5. Policies para reservations

-- CLUB STAFF: Ver todas las reservas de su club
CREATE POLICY "Club staff can view all reservations"
ON reservations FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from club_members
    where club_members.club_id = reservations.club_id
    and club_members.user_id = auth.uid()
  )
);

-- CLUB STAFF: Gestión total (Insert/Update/Delete)
CREATE POLICY "Club staff can manage all reservations"
ON reservations FOR ALL
TO authenticated
USING (
  exists (
    select 1 from club_members
    where club_members.club_id = reservations.club_id
    and club_members.user_id = auth.uid()
  )
);

-- PLAYERS: Ver todas las reservas (para ver ocupación)
-- Permitimos ver reservas confirmadas para saber huecos libres
CREATE POLICY "Players can view active reservations"
ON reservations FOR SELECT
TO authenticated
USING (
  status = 'confirmed'
);

-- PLAYERS: Insertar su propia reserva
CREATE POLICY "Players can create their own reservations"
ON reservations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  status = 'confirmed' AND
  type = 'booking'
);

-- PLAYERS: Cancelar/Ver sus propias reservas (Update limitado)
CREATE POLICY "Players can update their own reservations"
ON reservations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
