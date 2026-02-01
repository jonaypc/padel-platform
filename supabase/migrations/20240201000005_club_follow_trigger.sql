-- Trigger para alimentar el feed cuando alguien sigue a un club
CREATE OR REPLACE FUNCTION public.fn_feed_on_club_follow()
RETURNS TRIGGER AS $$
DECLARE
    v_club_name TEXT;
BEGIN
    SELECT name INTO v_club_name FROM public.clubs WHERE id = NEW.club_id;

    INSERT INTO public.activity_feed (user_id, type, club_id, related_id, content)
    VALUES (
        NEW.user_id,
        'club_follow',
        NEW.club_id,
        NEW.id,
        jsonb_build_object(
            'club_name', v_club_name
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_club_follow_created
  AFTER INSERT ON public.club_followers
  FOR EACH ROW EXECUTE FUNCTION public.fn_feed_on_club_follow();
