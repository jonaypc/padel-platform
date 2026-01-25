-- Añadir campos de precio fijo (por sesión)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS default_price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);

-- La tabla reservations ya tiene 'price', nos aseguramos de que sea numeric
-- ALTER TABLE public.reservations ALTER COLUMN price TYPE NUMERIC(10, 2); 
-- (Ya es así en el schema original)

-- Comentario para documentación
COMMENT ON COLUMN public.clubs.default_price IS 'Precio por defecto por sesión de 90 min (o duración configurada)';
COMMENT ON COLUMN public.courts.price IS 'Precio específico por sesión para esta pista (anula el del club)';
COMMENT ON COLUMN public.reservations.price IS 'Precio final cobrado por esta reserva específica';
