-- Wedding guest invites + RSVP tracking
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists public.guests (
	id uuid primary key default gen_random_uuid(),
	invite_code text not null unique,
	guest_name text not null,
	opened_at timestamptz,
	last_opened_at timestamptz,
	open_count integer not null default 0,
	rsvp_status text check (rsvp_status in ('yes', 'no')),
	rsvp_guest_count integer,
	rsvp_guest_names text,
	rsvp_message text,
	rsvp_submitted_at timestamptz,
	created_at timestamptz not null default now()
);

create table if not exists public.rsvp_responses (
	id uuid primary key default gen_random_uuid(),
	guest_id uuid not null references public.guests (id) on delete cascade,
	invite_code text not null,
	attending boolean not null,
	guest_count integer not null default 1,
	guest_names text,
	message text,
	submitted_at timestamptz not null default now()
);

create index if not exists idx_guests_invite_code on public.guests (invite_code);
create index if not exists idx_rsvp_responses_guest_id on public.rsvp_responses (guest_id);
create index if not exists idx_rsvp_responses_invite_code on public.rsvp_responses (invite_code);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Direct table access is blocked for anon/authenticated roles.
-- Public flows use SECURITY DEFINER RPC functions below.

alter table public.guests enable row level security;
alter table public.rsvp_responses enable row level security;

drop policy if exists "guests_block_anon" on public.guests;
create policy "guests_block_anon" on public.guests for all to anon using (false);

drop policy if exists "guests_block_authenticated" on public.guests;
create policy "guests_block_authenticated" on public.guests for all to authenticated using (false);

drop policy if exists "rsvp_block_anon" on public.rsvp_responses;
create policy "rsvp_block_anon" on public.rsvp_responses for all to anon using (false);

drop policy if exists "rsvp_block_authenticated" on public.rsvp_responses;
create policy "rsvp_block_authenticated" on public.rsvp_responses for all to authenticated using (false);

-- Service role (server admin only) bypasses RLS automatically.

-- ── RPC: track invitation open ────────────────────────────────────────────────

create or replace function public.track_invitation_open(p_invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
	v_guest public.guests%rowtype;
	v_code text;
begin
	v_code := lower(trim(p_invite_code));
	if v_code = '' then
		return null;
	end if;

	update public.guests g
	set
		opened_at = coalesce(g.opened_at, now()),
		last_opened_at = now(),
		open_count = g.open_count + 1
	where g.invite_code = v_code
	returning * into v_guest;

	if not found then
		return null;
	end if;

	return json_build_object(
		'id',
		v_guest.id,
		'invite_code',
		v_guest.invite_code,
		'guest_name',
		v_guest.guest_name,
		'opened_at',
		v_guest.opened_at,
		'last_opened_at',
		v_guest.last_opened_at,
		'open_count',
		v_guest.open_count,
		'rsvp_status',
		v_guest.rsvp_status,
		'rsvp_guest_count',
		v_guest.rsvp_guest_count,
		'rsvp_guest_names',
		v_guest.rsvp_guest_names,
		'rsvp_message',
		v_guest.rsvp_message,
		'rsvp_submitted_at',
		v_guest.rsvp_submitted_at
	);
end;
$$;

-- ── RPC: submit RSVP ──────────────────────────────────────────────────────────

create or replace function public.submit_guest_rsvp(
	p_invite_code text,
	p_attending boolean,
	p_guest_count integer,
	p_guest_names text,
	p_message text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
	v_guest public.guests%rowtype;
	v_code text;
	v_count integer;
	v_status text;
begin
	v_code := lower(trim(p_invite_code));
	if v_code = '' then
		raise exception 'INVITE_NOT_FOUND';
	end if;

	select * into v_guest from public.guests where invite_code = v_code;
	if not found then
		raise exception 'INVITE_NOT_FOUND';
	end if;

	v_count := greatest(1, least(coalesce(p_guest_count, 1), 20));
	v_status := case when p_attending then 'yes' else 'no' end;

	update public.guests g
	set
		rsvp_status = v_status,
		rsvp_guest_count = case when p_attending then v_count else 0 end,
		rsvp_guest_names = nullif(trim(coalesce(p_guest_names, '')), ''),
		rsvp_message = nullif(trim(coalesce(p_message, '')), ''),
		rsvp_submitted_at = now()
	where g.id = v_guest.id
	returning * into v_guest;

	insert into public.rsvp_responses (
		guest_id,
		invite_code,
		attending,
		guest_count,
		guest_names,
		message
	)
	values (
		v_guest.id,
		v_code,
		p_attending,
		case when p_attending then v_count else 0 end,
		nullif(trim(coalesce(p_guest_names, '')), ''),
		nullif(trim(coalesce(p_message, '')), '')
	);

	return json_build_object(
		'invite_code',
		v_guest.invite_code,
		'guest_name',
		v_guest.guest_name,
		'rsvp_status',
		v_guest.rsvp_status,
		'rsvp_guest_count',
		v_guest.rsvp_guest_count,
		'rsvp_submitted_at',
		v_guest.rsvp_submitted_at
	);
end;
$$;

revoke all on function public.track_invitation_open(text) from public;
revoke all on function public.submit_guest_rsvp(text, boolean, integer, text, text) from public;

grant execute on function public.track_invitation_open(text) to anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, boolean, integer, text, text) to anon, authenticated;

-- ── Sample guests (optional — replace with your real list) ────────────────────

insert into public.guests (invite_code, guest_name)
values
	('a7x92k', 'Alex Morgan'),
	('b3m41p', 'Jamie Lee'),
	('c9k28w', 'Taylor Reed'),
	('d5n77q', 'Casey Jordan')
on conflict (invite_code) do nothing;
