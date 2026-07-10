-- ============================================================
-- FIXMATE PAYMENT SYSTEM - DATABASE FOUNDATION
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create the payments table
-- One booking has one current payment record.
-- ------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null unique
    references public.bookings(id)
    on delete cascade,

  customer_id uuid not null
    references auth.users(id)
    on delete cascade,

  worker_id uuid not null
    references auth.users(id)
    on delete cascade,

  amount numeric(12, 2) not null
    check (amount >= 0),

  currency text not null default 'LKR'
    check (currency = 'LKR'),

  payment_method text not null
    check (
      payment_method in (
        'payhere',
        'cash'
      )
    ),

  payment_status text not null default 'pending'
    check (
      payment_status in (
        'pending',
        'processing',
        'paid',
        'failed',
        'cancelled',
        'refunded'
      )
    ),

  gateway_order_id text,
  gateway_payment_id text,
  gateway_status_code text,
  gateway_message text,

  paid_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


-- ------------------------------------------------------------
-- 2. Create useful indexes
-- ------------------------------------------------------------

create index payments_customer_id_index
on public.payments(customer_id);

create index payments_worker_id_index
on public.payments(worker_id);

create index payments_status_index
on public.payments(payment_status);

create index payments_method_index
on public.payments(payment_method);


-- ------------------------------------------------------------
-- 3. Automatically update updated_at
-- ------------------------------------------------------------

create or replace function public.set_payment_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_payment_updated_at
before update on public.payments
for each row
execute function public.set_payment_updated_at();


-- ------------------------------------------------------------
-- 4. Enable Row Level Security
-- ------------------------------------------------------------

alter table public.payments
enable row level security;


-- ------------------------------------------------------------
-- 5. Allow customers and workers to read only their own
--    booking payments.
--
--    Administrators may read all payment records.
-- ------------------------------------------------------------

create policy "Booking participants can read payments"
on public.payments
for select
to authenticated
using (
  auth.uid() = customer_id
  or auth.uid() = worker_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);


-- ------------------------------------------------------------
-- 6. Prevent direct client-side payment modification.
--
-- Customers and workers can read payment information,
-- but they cannot directly insert, update or delete payment rows.
--
-- Secure functions and Edge Functions will perform writes.
-- ------------------------------------------------------------

revoke all
on table public.payments
from anon, authenticated;

grant select
on table public.payments
to authenticated;


-- ------------------------------------------------------------
-- 7. Secure function for selecting Cash After Service
-- ------------------------------------------------------------

create or replace function public.choose_cash_payment(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_customer_id uuid;
  v_worker_id uuid;
  v_amount numeric(12, 2);
  v_booking_status text;
  v_existing_status text;
  v_payment_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select
    bookings.customer_id,
    bookings.worker_id,
    bookings.estimated_price,
    bookings.status
  into
    v_customer_id,
    v_worker_id,
    v_amount,
    v_booking_status
  from public.bookings
  where bookings.id = p_booking_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_customer_id <> v_user_id then
    raise exception
      'Only the booking customer can select a payment method.';
  end if;

  if v_booking_status not in (
    'accepted',
    'in_progress',
    'completed'
  ) then
    raise exception
      'Payment can only be selected after the worker accepts the booking.';
  end if;

  select payments.payment_status
  into v_existing_status
  from public.payments
  where payments.booking_id = p_booking_id;

  if v_existing_status = 'paid' then
    raise exception
      'This booking has already been paid.';
  end if;

  insert into public.payments (
    booking_id,
    customer_id,
    worker_id,
    amount,
    currency,
    payment_method,
    payment_status,
    gateway_order_id,
    gateway_payment_id,
    gateway_status_code,
    gateway_message,
    paid_at
  )
  values (
    p_booking_id,
    v_customer_id,
    v_worker_id,
    v_amount,
    'LKR',
    'cash',
    'pending',
    null,
    null,
    null,
    null,
    null
  )
  on conflict (booking_id)
  do update set
    customer_id = excluded.customer_id,
    worker_id = excluded.worker_id,
    amount = excluded.amount,
    currency = 'LKR',
    payment_method = 'cash',
    payment_status = 'pending',
    gateway_order_id = null,
    gateway_payment_id = null,
    gateway_status_code = null,
    gateway_message = null,
    paid_at = null,
    updated_at = now()
  returning payments.id
  into v_payment_id;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'booking_id', p_booking_id,
    'payment_method', 'cash',
    'payment_status', 'pending',
    'amount', v_amount,
    'currency', 'LKR'
  );
end;
$$;


-- ------------------------------------------------------------
-- 8. Secure function for worker confirmation of cash payment
--
-- This can only be used:
-- - by the assigned worker;
-- - for a completed booking;
-- - when Cash After Service was selected.
-- ------------------------------------------------------------

create or replace function public.confirm_cash_payment(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_worker_id uuid;
  v_booking_status text;
  v_payment_id uuid;
  v_amount numeric(12, 2);
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select
    bookings.worker_id,
    bookings.status
  into
    v_worker_id,
    v_booking_status
  from public.bookings
  where bookings.id = p_booking_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_worker_id <> v_user_id then
    raise exception
      'Only the assigned worker can confirm receiving cash.';
  end if;

  if v_booking_status <> 'completed' then
    raise exception
      'Cash can only be confirmed after the booking is completed.';
  end if;

  update public.payments
  set
    payment_status = 'paid',
    paid_at = now(),
    updated_at = now()
  where payments.booking_id = p_booking_id
    and payments.payment_method = 'cash'
    and payments.payment_status = 'pending'
  returning
    payments.id,
    payments.amount
  into
    v_payment_id,
    v_amount;

  if not found then
    raise exception
      'A pending cash payment was not found for this booking.';
  end if;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'booking_id', p_booking_id,
    'payment_method', 'cash',
    'payment_status', 'paid',
    'amount', v_amount,
    'currency', 'LKR'
  );
end;
$$;


-- ------------------------------------------------------------
-- 9. Restrict function access
-- ------------------------------------------------------------

revoke execute
on function public.choose_cash_payment(uuid)
from public;

revoke execute
on function public.confirm_cash_payment(uuid)
from public;

grant execute
on function public.choose_cash_payment(uuid)
to authenticated;

grant execute
on function public.confirm_cash_payment(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 10. Enable realtime payment-status updates
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payments'
  ) then
    alter publication supabase_realtime
    add table public.payments;
  end if;
end;
$$;