-- Triggers that keep derived state correct without the application
-- remembering to do it.

-- ---------------------------------------------------------------------------
-- A profile for every new auth user
-- ---------------------------------------------------------------------------

-- Supabase writes to `auth.users` during sign-up, and application code never
-- gets a chance to run between that insert and the user's first request. A
-- trigger is the only place a profile row can be created that is guaranteed
-- to have happened by the time the user is signed in.
--
-- `security definer` is required because `authenticated` has no rights on
-- `auth.users`. `set search_path = ''` is the matching safety measure: with a
-- definer function running as the owner, an attacker who could prepend a
-- schema to the search path could shadow `profiles` with their own table, so
-- every reference below is fully qualified instead.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, school)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'school', '')
  );
  return new;
end;
$$;

-- NOTE: `is_organizer` is deliberately NOT read from raw_user_meta_data.
-- That column is populated from the `options.data` bag the browser sends to
-- signUp(), so it is entirely client-controlled. Trusting it here would let
-- anyone mint themselves an organizer account by adding one field to a
-- request. Organizer status is granted server-side after the signup code is
-- verified, using a key the browser never sees.

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

-- Autosaving drafts means `updated_at` is written constantly. Doing it in a
-- trigger rather than in every update statement means a route that forgets
-- cannot produce a row with a stale timestamp.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();
