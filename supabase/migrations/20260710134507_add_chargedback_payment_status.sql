-- Add PayHere's chargeback state to the allowed payment statuses.

alter table public.payments
drop constraint if exists payments_payment_status_check;

alter table public.payments
add constraint payments_payment_status_check
check (
  payment_status in (
    'pending',
    'processing',
    'paid',
    'failed',
    'cancelled',
    'refunded',
    'chargedback'
  )
);
