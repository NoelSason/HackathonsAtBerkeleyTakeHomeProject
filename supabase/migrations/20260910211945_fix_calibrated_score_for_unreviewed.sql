-- An application nobody has read was scoring 0.000 rather than null.
--
-- The zero-variance guard below exists for a reviewer whose scores have no
-- spread yet: their z-score is undefined, and 0 ("average for this reviewer")
-- is the honest reading. But the left join means an application with no
-- reviews at all also arrives with a null score_stddev, so it hit the same
-- branch and was recorded as exactly average.
--
-- The consequence was visible on the calibrated ranking: twelve unread
-- applications sorted above every application a reviewer had actually placed
-- below their own mean. Sorting cannot fix that, because 0.000 is a real
-- number, not a null the query can push to the bottom.
--
-- A missing review is not a data point. It contributes null, avg() skips it,
-- and an unread application now reports null like its raw mean already did.
create or replace view public.application_scores
with (security_invoker = true) as
  select
    a.id as application_id,
    count(r.reviewer_id)::integer as review_count,
    avg(r.score)::numeric(4,2) as mean_score,
    avg(
      case
        when r.reviewer_id is null then null
        when c.score_stddev is null or c.score_stddev = 0 then 0
        else (r.score::numeric - c.mean_score) / c.score_stddev
      end
    )::numeric(5,3) as mean_z_score
  from public.applications a
  left join public.reviews r on r.application_id = a.id
  left join public.reviewer_calibration c on c.reviewer_id = r.reviewer_id
  group by a.id;
