-- BIOVERSE starter schema for Supabase (PostgreSQL).
-- Run this in Supabase SQL Editor. Row Level Security is enabled on every user table.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  species_name text not null check (char_length(species_name) between 1 and 100),
  place_label text check (place_label is null or char_length(place_label) <= 100),
  notes text check (notes is null or char_length(notes) <= 800),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_species (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,
  common_name text,
  scientific_name text,
  source text,
  source_url text,
  created_at timestamptz not null default now(),
  unique (user_id, source_id)
);

alter table public.profiles enable row level security;
alter table public.observations enable row level security;
alter table public.saved_species enable row level security;

-- Profiles are private to their owner.
drop policy if exists "Profile owner can read" on public.profiles;
create policy "Profile owner can read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Profile owner can update" on public.profiles;
create policy "Profile owner can update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Profile owner can insert" on public.profiles;
create policy "Profile owner can insert" on public.profiles for insert with check (auth.uid() = id);

-- Users can read public community notes, but only insert/update/delete their own.
drop policy if exists "Observations are readable" on public.observations;
create policy "Observations are readable" on public.observations for select using (true);
drop policy if exists "Users can submit own observations" on public.observations;
create policy "Users can submit own observations" on public.observations for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own observations" on public.observations;
create policy "Users can update own observations" on public.observations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own observations" on public.observations;
create policy "Users can delete own observations" on public.observations for delete using (auth.uid() = user_id);

-- Saved species are private per account.
drop policy if exists "Users can read own saved species" on public.saved_species;
create policy "Users can read own saved species" on public.saved_species for select using (auth.uid() = user_id);
drop policy if exists "Users can save species" on public.saved_species;
create policy "Users can save species" on public.saved_species for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove saved species" on public.saved_species;
create policy "Users can remove saved species" on public.saved_species for delete using (auth.uid() = user_id);

create index if not exists observations_user_created_idx on public.observations(user_id, created_at desc);
create index if not exists saved_species_user_idx on public.saved_species(user_id, created_at desc);
