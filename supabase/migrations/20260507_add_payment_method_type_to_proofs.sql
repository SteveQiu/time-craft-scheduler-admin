alter table public.payment_proofs
  add column if not exists payment_method_type text;
