-- Fix rsvp_responses columns for the wedding RSVP API.
-- Run this in Supabase Dashboard → SQL Editor if you see errors like:
--   "Could not find the 'guest_count' column of 'rsvp_responses' in the schema cache"
--
-- Safe to re-run (idempotent).

-- Ensure table exists
create table if not exists public.rsvp_responses (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now()
);

-- Columns used by src/lib/rsvp-supabase.ts (matches supabase/schema.sql + name-only fallback)
alter table public.rsvp_responses add column if not exists guest_id uuid references public.guests (id) on delete cascade;
alter table public.rsvp_responses add column if not exists invite_code text;
alter table public.rsvp_responses add column if not exists guest_name text;
alter table public.rsvp_responses add column if not exists attending boolean;
alter table public.rsvp_responses add column if not exists guest_count integer not null default 0;
alter table public.rsvp_responses add column if not exists guest_names text;
alter table public.rsvp_responses add column if not exists message text;
alter table public.rsvp_responses add column if not exists submitted_at timestamptz not null default now();

-- Allow RSVPs from the public name lookup flow when no guests row exists yet
alter table public.rsvp_responses alter column guest_id drop not null;
alter table public.rsvp_responses alter column invite_code drop not null;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
