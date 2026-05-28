-- AI Slideshow Builder: photo section assignments (does not delete original uploads)
-- Run in Supabase SQL Editor

create table if not exists public.photo_slideshow_sections (
	id uuid primary key default gen_random_uuid(),
	photo_id text not null unique,
	section_name text not null check (
		section_name in (
			'getting_ready',
			'ceremony',
			'reception',
			'family',
			'friends',
			'dancing',
			'more_memories'
		)
	),
	display_order integer not null default 0,
	is_visible boolean not null default true,
	quality_score numeric,
	ai_reason text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_photo_slideshow_section_name
	on public.photo_slideshow_sections (section_name);

create index if not exists idx_photo_slideshow_visible
	on public.photo_slideshow_sections (is_visible);

alter table public.photo_slideshow_sections enable row level security;

drop policy if exists "slideshow_public_read" on public.photo_slideshow_sections;
create policy "slideshow_public_read" on public.photo_slideshow_sections
	for select to anon, authenticated
	using (is_visible = true);
