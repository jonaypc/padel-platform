-- Optimización de rendimiento para tabla reservations
-- Fecha: 2024-01-27

-- 1. Índice para búsquedas por club (Panel B2B Dashboard)
-- Usado en: useReservations hook (dashboard/reservas)
CREATE INDEX IF NOT EXISTS idx_reservations_club_id ON reservations(club_id);

-- 2. Índice para búsquedas por usuario (Player App "Mis Reservas")
-- Usado en: apps/player/app/reservations/page.tsx
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);

-- 3. Índice para rangos de fecha (Evitar solapamientos y filtrar dashboard diario)
-- Usado en: useReservations hook y lógica de disponibilidad
CREATE INDEX IF NOT EXISTS idx_reservations_start_time ON reservations(start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_end_time ON reservations(end_time);

-- 4. Índice compuesto opcional para filtros comunes (Club + Fecha)
CREATE INDEX IF NOT EXISTS idx_reservations_club_date ON reservations(club_id, start_time);
