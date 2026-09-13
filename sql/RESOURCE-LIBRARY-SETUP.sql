-- Fuel Different Resource Library assignments and read tracking
-- Run once in the Supabase SQL Editor.
-- Article bodies remain version-controlled in the application; this table stores assignment state only.

create table if not exists public.resource_assignments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  coach_note text,
  due_date date,
  assigned_at timestamptz not null default now(),
  opened_at timestamptz,
  completed_at timestamptz,
  removed_at timestamptz
);

create unique index if not exists resource_assignments_one_active_article
  on public.resource_assignments (athlete_id, article_slug)
  where removed_at is null;

create index if not exists resource_assignments_athlete_idx
  on public.resource_assignments (athlete_id, assigned_at desc);

create index if not exists resource_assignments_article_idx
  on public.resource_assignments (article_slug);

alter table public.resource_assignments enable row level security;

-- API routes use the service role after performing explicit staff/athlete checks.
-- No direct browser-table policy is granted, which prevents clients from bypassing those checks.

comment on table public.resource_assignments is
  'Private staff-to-athlete Resource Library assignments; article content is stored in the application catalog.';
comment on column public.resource_assignments.coach_note is
  'Private coaching context visible only to the assigned athlete and authorized staff.';
comment on column public.resource_assignments.removed_at is
  'Soft removal timestamp; historical assignment records are retained.';
