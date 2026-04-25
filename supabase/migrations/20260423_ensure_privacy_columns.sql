-- Ensure privacy control columns exist on profiles table
-- This migration is a safety check to verify columns exist

BEGIN;

-- Add columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_public boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_public boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_public boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate_public boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills_public boolean DEFAULT true;

COMMIT;
