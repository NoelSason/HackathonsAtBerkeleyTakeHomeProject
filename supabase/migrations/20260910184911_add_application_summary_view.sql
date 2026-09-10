-- One row per application, with the applicant and their scores already
-- joined on.
--
-- The organizer table needs the applicant's name and school, the review
-- count and both score figures, all filterable and sortable together. Doing
-- that from the client would mean three queries and a merge in TypeScript,
-- and sorting by score would then happen in JavaScript over an incomplete
-- page of rows, which gives the wrong answer as soon as there is more than
-- one page.
--
-- `security_invoker` again, so the policies on the underlying tables still
-- decide who sees what: an organizer sees every row here, an applicant sees
-- only their own.
create view public.application_summary with (security_invoker = true) as
select
  a.id,
  a.display_id,
  a.user_id,
  a.role,
  a.status,
  a.responses,
  a.submitted_at,
  a.created_at,
  a.updated_at,
  p.full_name,
  p.email,
  p.school,
  -- An application nobody has read yet has no row in application_scores, and
  -- a null review count would sort unpredictably and read as unknown rather
  -- than as none.
  coalesce(s.review_count, 0) as review_count,
  s.mean_score,
  s.mean_z_score
from public.applications a
join public.profiles p on p.id = a.user_id
left join public.application_scores s on s.application_id = a.id;

grant select on public.application_summary to authenticated;
