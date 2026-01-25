-- Add default_price column to clubs table
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS default_price NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.clubs.default_price IS 'Default price per booking session in euros';
