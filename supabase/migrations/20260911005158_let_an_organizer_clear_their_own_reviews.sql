-- Lets a reviewer take back every review they have written.
--
-- The blind queue serves the least-reviewed application the current organizer
-- has not seen, which means an organizer never meets the same application
-- twice. That is the right behaviour while reading, and the wrong one after
-- reading: the first handful of scores were calibrated against nothing, and
-- there is no route back to them.
--
-- The function takes no argument. The reviewer comes from the session, so
-- there is no version of this call that reaches somebody else's rows, and a
-- director gets exactly the same scope as a reviewer. security definer is here
-- to let the delete run past the row policy on reviews, not to widen who it
-- touches; the is_organizer() guard and the auth.uid() predicate are what
-- decide that.
--
-- Deleting the reviews alone would leave applications sitting in
-- 'under_review' with no reviews behind them, because the status is advanced
-- by a trigger on the first insert and nothing walks it back. The update
-- returns only those to 'submitted' — an application another organizer has
-- also read keeps its status, since the not exists clause still finds their
-- row.
create or replace function public.reset_my_reviews()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed int;
begin
  if not public.is_organizer() then
    raise exception 'organizers only';
  end if;

  with gone as (
    delete from public.reviews
     where reviewer_id = (select auth.uid())
    returning application_id
  )
  select count(*) into removed from gone;

  update public.applications a
     set status = 'submitted'
   where a.status = 'under_review'
     and not exists (select 1 from public.reviews r where r.application_id = a.id);

  return removed;
end;
$$;

revoke execute on function public.reset_my_reviews() from public, anon;
grant execute on function public.reset_my_reviews() to authenticated;
