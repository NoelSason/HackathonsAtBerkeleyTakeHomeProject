-- An application is under review as soon as somebody reviews it.
--
-- Doing this in the review route would work until a second route wrote a
-- review, or the seed script did, or somebody inserted one by hand. It is a
-- fact about the data rather than about one code path, so the database keeps
-- it true.
--
-- It also cannot be done from the application: reviewers hold no UPDATE
-- privilege on applications.status at all, which is deliberate. This runs as
-- the function owner instead.
create or replace function public.advance_status_on_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.applications
     set status = 'under_review'
   where id = new.application_id
     -- Only ever moves submitted to under_review. A decided application is
     -- not dragged backwards because a reviewer added a late opinion.
     and status = 'submitted';

  return new;
end;
$$;

create trigger reviews_advance_application_status
  after insert on public.reviews
  for each row execute function public.advance_status_on_review();

revoke execute on function public.advance_status_on_review() from public, anon, authenticated;
