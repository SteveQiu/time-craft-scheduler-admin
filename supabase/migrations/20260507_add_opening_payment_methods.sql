-- Add accepted payment method IDs to openings
ALTER TABLE public.openings
  ADD COLUMN IF NOT EXISTS accepted_payment_method_ids text[] DEFAULT NULL;

COMMENT ON COLUMN public.openings.accepted_payment_method_ids IS
  'UUIDs of payment_methods rows the provider accepts for this opening. NULL = all provider methods.';
