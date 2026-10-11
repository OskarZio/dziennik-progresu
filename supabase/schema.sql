-- Dziennik Progresu: database setup.
-- Paste the whole file into Supabase → SQL Editor → New query, then press Run.

-- One row per person: name, plan, progression settings and the achievements summary
-- that the other person sees on the "Razem" tab.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  plan jsonb,
  settings jsonb,
  friends jsonb not null default '[]'::jsonb,
  friends_at bigint not null default 0,
  summary jsonb,
  updated_at bigint not null default 0
);
alter table public.profiles enable row level security;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- One row per workout, visible only to its owner.
create table if not exists public.workouts (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  id text not null,
  data jsonb not null,
  updated_at bigint not null default 0,
  primary key (user_id, id)
);
alter table public.workouts enable row level security;

drop policy if exists "workouts own rows" on public.workouts;
create policy "workouts own rows" on public.workouts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private bucket for set videos; each person can only touch files in their own folder.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

drop policy if exists "videos read own" on storage.objects;
create policy "videos read own" on storage.objects
  for select to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "videos insert own" on storage.objects;
create policy "videos insert own" on storage.objects
  for insert to authenticated with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "videos update own" on storage.objects;
create policy "videos update own" on storage.objects
  for update to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "videos delete own" on storage.objects;
create policy "videos delete own" on storage.objects
  for delete to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
