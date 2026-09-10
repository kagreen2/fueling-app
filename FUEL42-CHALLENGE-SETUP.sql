-- FUEL 42 Challenge Experience
-- Run this once in the Supabase SQL editor after FUEL42-SETUP.sql.
-- This schema stores private challenge goals and staff-verified scan selections.
-- Public leaderboard totals are calculated server-side; sensitive health values are never exposed to other participants.

create table if not exists public.fuel42_challenge_profiles (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  enrollment_id uuid not null unique references public.fuel42_enrollments(id) on delete cascade,
  primary_goal text,
  goal_weight_lbs numeric,
  goal_body_fat_percentage numeric,
  target_date date not null default date '2026-10-25',
  baseline_habit text,
  nutrition_challenge text,
  lifestyle_schedule text,
  dining_out_frequency text,
  meal_prep_preference text,
  challenge_success_statement text,
  coach_context text,
  weight_management_support text not null default 'prefer_not_to_say'
    check (weight_management_support in ('no', 'yes', 'prefer_not_to_say')),
  weight_management_context text,
  leaderboard_opt_in boolean not null default true,
  leaderboard_display_name text,
  body_comp_consent boolean not null default false,
  starting_scan_id uuid references public.biometric_scans(id) on delete set null,
  final_scan_id uuid references public.biometric_scans(id) on delete set null,
  body_comp_verified_at timestamptz,
  body_comp_verified_by uuid references public.profiles(id) on delete set null,
  intake_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel42_goal_weight_range check (goal_weight_lbs is null or goal_weight_lbs between 60 and 800),
  constraint fuel42_goal_body_fat_range check (goal_body_fat_percentage is null or goal_body_fat_percentage between 2 and 75),
  constraint fuel42_target_date_range check (target_date between date '2026-09-14' and date '2026-10-31')
);

create index if not exists fuel42_challenge_profiles_enrollment_idx
  on public.fuel42_challenge_profiles(enrollment_id);
create index if not exists fuel42_challenge_profiles_leaderboard_idx
  on public.fuel42_challenge_profiles(leaderboard_opt_in, intake_completed_at);

alter table public.fuel42_challenge_profiles enable row level security;

-- Challenge profile details are accessed only through authenticated server-side routes.
-- No browser-facing RLS policy is created, preventing accidental exposure of goals, medication context, or scan identifiers.
