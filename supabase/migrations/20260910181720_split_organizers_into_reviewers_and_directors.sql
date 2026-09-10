-- Organizers are not one group.
--
-- Reviewers read applications and score them. Directors do that and also
-- make the accept, waitlist and reject call. Modelling both as a single
-- `is_organizer` boolean would mean the difference lived only in whichever
-- React component happened to hide the decision buttons, which is not a
-- security boundary. Postgres enforces it instead.

create type staff_role as enum ('reviewer', 'director');

alter table public.profiles add column staff_role staff_role;

comment on column public.profiles.staff_role is
  'null for applicants. Set server-side after the signup code is checked, never from client metadata.';

-- Preserve meaning for anyone already flagged before this split.
update public.profiles set staff_role = 'director' where is_organizer;

-- Redefined BEFORE the old column is dropped, since the previous body reads
-- it. Same name and return type, so every policy referencing it keeps
-- working untouched.
create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.staff_role is not null
  );
$$;

create or replace function public.is_director()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.staff_role = 'director'
  );
$$;

alter table public.profiles drop column is_organizer;

-- Decisions narrow from "any organizer" to "directors only".
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
  if not public.is_director() then
    raise exception 'only directors may decide an application';
  end if;

  if p_status = 'draft' then
    raise exception 'an application cannot be returned to draft';
  end if;

  update public.applications
     set status = p_status,
         submitted_at = coalesce(submitted_at, now())
   where id = p_application_id;
end;
$$;

revoke execute on function public.is_director() from public, anon;
grant execute on function public.is_director() to authenticated;

-- ---------------------------------------------------------------------------
-- Human-readable application numbers
-- ---------------------------------------------------------------------------

-- A uuid is correct as a key and useless to a person. Organizers read
-- application numbers aloud, paste them into Slack and search for them, so
-- rows carry a short serial alongside the uuid. The uuid stays the thing
-- foreign keys and URLs are built on; this is only for display.
alter table public.applications
  add column display_id int generated always as identity (start with 2001);

create unique index applications_display_id_idx on public.applications (display_id);
