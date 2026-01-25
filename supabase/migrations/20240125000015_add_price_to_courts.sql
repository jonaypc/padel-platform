-- Add price column to courts table if it doesn't exist
ALTER TABLE courts ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
