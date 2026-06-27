-- Scorekeeper — Supabase schema for per-device, anonymous persistence.
--
-- Run this once in the Supabase dashboard → SQL Editor.
-- Also enable anonymous sign-ins: Authentication → Providers → "Allow anonymous sign-ins".
--
-- Anonymous users carry the `authenticated` role and a stable auth.uid(); row-level
-- security scopes every row to the device's anonymous user, keeping data private.

-- Occasions (groups of games — a camping trip, a game night, etc.)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Games. `id` is the app's client-generated game id (upsert target). A game may belong
-- to an occasion (group_id) or stand alone (null).
create table if not exists public.games (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  game_type text not null,
  config jsonb not null,
  players jsonb not null,
  rounds jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists games_owner_updated_idx on public.games (owner_id, updated_at desc);
create index if not exists games_group_idx on public.games (group_id);

alter table public.groups enable row level security;
alter table public.games  enable row level security;

grant select, insert, update, delete on public.groups, public.games to authenticated;

drop policy if exists "own groups" on public.groups;
create policy "own groups" on public.groups for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own games" on public.games;
create policy "own games" on public.games for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
