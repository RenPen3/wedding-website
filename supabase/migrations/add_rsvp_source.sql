-- Track whether an RSVP was submitted by the guest or entered manually in admin.
alter table public.rsvp_responses add column if not exists rsvp_source text;

notify pgrst, 'reload schema';
