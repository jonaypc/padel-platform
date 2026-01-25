-- Add advanced features to reservations table
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS players JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed'));

-- Comment for documentation
COMMENT ON COLUMN public.reservations.players IS 'List of players: [{"name": "...", "paid": boolean, "amount": number}]';
COMMENT ON COLUMN public.reservations.items IS 'Extra items: [{"name": "...", "price": number, "quantity": number}]';
