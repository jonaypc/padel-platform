-- Add shifts column to clubs table to support split schedules
-- It will store an array of time ranges, e.g., [{"start": "09:00", "end": "14:00"}, {"start": "17:00", "end": "22:00"}]
-- If null, it falls back to simple opening_hour/closing_hour mechanism

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS shifts JSONB DEFAULT NULL;
