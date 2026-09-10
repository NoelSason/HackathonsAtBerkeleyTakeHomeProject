-- Model-generated reading aids for one application.
--
-- Cached rather than generated per view, for three reasons: it costs money
-- per call, it takes seconds, and — most importantly — two reviewers looking
-- at the same application must see the same text. Regenerating per reader
-- would introduce variance into exactly the place the rest of this portal
-- works to remove it.
create table public.application_insights (
  application_id uuid primary key references public.applications (id) on delete cascade,

  -- A short factual restatement of what the applicant said they built.
  summary text not null,

  -- How concrete the writing is: named tools, numbers, failure modes, versus
  -- unfalsifiable claims. Deliberately NOT a quality score and never shown
  -- as one — it measures the evidence available to a reviewer, not the
  -- applicant's worth.
  specificity smallint not null check (specificity between 1 and 5),
  specificity_reason text not null,

  -- What the linked repository actually contains, and how that lines up with
  -- the essay. Null when the applicant linked nothing or the link was not a
  -- readable GitHub repository.
  repo_url text,
  repo_stats jsonb,
  repo_findings jsonb,

  -- Recorded so a reviewer can tell whether an insight predates a change in
  -- how these are produced.
  model text not null,
  generated_at timestamptz not null default now()
);

alter table public.application_insights enable row level security;

-- Organizers read. Applicants get no policy at all: this is committee-facing
-- commentary about them, in the same category as reviewer notes.
create policy "Organizers read insights"
  on public.application_insights for select to authenticated
  using (public.is_organizer());

-- No insert or update policy. Writes go through the function below, so the
-- only way a row appears is the one code path that produced it.
create or replace function public.save_application_insight(
  p_application_id uuid,
  p_summary text,
  p_specificity smallint,
  p_specificity_reason text,
  p_repo_url text,
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
    application_id, summary, specificity, specificity_reason,
    repo_url, repo_stats, repo_findings, model, generated_at
  )
  values (
    p_application_id, p_summary, p_specificity, p_specificity_reason,
    p_repo_url, p_repo_stats, p_repo_findings, p_model, now()
  )
  on conflict (application_id) do update set
    summary            = excluded.summary,
    specificity        = excluded.specificity,
    specificity_reason = excluded.specificity_reason,
    repo_url           = excluded.repo_url,
    repo_stats         = excluded.repo_stats,
    repo_findings      = excluded.repo_findings,
    model              = excluded.model,
    generated_at       = now();
end;
$$;

revoke execute on function public.save_application_insight(uuid, text, smallint, text, text, jsonb, jsonb, text) from public, anon;
grant execute on function public.save_application_insight(uuid, text, smallint, text, text, jsonb, jsonb, text) to authenticated;
