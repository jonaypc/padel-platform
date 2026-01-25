se-- Add all missing columns for club settings
-- Run this migration to ensure all required columns exist

-- Opening and closing hours
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS opening_hour INTEGER DEFAULT 8;

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS closing_hour INTEGER DEFAULT 23;

-- Default price per booking
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS default_price NUMERIC DEFAULT 0;

-- Booking duration in minutes
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS booking_duration INTEGER DEFAULT 90;

-- Weekly schedule/shifts (JSONB)
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS shifts JSONB DEFAULT NULL;

-- Extras/products for sale (JSONB array)
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '[]'::jsonb;

-- Comments
COMMENT ON COLUMN public.clubs.opening_hour IS 'Opening hour (0-23)';
COMMENT ON COLUMN public.clubs.closing_hour IS 'Closing hour (0-23)';
COMMENT ON COLUMN public.clubs.default_price IS 'Default price per booking session in euros';
COMMENT ON COLUMN public.clubs.booking_duration IS 'Default booking duration in minutes (60, 90, 120)';
COMMENT ON COLUMN public.clubs.shifts IS 'Weekly schedule with shifts: {"1": [{"start": "09:00", "end": "14:00"}], ...}';
COMMENT ON COLUMN public.clubs.extras IS 'Available extras/products: [{"name": "...", "price": number}]';
