-- Migration to add players column to reservations table
ALTER TABLE reservations 
ADD COLUMN players JSONB DEFAULT '[]'::jsonb;
