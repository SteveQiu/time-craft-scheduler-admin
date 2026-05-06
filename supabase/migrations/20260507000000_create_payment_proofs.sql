create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  note text,
  photo text,  -- base64 JPEG data URL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one proof per appointment (upsert target)
create unique index if not exists payment_proofs_appointment_id_key on public.payment_proofs(appointment_id);

-- RLS
alter table public.payment_proofs enable row level security;

-- Customer can insert/update their own proof
create policy "customer_manage_own_proof" on public.payment_proofs
  for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

-- Provider can view proofs for their appointments
create policy "provider_view_proof" on public.payment_proofs
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = payment_proofs.appointment_id
        and a.provider_id = auth.uid()
    )
  );

-- updated_at trigger function (create only if not exists)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger payment_proofs_updated_at
  before update on public.payment_proofs
  for each row execute function public.set_updated_at();
