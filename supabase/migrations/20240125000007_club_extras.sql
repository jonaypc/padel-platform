-- Add extras configuration to clubs table
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '[]';

COMMENT ON COLUMN public.clubs.extras IS 'Default extras for the club: [{"name": "...", "price": number}]';
