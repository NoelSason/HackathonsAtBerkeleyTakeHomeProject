-- Access control.
--
-- Every rule below is enforced by Postgres, not by the application. A bug in
-- a React component, a forgotten `.eq('user_id', me)`, or someone calling the
-- REST API directly with a stolen anon key all hit the same wall.

-- ---------------------------------------------------------------------------
-- is_organizer()
-- ---------------------------------------------------------------------------

-- Almost every policy needs to know whether the caller is an organizer, and
-- that fact lives in `profiles`. Querying `profiles` from inside a policy ON
-- `profiles` would re-enter the policy and recurse forever, which Postgres
-- reports as "infinite recursion detected in policy".
--
-- `security definer` breaks the cycle: the function runs as its owner, whose
-- reads are not subject to row-level security, so it answers the question
-- without triggering the policy that asked it.
create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_organizer from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Column privileges
-- ---------------------------------------------------------------------------

-- Row-level security decides which ROWS you may touch; it cannot stop you
-- editing a column within a row you already own. Without this, the
-- "update your own profile" policy below would happily let any applicant set
-- their own `is_organizer` to true.
revoke update on public.profiles from authenticated;
grant update (full_name, school) on public.profiles to authenticated;

-- Applicants edit their answers; nobody edits `status` through a plain
-- UPDATE. Decisions go through set_application_status() further down.
revoke update on public.applications from authenticated;
grant update (responses, status, submitted_at) on public.applications to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Organizers read every profile"
  on public.profiles for select to authenticated
  using (public.is_organizer());

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------

alter table public.applications enable row level security;

create policy "Applicants read their own applications"
  on public.applications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Organizers read every application"
  on public.applications for select to authenticated
  using (public.is_organizer());

create policy "Applicants create their own draft"
  on public.applications for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'draft');

-- USING tests the row as it exists, WITH CHECK tests the row as it would be.
-- Splitting them is what makes this safe: you may only edit an application
-- that is still a draft, and you may only leave it as a draft or move it to
-- submitted. Without the WITH CHECK clause an applicant could set their own
-- status to 'accepted'.
create policy "Applicants edit their own draft"
  on public.applications for update to authenticated
  using (user_id = (select auth.uid()) and status = 'draft')
  with check (
    user_id = (select auth.uid())
    and status in ('draft', 'submitted')
  );

create policy "Applicants delete their own draft"
  on public.applications for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

-- Note the absence of an organizer UPDATE policy. Organizers change status
-- through set_application_status() instead, which keeps the decision path to
-- a single auditable entry point and makes it impossible for a reviewer to
-- edit an applicant's answers.

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

alter table public.reviews enable row level security;

-- Applicants get no policy at all here, so scores and reviewer notes are
-- invisible to them no matter how they query.
create policy "Organizers read every review"
  on public.reviews for select to authenticated
  using (public.is_organizer());

create policy "Organizers write their own review"
  on public.reviews for insert to authenticated
  with check (public.is_organizer() and reviewer_id = (select auth.uid()));

create policy "Organizers revise their own review"
  on public.reviews for update to authenticated
  using (public.is_organizer() and reviewer_id = (select auth.uid()))
  with check (public.is_organizer() and reviewer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Decisions
-- ---------------------------------------------------------------------------

-- The only way an application's status changes after submission.
--
-- Being `security definer` lets it write a column organizers hold no direct
-- UPDATE privilege on, and the guard on the first line is what stops an
-- applicant calling it against someone else's application.
create or replace function public.set_application_status(
  p_application_id uuid,
  p_status application_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organizer() then
    raise exception 'only organizers may change an application status';
  end if;

  if p_status = 'draft' then
    raise exception 'an application cannot be returned to draft';
  end if;

  update public.applications
     set status = p_status,
         -- A decision on a never-submitted row would otherwise violate the
         -- submitted_at_matches_status constraint.
         submitted_at = coalesce(submitted_at, now())
   where id = p_application_id;
end;
$$;

revoke execute on function public.set_application_status(uuid, application_status) from public;
grant execute on function public.set_application_status(uuid, application_status) to authenticated;
