-- Lets the seed script hand back identical application numbers every run.
--
-- display_id is an identity column, and wiping every row does not rewind the
-- sequence behind it. So each reseed started numbering where the last one
-- stopped: the first run produced 2001-2061, the fourth produced 2179-2262.
-- Nothing was broken by that, but a demo script, a screenshot and a
-- walkthrough that quote an application number all went stale the next time
-- the data was rebuilt.
--
-- Restarting a sequence is the right thing here and the wrong thing almost
-- anywhere else: reusing identifiers is only safe because the seed has just
-- deleted every row that could have held one. That is why this is a separate
-- function the seed calls deliberately, rather than anything the application
-- can reach — service_role only, which in this project means a script run
-- from a developer's machine and never the deployed app.
create or replace function public.reset_application_display_ids()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.applications) then
    raise exception 'refusing to rewind display ids while applications still exist';
  end if;

  alter table public.applications alter column display_id restart with 2001;
end;
$$;

revoke execute on function public.reset_application_display_ids() from public, anon, authenticated;
grant execute on function public.reset_application_display_ids() to service_role;
