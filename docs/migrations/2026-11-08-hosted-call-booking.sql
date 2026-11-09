-- In-hub call booking (replaces the Calendly "Book a Slot" link)
-- Applied to project jfqnusdcthdjyzobraig. Purely additive: new tables and
-- functions only, nothing about events/members/etc. changes.
--
-- Flow: a signed-in member asks to host an open Tuesday -> a row lands in
-- call_requests as 'pending' -> Casey approves it in Admin > Call Bookings ->
-- the approved request is copied into `events` (so it shows on the Calendar with
-- the standing Zoom link) and the host is emailed.
--
-- Privacy: call_requests holds the host's email, so (like new_member_intake) the
-- public cannot read it. Everything goes through functions; the admin ones check
-- the same admin passphrase as the New Applications tab (admin_key_ok).

-- Small key/value settings the site reads (standing Zoom room, call time, feed token).
create table if not exists public.site_settings (
  key text primary key,
  value text not null
);
alter table public.site_settings enable row level security;
drop policy if exists "public read settings" on public.site_settings;
drop policy if exists "public write settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "public write settings" on public.site_settings for all to anon, authenticated using (true) with check (true);
grant select, insert, update on public.site_settings to anon, authenticated;

-- Defaults. The Zoom link is copied from the newest event that has one so no
-- meeting link or passcode needs to live in this file.
insert into public.site_settings (key, value)
select 'standing_zoom_url', coalesce((select zoom_url from public.events where zoom_url like '%/j/9569378365%' order by event_date desc limit 1), '')
on conflict (key) do nothing;
insert into public.site_settings (key, value) values
  ('default_call_time', '3:00pm EST'),
  ('default_call_duration', '90 min'),
  ('feed_token', replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create table if not exists public.call_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_date text not null check (event_date ~ '^\d{4}-\d{2}-\d{2}$'),
  host_name text not null check (char_length(host_name) between 1 and 100),
  host_email text not null check (char_length(host_email) between 3 and 200),
  title text not null check (char_length(title) between 1 and 150),
  description text check (description is null or char_length(description) <= 2000),
  call_type text not null default 'Community Call' check (char_length(call_type) <= 40),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  event_id uuid,
  decided_at timestamptz
);
-- Only one pending request per date; this is what stops two people grabbing the same Tuesday.
create unique index if not exists call_requests_one_pending_per_date on public.call_requests (event_date) where status = 'pending';

alter table public.call_requests enable row level security;
revoke all on public.call_requests from anon, authenticated;

-- Dates with a request waiting on approval (dates only, no names or emails).
create or replace function public.call_slots_held()
returns table (event_date text)
language sql
security definer
set search_path = public
as $$ select r.event_date from public.call_requests r where r.status = 'pending'; $$;

-- A member asks to host a call. Checks the date is a future Tuesday with nothing on
-- the Calendar yet (a "No call" notice counts as something), at most 2 open requests per person.
create or replace function public.call_request_create(
  p_date text, p_name text, p_email text, p_title text, p_description text, p_type text, p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
  new_id uuid := gen_random_uuid();
  today_et date := (now() at time zone 'America/New_York')::date;
begin
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'bad-date'; end if;
  d := p_date::date;
  if d <= today_et then raise exception 'date-passed'; end if;
  if extract(dow from d) <> 2 then raise exception 'not-a-call-day'; end if;
  if exists (select 1 from public.events e where e.event_date = p_date) then
    raise exception 'slot-taken';
  end if;
  if (select count(*) from public.call_requests where lower(host_email) = lower(p_email) and status = 'pending') >= 2 then
    raise exception 'too-many-pending';
  end if;
  begin
    insert into public.call_requests (id, event_date, host_name, host_email, title, description, call_type, note)
    values (new_id, p_date, btrim(p_name), btrim(p_email), btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), coalesce(nullif(btrim(p_type), ''), 'Community Call'), nullif(btrim(coalesce(p_note, '')), ''));
  exception when unique_violation then
    raise exception 'slot-taken';
  end;
  return new_id;
end;
$$;

-- Admin: list every request (newest first).
create or replace function public.call_requests_list(k text)
returns setof public.call_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_key_ok(k) then raise exception 'bad-key'; end if;
  return query select * from public.call_requests order by (status = 'pending') desc, created_at desc;
end;
$$;

-- Admin: approve (creates the Calendar event) or decline. Returns the request.
create or replace function public.call_request_decide(k text, row_id uuid, decision text)
returns public.call_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.call_requests;
  ev_id uuid;
  zoom text;
  t text;
  dur text;
begin
  if not public.admin_key_ok(k) then raise exception 'bad-key'; end if;
  if decision not in ('approved', 'declined') then raise exception 'bad-decision'; end if;
  select * into r from public.call_requests where id = row_id for update;
  if r.id is null then raise exception 'not-found'; end if;
  if r.status <> 'pending' then raise exception 'already-decided'; end if;

  if decision = 'approved' then
    if exists (select 1 from public.events e where e.event_date = r.event_date) then
      raise exception 'slot-taken';
    end if;
    select value into zoom from public.site_settings where key = 'standing_zoom_url';
    select value into t from public.site_settings where key = 'default_call_time';
    select value into dur from public.site_settings where key = 'default_call_duration';
    insert into public.events (title, description, event_date, time, duration, type, platform, zoom_url)
    values (r.title, concat_ws(E'\n\n', r.description, 'Hosted by ' || r.host_name || '.'), r.event_date, coalesce(t, ''), coalesce(dur, ''), r.call_type, 'Zoom', coalesce(zoom, ''))
    returning id into ev_id;
    update public.call_requests set status = 'approved', event_id = ev_id, decided_at = now() where id = row_id returning * into r;
  else
    update public.call_requests set status = 'declined', decided_at = now() where id = row_id returning * into r;
  end if;
  return r;
end;
$$;

-- Admin: delete a finished request.
create or replace function public.call_request_delete(k text, row_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_key_ok(k) then raise exception 'bad-key'; end if;
  delete from public.call_requests where id = row_id;
end;
$$;

grant execute on function public.call_slots_held() to anon, authenticated;
grant execute on function public.call_request_create(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.call_requests_list(text) to anon, authenticated;
grant execute on function public.call_request_decide(text, uuid, text) to anon, authenticated;
grant execute on function public.call_request_delete(text, uuid) to anon, authenticated;

-- Admin sidebar badge: how many requests are waiting (a number only, no details).
create or replace function public.call_requests_pending_count()
returns integer
language sql
security definer
set search_path = public
as $$ select count(*)::int from public.call_requests where status = 'pending'; $$;
grant execute on function public.call_requests_pending_count() to anon, authenticated;
