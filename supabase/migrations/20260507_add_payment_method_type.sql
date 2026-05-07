-- Add payment method type to payment_proofs
-- Required for cash button orange styling in Appointments.tsx
-- MUST be applied before any SELECT query references this column
ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT;

COMMENT ON COLUMN public.payment_proofs.payment_method_type IS
  'Payment method used (e.g. cash, card, transfer). NULL = method unknown. Does not affect paid/unpaid status.';
