-- Invite open tracking for personal invite links (guest-list.json slugs).
-- Run manually in Supabase Dashboard → SQL Editor. Safe to re-run (idempotent).
-- Does NOT modify the guests table or any existing table.

-- ── invite_opens (raw events) ───────────────────────────────────────────────
create table if not exists public.invite_opens (
	id uuid primary key default gen_random_uuid(),
	invite_code text not null,
	guest_name text,
	opened_at timestamptz not null default now(),
	user_agent text,
	page_path text
);

create index if not exists idx_invite_opens_invite_code on public.invite_opens (invite_code);
create index if not exists idx_invite_opens_opened_at on public.invite_opens (opened_at desc);

comment on table public.invite_opens is
	'One row per tracked invite link open (via /api/invite-open). Guest slugs match guest-list.json.';

-- ── RLS: block direct public access (inserts go through server API + service role) ──
alter table public.invite_opens enable row level security;

drop policy if exists "invite_opens_block_anon" on public.invite_opens;
create policy "invite_opens_block_anon"
	on public.invite_opens
	for all
	to anon
	using (false);

drop policy if exists "invite_opens_block_authenticated" on public.invite_opens;
create policy "invite_opens_block_authenticated"
	on public.invite_opens
	for all
	to authenticated
	using (false);

revoke all on table public.invite_opens from anon, authenticated;
grant all on table public.invite_opens to service_role;

-- ── invite_open_summary (grouped stats for admin) ───────────────────────────
create or replace view public.invite_open_summary
with (security_invoker = true)
as
select
	invite_code,
	max(guest_name) filter (where guest_name is not null and guest_name <> '') as guest_name,
	min(opened_at) as first_opened_at,
	max(opened_at) as last_opened_at,
	count(*)::integer as open_count
from public.invite_opens
group by invite_code;

comment on view public.invite_open_summary is
	'Per invite_code: first/last open time and total open count.';

revoke all on public.invite_open_summary from anon, authenticated;
grant select on public.invite_open_summary to service_role;

notify pgrst, 'reload schema';
