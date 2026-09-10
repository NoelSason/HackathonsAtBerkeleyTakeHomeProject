-- Derived scoring numbers.
--
-- These live in the database rather than in TypeScript so the list page, the
-- detail page and the review queue cannot each arrive at a slightly different
-- average. One definition, three readers.

-- ---------------------------------------------------------------------------
-- reviewer_calibration
-- ---------------------------------------------------------------------------

-- Reviewers do not share a scale. Some volunteers hand out 4s and 5s freely,
-- others treat 3 as a compliment, and with tens of thousands of applications
-- split across dozens of reviewers that spread decides real outcomes.
--
-- This view measures each reviewer against their own history: their mean and
-- how widely they spread their scores.
--
-- `security_invoker = true` matters. A Postgres view runs as its OWNER by
-- default, which for a view created here is a superuser, so it would return
-- every row regardless of who asked and quietly route around row-level
-- security. With security_invoker the view runs as the caller and the
-- policies on `reviews` still apply.
create view public.reviewer_calibration with (security_invoker = true) as
select
  r.reviewer_id,
  count(*)::int                                    as reviews_written,
  avg(r.score)::numeric(4, 2)                      as mean_score,
  coalesce(stddev_samp(r.score), 0)::numeric(4, 2) as score_stddev
from public.reviews r
group by r.reviewer_id;

-- ---------------------------------------------------------------------------
-- application_scores
-- ---------------------------------------------------------------------------

-- Per application: how many reviews it has, the raw average, and the average
-- after each reviewer's score is expressed as a standard score against that
-- reviewer's own distribution.
--
-- The z-score is (score - reviewer's mean) / reviewer's standard deviation.
-- A harsh reviewer's 4 and a lenient reviewer's 4 stop being the same number,
-- which is the entire point: it compares how unusually well a reviewer rated
-- this application relative to everything else they rated.
--
-- A reviewer with no spread yet, either because they have written one review
-- or because they gave everything the same score, has a standard deviation of
-- zero and would divide by zero. Those contribute 0, meaning "average for
-- this reviewer", which is the honest reading of a scale with no variance.
create view public.application_scores with (security_invoker = true) as
select
  a.id                        as application_id,
  count(r.reviewer_id)::int   as review_count,
  avg(r.score)::numeric(4, 2) as mean_score,
  avg(
    case
      when c.score_stddev is null or c.score_stddev = 0 then 0::numeric
      else (r.score - c.mean_score) / c.score_stddev
    end
  )::numeric(5, 3)            as mean_z_score
from public.applications a
left join public.reviews r
  on r.application_id = a.id
left join public.reviewer_calibration c
  on c.reviewer_id = r.reviewer_id
group by a.id;

grant select on public.reviewer_calibration to authenticated;
grant select on public.application_scores to authenticated;
