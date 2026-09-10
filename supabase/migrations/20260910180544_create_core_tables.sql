-- Core schema for the applicant portal.
--
-- Three tables carry everything: who you are, what you applied for, and how
-- organizers graded it. The shape is deliberately narrow — a hackathon
-- portal is a queue of documents with scores attached, not a general CMS.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Mirrors APPLICATION_ROLES in lib/applications/roles.ts. Postgres enums
-- reject anything outside the list, so a typo in application code fails at
-- the database rather than quietly writing a role nobody queries for.
create type application_role as enum ('hacker', 'mentor', 'judge', 'volunteer');

-- The lifecycle an application moves through. `under_review` exists as a
-- distinct state from `submitted` so organizers can show applicants that a
-- human has actually picked their application up.
create type application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'accepted',
  'waitlisted',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Supabase owns the `auth.users` table and it cannot be extended directly,
-- so every application-visible fact about a person lives here instead,
-- keyed by the same id. `on delete cascade` means deleting the auth user
-- takes the profile, their applications and their reviews with it.
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  full_name    text not null default '',
  school       text,
  is_organizer boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on table profiles is
  'Application-visible user data. One row per auth.users row, created by trigger.';

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------

create table applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  role         application_role not null,
  status       application_status not null default 'draft',

  -- Answers to the role-specific questions, keyed by field id.
  --
  -- Anything shared across all four roles stays a real column above, so it
  -- can be indexed, filtered and constrained. Only the answers that differ
  -- per role live here. The alternative shapes were one wide table with a
  -- nullable column per question, which goes sparse and needs a migration
  -- every time a question changes, or four parallel tables, which
  -- quadruples the queries and the security policies for no gain.
  --
  -- Nothing reaches this column unvalidated: the server parses submissions
  -- against a Zod schema generated from the same config that renders the
  -- form, so the form and the validation cannot drift apart.
  responses    jsonb not null default '{}'::jsonb,

  submitted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One application per role per person. Someone may hold both a mentor and
  -- a judge application, but not two hacker applications.
  unique (user_id, role),

  -- Keeps `submitted_at` honest. Without this a row could sit in `accepted`
  -- with no record of when it was submitted, and every "days waiting" number
  -- built on top of it would silently be wrong.
  constraint submitted_at_matches_status check (
    (status = 'draft' and submitted_at is null)
    or (status <> 'draft' and submitted_at is not null)
  )
);

-- The organizer list filters on status and role and sorts by recency, which
-- is the only read path heavy enough to care about indexes.
create index applications_status_idx on applications (status);
create index applications_role_idx on applications (role);
create index applications_user_id_idx on applications (user_id);
create index applications_submitted_at_idx on applications (submitted_at desc nulls last);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- One row per organizer per application. Scores are kept as individual rows
-- rather than an average on the application because the review queue needs
-- to know who has already reviewed what, and because calibrating a
-- reviewer's scores against their own history is impossible once the
-- individual scores have been collapsed into a mean.
create table reviews (
  application_id uuid not null references applications (id) on delete cascade,
  reviewer_id    uuid not null references profiles (id) on delete cascade,
  score          smallint not null check (score between 1 and 5),
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- The natural key is the pair, so it doubles as the primary key. A
  -- reviewer revisiting an application updates their row instead of adding
  -- a second opinion.
  primary key (application_id, reviewer_id)
);

-- Finding every review a given organizer wrote drives both the queue
-- ("skip what I've already seen") and the calibration numbers.
create index reviews_reviewer_id_idx on reviews (reviewer_id);
