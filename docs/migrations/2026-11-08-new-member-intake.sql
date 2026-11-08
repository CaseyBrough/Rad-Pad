-- New-member intake (theradpad.org/newmemberintake)
-- Run once in the Supabase SQL editor (already applied to project jfqnusdcthdjyzobraig).
--
-- Privacy model: applicants hand over emails, revenue and business details, so
-- unlike the rest of the site this table is NOT readable with the public anon
-- key. The public can only INSERT. Reading, marking reviewed and deleting go
-- through functions that check an admin passphrase (set once, from the admin
-- panel's "New Applications" tab; stored salted+hashed in admin_keys, which the
-- public cannot read).

create table if not exists public.new_member_intake (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  business_name text not null check (char_length(business_name) between 1 and 200),
  website text not null check (char_length(website) between 1 and 500),
  location text not null check (char_length(location) between 1 and 200),
  referred_by text not null check (char_length(referred_by) between 1 and 200),
  years_in_business text not null check (years_in_business in ('Under 1', '1-2', '2-5', '5+')),
  annual_revenue text not null check (annual_revenue in ('Under $50K', '$50-100K', '$100-250K', '$250K+', 'Prefer not to say')),
  best_project_link text check (best_project_link is null or char_length(best_project_link) <= 500),
  about_business text not null check (char_length(about_business) between 1 and 5000),
  going_well_challenge text not null check (char_length(going_well_challenge) between 1 and 5000),
  hoping_to_get text not null check (char_length(hoping_to_get) between 1 and 5000),
  strengths text not null check (char_length(strengths) between 1 and 5000),
  anything_else text check (anything_else is null or char_length(anything_else) <= 5000),
  status text not null default 'new' check (status in ('new', 'reviewed'))
);

alter table public.new_member_intake enable row level security;

drop policy if exists "Anyone can apply" on public.new_member_intake;
create policy "Anyone can apply" on public.new_member_intake
  for insert to anon, authenticated with check (status = 'new');

-- Insert only. No select / update / delete for the public.
revoke all on public.new_member_intake from anon, authenticated;
grant insert on public.new_member_intake to anon, authenticated;

-- Admin passphrase (one row). RLS on, no policies, no grants: unreachable by the public.
create table if not exists public.admin_keys (
  name text primary key,
  salt text not null,
  hash text not null
);
alter table public.admin_keys enable row level security;
revoke all on public.admin_keys from anon, authenticated;

-- Internal check. Not callable from the API.
create or replace function public.admin_key_ok(k text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare r public.admin_keys;
begin
  select * into r from public.admin_keys where name = 'admin';
  if r.name is null then return false; end if;
  if encode(sha256(convert_to(r.salt || coalesce(k, ''), 'UTF8')), 'hex') = r.hash then
    return true;
  end if;
  perform pg_sleep(1); -- slows down guessing
  return false;
end;
$$;
revoke all on function public.admin_key_ok(text) from public, anon, authenticated;

create or replace function public.intake_key_is_set()
returns boolean
language sql
security definer
set search_path = public
as $$ select exists (select 1 from public.admin_keys where name = 'admin'); $$;

-- First call wins: only works while no passphrase exists yet.
create or replace function public.intake_set_key(new_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s text := gen_random_uuid()::text;
begin
  if char_length(coalesce(new_key, '')) < 8 then raise exception 'too-short'; end if;
  if exists (select 1 from public.admin_keys where name = 'admin') then raise exception 'already-set'; end if;
  insert into public.admin_keys (name, salt, hash)
  values ('admin', s, encode(sha256(convert_to(s || new_key, 'UTF8')), 'hex'));
end;
$$;

create or replace function public.intake_list(k text)
returns setof public.new_member_intake
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_key_ok(k) then raise exception 'bad-key'; end if;
  return query select * from public.new_member_intake order by created_at desc;
end;
$$;

create or replace function public.intake_set_status(k text, row_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_key_ok(k) then raise exception 'bad-key'; end if;
  if new_status not in ('new', 'reviewed') then raise exception 'bad-status'; end if;
  update public.new_member_intake set status = new_status where id = row_id;
end;
$$;

create or replace function public.intake_delete(k text, row_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_key_ok(k) then raise exception 'bad-key'; end if;
  delete from public.new_member_intake where id = row_id;
end;
$$;

grant execute on function public.intake_key_is_set() to anon, authenticated;
grant execute on function public.intake_set_key(text) to anon, authenticated;
grant execute on function public.intake_list(text) to anon, authenticated;
grant execute on function public.intake_set_status(text, uuid, text) to anon, authenticated;
grant execute on function public.intake_delete(text, uuid) to anon, authenticated;
