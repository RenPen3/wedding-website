-- Store full attending guest name lists on rsvp_responses.
-- Run manually in Supabase SQL Editor. Safe to re-run (idempotent).
--
-- guest_names (text) may already exist from fix_rsvp_responses_columns.sql.
-- guest_names_jsonb stores the full array, e.g. ["Rene Perez", "Jocelyn Medina"].

alter table public.rsvp_responses add column if not exists total_attending integer not null default 0;
alter table public.rsvp_responses add column if not exists guest_names text;
alter table public.rsvp_responses add column if not exists guest_names_jsonb jsonb;

comment on column public.rsvp_responses.guest_names_jsonb is
	'All attending guest names as JSON array (main invitee + plus-ones).';

notify pgrst, 'reload schema';
