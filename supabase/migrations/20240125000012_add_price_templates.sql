-- Add price_templates column to clubs
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS price_templates JSONB DEFAULT '[]'::JSONB;

-- Comment
COMMENT ON COLUMN public.clubs.price_templates IS 'List of price presets for reservations (e.g. Resident, Non-Resident)';
