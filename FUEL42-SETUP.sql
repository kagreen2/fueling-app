-- FUEL 42: one-time challenge access through October 31, 2026.
-- Run this once in Supabase SQL Editor before enabling FUEL 42 participant setup.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists challenge_program text,
  add column if not exists challenge_access_until timestamptz;

create table if not exists public.fuel42_enrollments (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique,
  stripe_payment_link_id text not null,
  stripe_customer_id text,
  full_name text,
  email text not null,
  phone text,
  package_key text not null,
  package_name text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  payment_status text not null default 'paid',
  status text not null default 'purchased',
  access_expires_at timestamptz not null default timestamptz '2026-11-01 04:59:59+00',
  setup_token uuid not null default gen_random_uuid() unique,
  setup_token_used_at timestamptz,
  first_email_sent_at timestamptz,
  setup_email_sent_at timestamptz,
  participant_profile_id uuid references public.profiles(id) on delete set null,
  athlete_id uuid references public.athletes(id) on delete set null,
  coach_id uuid references public.profiles(id) on delete set null,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel42_enrollments_status_check check (status in ('purchased', 'setup_sent', 'claimed', 'onboarding_complete', 'canceled', 'refunded')),
  constraint fuel42_enrollments_payment_status_check check (payment_status in ('paid', 'unpaid', 'refunded'))
);

create index if not exists fuel42_enrollments_email_idx on public.fuel42_enrollments (lower(email));
create index if not exists fuel42_enrollments_status_idx on public.fuel42_enrollments (status);

alter table public.fuel42_enrollments enable row level security;

-- The table is intentionally accessed only through server-side routes using the service-role key.
-- No browser-facing policy is created, so setup tokens and purchaser information are never exposed to clients.
