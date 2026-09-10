-- Everything the analytics page shows, in one round trip.
--
-- Aggregating in the browser would mean shipping every application row to
-- the client and counting them there, which is fine at fifteen rows and
-- absurd at twelve thousand. These are counts; Postgres should do them.
--
-- The per-role review targets are passed in rather than written here. They
-- live in lib/applications/forms.ts alongside the questions, and copying
-- them into SQL would give the two definitions somewhere to disagree.
--
-- Left as `security invoker` (the default) so the row-level security
-- policies still apply, with an explicit guard so a plain applicant gets a
-- clear refusal rather than a page of their own numbers presented as if
-- they were the whole event.
create or replace function public.organizer_analytics(p_targets jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_organizer() then
    raise exception 'organizers only';
  end if;

  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'all', count(*),
        'submitted', count(*) filter (where a.status <> 'draft'),
        'decided', count(*) filter (where a.status in ('accepted', 'waitlisted', 'rejected')),
        'drafts', count(*) filter (where a.status = 'draft')
      )
      from public.applications a
    ),

    'reviews', (
      select jsonb_build_object(
        'written', count(*),
        'reviewers', count(distinct r.reviewer_id),
        -- percentile_cont interpolates, which is what you want for a median
        -- over a discrete 1..5 scale spread across thousands of reads.
        'median', coalesce(percentile_cont(0.5) within group (order by r.score), 0),
        'stddev', coalesce(stddev_samp(r.score), 0)
      )
      from public.reviews r
    ),

    'by_role', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.total desc), '[]'::jsonb)
      from (
        select
          a.role::text                                                as role,
          count(*)                                                    as total,
          count(*) filter (where a.status <> 'draft')                 as submitted,
          -- An application counts as read once it has hit its target for
          -- that role, which is why the targets have to be passed in.
          count(*) filter (
            where a.status <> 'draft'
              and coalesce(s.review_count, 0) >= (p_targets ->> a.role::text)::int
          )                                                           as complete
        from public.applications a
        left join public.application_scores s on s.application_id = a.id
        group by a.role
      ) t
    ),

    'by_school', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.total desc), '[]'::jsonb)
      from (
        select coalesce(p.school, 'Not given') as school, count(*) as total
        from public.applications a
        join public.profiles p on p.id = a.user_id
        group by coalesce(p.school, 'Not given')
        order by count(*) desc
        limit 8
      ) t
    ),

    'score_distribution', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.score), '[]'::jsonb)
      from (
        select g.score, count(r.score) as total
        -- generate_series so a score nobody has given still appears as a
        -- zero bar, instead of the chart silently dropping a column.
        from generate_series(1, 5) as g(score)
        left join public.reviews r on r.score = g.score
        group by g.score
      ) t
    ),

    'by_week', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.week), '[]'::jsonb)
      from (
        select
          date_trunc('week', a.submitted_at)::date as week,
          count(*)                                 as total
        from public.applications a
        where a.submitted_at is not null
        group by date_trunc('week', a.submitted_at)
        order by 1
      ) t
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.organizer_analytics(jsonb) from public, anon;
grant execute on function public.organizer_analytics(jsonb) to authenticated;
