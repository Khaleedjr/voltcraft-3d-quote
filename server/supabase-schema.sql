-- ============================================================
-- Voltcraft 3D Quote — Supabase Orders Table
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists orders (
  id                     uuid        default gen_random_uuid() primary key,
  reference              text        unique not null,
  status                 text        not null default 'pending'
                                     check (status in ('pending', 'paid')),
  provider               text        not null
                                     check (provider in ('paystack', 'solana')),
  reference_number       text,
  order_data             jsonb       not null,
  payment_method         text,
  payment_transaction_id text,
  email_status           text,
  email_warning          text,

  -- Solana-specific fields (null for Paystack orders)
  expected_lamports      bigint,
  recipient_address      text,

  created_at             timestamptz default now(),
  paid_at                timestamptz
);

-- Index for the two most common lookups
create index if not exists idx_orders_reference on orders (reference);
create index if not exists idx_orders_status    on orders (status);

-- Auto-clean stale pending orders older than 2 hours
-- (optional but recommended — run as a cron job in Supabase)
-- delete from orders where status = 'pending' and created_at < now() - interval '2 hours';
