-- Nothing stopped an organizer holding down "Read it again".
--
-- Each press is a Claude call plus up to four GitHub requests: about a cent
-- and about sixteen seconds. A check in the server action would not be
-- enough, because save_application_insight is callable straight off the REST
-- API by anyone signed in as an organizer. Every other rule in this schema
-- lives in Postgres and so does this one.
--
-- The day is Pacific rather than UTC so the reset lines up with every other
-- time this product quotes.
create table public.insight_usage (
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'America/Los_Angeles')::date,
  count int not null default 0,
  primary key (reviewer_id, day)
);

comment on table public.insight_usage is
  'Per-organizer daily count of reading-aid generations. Written only by claim_insight_budget().';

alter table public.insight_usage enable row level security;

-- An organizer may read their own tally, which is how the panel shows what is
-- left. Nobody writes this table directly: the counter is only trustworthy if
-- the single function that increments it is the only way in.
revoke all on public.insight_usage from anon, authenticated;
grant select on public.insight_usage to authenticated;

create policy "Organizers read their own usage"
  on public.insight_usage for select to authenticated
  using (reviewer_id = (select auth.uid()));

/*
 * Claims one reading against today's allowance, or refuses.
 *
 * Called before the model, never after, so a refused request costs nothing.
 * Two limits, in this order:
 *
 *   The cooldown is checked first, because re-reading the same application is
 *   the thing that actually happens and it should cost neither money nor
 *   budget. Five minutes is longer than anyone re-reads one application and
 *   shorter than a genuine second look after new information arrives.
 *
 *   The daily cap is fifty. A committee member reads perhaps thirty
 *   applications in a sitting, so fifty is well clear of real use while
 *   holding the worst case near fifty cents per organizer per day.
 *
 * Returns how many are left, so the panel can say so before anyone hits it.
 */
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
  wait_minutes int;
  new_count    int;
begin
  if not public.is_organizer() then
    raise exception 'organizers only';
  end if;

  select generated_at into generated
    from public.application_insights
   where application_id = p_application_id;

  if generated is not null and generated > now() - cooldown then
    wait_minutes := greatest(1, ceil(extract(epoch from (generated + cooldown - now())) / 60))::int;
    raise exception
      'This one was read % minute(s) ago. You can read it again in % minute(s).',
      greatest(1, floor(extract(epoch from (now() - generated)) / 60))::int, wait_minutes
      using errcode = 'P0002';
  end if;

  insert into public.insight_usage (reviewer_id, day, count)
  values ((select auth.uid()), (now() at time zone 'America/Los_Angeles')::date, 1)
  on conflict (reviewer_id, day)
  do update set count = public.insight_usage.count + 1
  returning count into new_count;

  if new_count > daily_cap then
    raise exception
      'That is all % readings for today. The allowance resets at midnight Pacific.', daily_cap
      using errcode = 'P0001';
  end if;

  return daily_cap - new_count;
end;
$$;

revoke execute on function public.claim_insight_budget(uuid) from public, anon;
grant execute on function public.claim_insight_budget(uuid) to authenticated;
