-- CalIntelligence stopped being one model call and became two, and it now
-- reports why a linked repository could not be read instead of staying
-- silent. Both changes need somewhere to land.
--
-- `claims` holds the short verbatim quotations the reader pulled out of the
-- essays, each already checked against the answer it came from before it was
-- stored. A quotation the model composed rather than copied never reaches
-- this table.
--
-- `repo_outcome` records what the link turned out to be: a repository we
-- read, a GitHub profile with no repository, a link to somewhere we do not
-- read, a repository that does not exist, or one GitHub would not serve us.
-- Those were previously indistinguishable — every one of them produced a
-- panel with no repository section and no explanation, and one of them was a
-- false statement about an applicant.
alter table public.application_insights
  add column if not exists claims jsonb,
  add column if not exists repo_outcome jsonb;

comment on column public.application_insights.claims is
  'Verbatim quotations from the written answers, verified as substrings before storage.';
comment on column public.application_insights.repo_outcome is
  'What the linked URL turned out to be, including why a repository could not be read.';

-- The old signature has to go rather than sit alongside the new one. Two
-- overloads of a SECURITY DEFINER function is a way to leave an unused write
-- path open on the REST API, and the previous one wrote no claims at all.
drop function if exists public.save_application_insight(uuid, text, smallint, text, text, jsonb, jsonb, text);

create or replace function public.save_application_insight(
  p_application_id uuid,
  p_summary text,
  p_specificity smallint,
  p_specificity_reason text,
  p_claims jsonb,
  p_repo_url text,
  p_repo_outcome jsonb,
  p_repo_stats jsonb,
  p_repo_findings jsonb,
  p_model text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organizer() then
    raise exception 'organizers only';
  end if;

  insert into public.application_insights (
    application_id, summary, specificity, specificity_reason, claims,
    repo_url, repo_outcome, repo_stats, repo_findings, model, generated_at
  )
  values (
    p_application_id, p_summary, p_specificity, p_specificity_reason, p_claims,
    p_repo_url, p_repo_outcome, p_repo_stats, p_repo_findings, p_model, now()
  )
  on conflict (application_id) do update set
    summary            = excluded.summary,
    specificity        = excluded.specificity,
    specificity_reason = excluded.specificity_reason,
    claims             = excluded.claims,
    repo_url           = excluded.repo_url,
    repo_outcome       = excluded.repo_outcome,
    repo_stats         = excluded.repo_stats,
    repo_findings      = excluded.repo_findings,
    model              = excluded.model,
    generated_at       = now();
end;
$$;

revoke execute on function public.save_application_insight(uuid, text, smallint, text, jsonb, text, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.save_application_insight(uuid, text, smallint, text, jsonb, text, jsonb, jsonb, jsonb, text) to authenticated;
