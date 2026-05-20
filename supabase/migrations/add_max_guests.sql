-- Add max_guests to existing guests table (run once in Supabase SQL Editor)
alter table public.guests
	add column if not exists max_guests integer not null default 1 check (max_guests >= 1);

-- Backfill from invited_count when present
update public.guests
set max_guests = greatest(1, invited_count)
where invited_count is not null and invited_count >= 1;
