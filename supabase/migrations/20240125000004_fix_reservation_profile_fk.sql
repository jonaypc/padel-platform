-- Reparar relación para permitir JOIN en PostgREST (Supabase)
-- reservations.user_id debe apuntar a public.profiles(id) directamente

ALTER TABLE public.reservations 
DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;

ALTER TABLE public.reservations
ADD CONSTRAINT reservations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;
