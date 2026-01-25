-- Add missing columns for opening and closing hours
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS opening_hour INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS closing_hour INTEGER DEFAULT 23;

-- Ensure extras column is initialized to empty array for existing rows
UPDATE public.clubs SET extras = '[]'::jsonb WHERE extras IS NULL;
