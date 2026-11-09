-- 2026-11-09: members can ask to host on Thursdays as well as Tuesdays.
-- Tuesday stays the standing weekly call; Thursday is an extra, member-hosted slot.
-- Only the weekday check in call_request_create changes. Approved Thursday calls
-- use the same Zoom room, time and length settings as Tuesdays (site_settings).

-- A member asks to host a call. Checks the date is a future Tuesday or Thursday with nothing on
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
  if extract(dow from d) not in (2, 4) then raise exception 'not-a-call-day'; end if;
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
