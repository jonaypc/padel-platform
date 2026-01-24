-- Fix: Permitir reservas ocasionales y bloqueos (sin usuario registrado linked)
ALTER TABLE public.reservations ALTER COLUMN user_id DROP NOT NULL;
