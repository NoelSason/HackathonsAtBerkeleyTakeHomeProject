-- The refusal messages are read by an organizer mid-review, so they are copy,
-- not diagnostics. The first version emitted "read 1 minute(s) ago", which is
-- the shape of a log line. These read like a sentence.
create or replace function public.claim_insight_budget(p_application_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_cap    constant int      := 50;
  cooldown     constant interval := interval '5 minutes';
  generated    timestamptz;
  wait_seconds int;
  new_count    int;
begin
  if not public.is_organizer() then
    raise exception 'organizers only';
  end if;

  select generated_at into generated
    from public.application_insights
   where application_id = p_application_id;

  if generated is not null and generated > now() - cooldown then
    wait_seconds := ceil(extract(epoch from (generated + cooldown - now())))::int;
    raise exception '%',
      case
        when wait_seconds <= 90 then
          'This one was read a moment ago. You can read it again in a minute.'
        else
          'This one was read a moment ago. You can read it again in '
            || ceil(wait_seconds / 60.0)::int || ' minutes.'
      end
      using errcode = 'P0002';
  end if;

  insert into public.insight_usage (reviewer_id, day, count)
  values ((select auth.uid()), (now() at time zone 'America/Los_Angeles')::date, 1)
  on conflict (reviewer_id, day)
  do update set count = public.insight_usage.count + 1
  returning count into new_count;

  if new_count > daily_cap then
    raise exception 'That is all % readings for today. The allowance resets at midnight Pacific.',
      daily_cap using errcode = 'P0001';
  end if;

  return daily_cap - new_count;
end;
$$;
