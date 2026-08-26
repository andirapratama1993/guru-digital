-- ============================================================
-- GURU DIGITAL - Supabase SQL Schema
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Table: profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nama text not null default '',
  sekolah text,
  openai_api_key text,
  gemini_api_key text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- Table: soal_history
-- ============================================================
create table if not exists public.soal_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  tingkat_sekolah text not null,
  mata_pelajaran text not null,
  tingkat_kesulitan text not null,
  bentuk_soal_list jsonb not null default '[]',
  materi text not null,
  soal_list jsonb not null default '[]',
  ai_agent_used text not null default 'default',
  total_soal integer not null default 0,
  created_at timestamptz default now() not null
);

-- RLS
alter table public.soal_history enable row level security;

create policy "Users can view own history"
  on public.soal_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.soal_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.soal_history for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Function: handle_new_user
-- Auto-create profile after signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nama)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Function: updated_at trigger
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
