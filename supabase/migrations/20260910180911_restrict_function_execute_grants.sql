-- Tighten who may call these functions over the REST API.
--
-- Supabase grants EXECUTE on every function in `public` to anon and
-- authenticated by default, and PostgREST exposes each one at
-- /rest/v1/rpc/<name>. A plain `revoke ... from public` does not undo those,
-- because they are explicit grants to named roles rather than the PUBLIC
-- pseudo-role, so each role has to be named here.

-- Trigger functions. Nothing should ever call these directly, and revoking
-- EXECUTE does not stop a trigger firing: PostgreSQL checks that privilege
-- when the trigger is created, not each time it runs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Reachable only through row-level security policies, which are evaluated as
-- the signed-in caller. A signed-out visitor has no rows to test, so anon
-- gains nothing from being able to ask.
revoke execute on function public.is_organizer() from public, anon;

-- Decisions require a signed-in organizer. The function checks that itself,
-- but there is no reason to leave the endpoint reachable by anon at all.
revoke execute on function public.set_application_status(uuid, application_status)
  from public, anon;

-- Pre-existing event trigger helper that force-enables row-level security on
-- newly created tables. It is driven by a DDL event trigger, so exposing it
-- as a callable endpoint serves no purpose.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
