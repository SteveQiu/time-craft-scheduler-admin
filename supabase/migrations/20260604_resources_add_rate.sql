-- Add optional hourly_rate to resources (NULL = use org/user default rate)
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT NULL;
