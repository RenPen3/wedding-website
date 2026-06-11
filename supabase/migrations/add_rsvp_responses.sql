-- RSVP responses + guests policies for the wedding site RSVP flow.
-- Run in Supabase Dashboard → SQL Editor (or `supabase db push`).
--
-- Prefer running fix_rsvp_responses_columns.sql first if your table already exists
-- with missing columns.

-- ── rsvp_responses ──────────────────────────────────────────────────────────
create table if not exists public.rsvp_responses (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now()
);

alter table public.rsvp_responses add column if not exists guest_id uuid references public.guests (id) on delete cascade;
alter table public.rsvp_responses add column if not exists invite_code text;
alter table public.rsvp_responses add column if not exists guest_name text;
alter table public.rsvp_responses add column if not exists attending boolean;
alter table public.rsvp_responses add column if not exists guest_count integer not null default 0;
alter table public.rsvp_responses add column if not exists guest_names text;
alter table public.rsvp_responses add column if not exists message text;
alter table public.rsvp_responses add column if not exists submitted_at timestamptz not null default now();

alter table public.rsvp_responses alter column guest_id drop not null;
alter table public.rsvp_responses alter column invite_code drop not null;

alter table public.rsvp_responses enable row level security;

drop policy if exists "Allow anon insert rsvp_responses" on public.rsvp_responses;
create policy "Allow anon insert rsvp_responses"
	on public.rsvp_responses
	for insert
	to anon
	with check (true);

-- ── guests (existing table) ─────────────────────────────────────────────────
alter table public.guests enable row level security;

drop policy if exists "Allow anon select guests by invite code" on public.guests;
create policy "Allow anon select guests by invite code"
	on public.guests
	for select
	to anon
	using (invite_code is not null);

drop policy if exists "Allow anon update guests rsvp fields" on public.guests;
create policy "Allow anon update guests rsvp fields"
	on public.guests
	for update
	to anon
	using (invite_code is not null)
	with check (invite_code is not null);

revoke update on public.guests from anon;
grant update (rsvp_status, total_attending, guest_names, message, updated_at)
	on public.guests to anon;

notify pgrst, 'reload schema';
