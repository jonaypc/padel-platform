-- 1. Tabla de Seguimiento entre Jugadores
CREATE TABLE IF NOT EXISTS public.player_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- 2. Tabla de Feed de Actividad
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Quién genera la acción
    type TEXT NOT NULL, -- 'reservation', 'match_result', 'club_join', 'player_follow'
    club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
    related_id UUID, -- UUID de la reserva, partido, etc.
    content JSONB NOT NULL, -- Datos extra para renderizar la noticia
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Social
ALTER TABLE public.player_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver seguidores" ON public.player_follows FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden seguir/dejar de seguir" ON public.player_follows FOR ALL TO authenticated USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Activity feed is public" ON public.activity_feed FOR SELECT USING (true);

-- 3. Triggers para alimentar el feed automáticamente

-- Trigger para nuevas reservas
CREATE OR REPLACE FUNCTION public.fn_feed_on_reservation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, type, club_id, related_id, content)
  VALUES (
    NEW.user_id, 
    'reservation', 
    NEW.club_id, 
    NEW.id, 
    jsonb_build_object(
        'court_name', (SELECT name FROM courts WHERE id = NEW.court_id),
        'start_time', NEW.start_time
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_reservation_created
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_feed_on_reservation();

-- Trigger para nuevos seguidores de club
CREATE OR REPLACE FUNCTION public.fn_feed_on_club_join()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, type, club_id, related_id, content)
  VALUES (
    NEW.user_id, 
    'club_join', 
    NEW.club_id, 
    NEW.id, 
    jsonb_build_object(
        'club_name', (SELECT name FROM clubs WHERE id = NEW.club_id)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_club_followed
  AFTER INSERT ON public.club_followers
  FOR EACH ROW EXECUTE FUNCTION public.fn_feed_on_club_join();
