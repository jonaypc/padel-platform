-- Función para unirse a una reserva de forma segura
-- Maneja la lógica de añadir al jugador al array JSONB de players

CREATE OR REPLACE FUNCTION join_reservation(res_id uuid)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_res public.reservations;
    curr_user_id uuid;
    curr_user_email text;
    new_player jsonb;
BEGIN
    -- 1. Obtener usuario actual
    curr_user_id := auth.uid();
    IF curr_user_id IS NULL THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    -- Intentamos obtener el email (o nombre base del email)
    SELECT email INTO curr_user_email FROM auth.users WHERE id = curr_user_id;

    -- 2. Bloquear fila para actualización
    SELECT * INTO target_res FROM public.reservations WHERE id = res_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada';
    END IF;

    -- 3. Validaciones
    -- No permitir si ya está cancelada
    IF target_res.status = 'cancelled' THEN
        RAISE EXCEPTION 'La reserva está cancelada';
    END IF;

    -- No permitir si ya está lleno (max 4)
    IF jsonb_array_length(COALESCE(target_res.players, '[]'::jsonb)) >= 4 THEN
        RAISE EXCEPTION 'La reserva ya está completa';
    END IF;

    -- No permitir si ya está en la lista
    IF target_res.players @> jsonb_build_array(jsonb_build_object('id', curr_user_id::text)) THEN
        RAISE EXCEPTION 'Ya estás unido a esta reserva';
    END IF;

    -- 4. Construir nuevo jugador
    new_player := jsonb_build_object(
        'id', curr_user_id::text,
        'name', split_part(curr_user_email, '@', 1),
        'confirmed', true,
        'paid', false,
        'amount', 0
    );

    -- 5. Actualizar
    UPDATE public.reservations
    SET players = COALESCE(players, '[]'::jsonb) || new_player,
        updated_at = now()
    WHERE id = res_id
    RETURNING * INTO target_res;

    RETURN target_res;
END;
$$;
