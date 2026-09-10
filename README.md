# Cal Hacks Portal

A hackathon application portal. Applicants sign in and apply as a hacker,
mentor, judge or volunteer; organizers read, grade and decide those
applications.

**Live:** https://hackberkeley.noelsason.com

## Try it

Demo credentials are printed on the sign-in page and fill the form on click.
Password for all three is `calhacks2026`.

| Account | Email | What it can do |
| --- | --- | --- |
| Applicant | `hacker@calhacks.demo` | A submitted hacker application and a volunteer draft |
| Reviewer | `reviewer@calhacks.demo` | Read and grade every application, but not decide any |
| Director | `director@calhacks.demo` | Also accept, waitlist and reject |

Signing up is open. Entering the organizer code during sign-up creates a
reviewer account; directors are not self-serve.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres,
Auth, row-level security) · deployed on Vercel.

## Data model

Three tables and two enums.

```
profiles       id → auth.users, email, full_name, school, staff_role
applications   user_id → profiles, role, status, responses (jsonb),
               submitted_at, display_id        UNIQUE (user_id, role)
reviews        (application_id, reviewer_id) PK, score 1–5, notes
```

`application_role` is hacker / mentor / judge / volunteer.
`application_status` runs draft → submitted → under_review → accepted,
waitlisted or rejected.

**Why answers live in jsonb.** The four account types ask different
questions. A single wide table with a nullable column per question goes
sparse and needs a migration every time a question is reworded. Four parallel
tables quadruple the queries and the security policies for no gain. So
anything shared across roles stays a real column, where it can be indexed and
constrained, and only the role-specific answers go in `responses`. Nothing
reaches that column unvalidated: the server parses submissions against a Zod
schema built from the same config that renders the form, so the two cannot
drift apart. Adding a fifth account type is a config object plus one enum
migration.

**Derived numbers live in SQL.** `application_scores` and
`reviewer_calibration` are views, so the list page, the detail page and the
review queue cannot each arrive at a slightly different average.

## Security model

Access control is row-level security in Postgres, not checks in React. A bug
in a component, a forgotten filter, or someone calling the REST API directly
with the anon key all hit the same wall.

- Applicants read and write only their own rows, and only while a draft.
- Applicants cannot see reviews at all. There is no policy granting it.
- Organizers read everything and write only their own review row.
- Only directors can decide an application, enforced inside
  `set_application_status()`.

Two details worth calling out, because row policies alone do not cover them:

**Column grants.** A row policy decides which rows you may touch, not which
columns within them. Without `grant update (full_name, school)` an applicant
could set their own `staff_role` to director on the row they legitimately
own. Postgres refuses with error 42501.

**`USING` versus `WITH CHECK`.** `USING` tests the row as it exists,
`WITH CHECK` tests the row as it would become. Splitting them is what lets an
applicant move a draft to submitted while making "set my own status to
accepted" match zero rows.

`is_organizer()` is `SECURITY DEFINER` because a policy on `profiles` that
queries `profiles` recurses forever. Both score views set `security_invoker`,
since a Postgres view otherwise runs as its owner and quietly returns rows
past RLS.

## The added feature: blind review with reviewer calibration

Cal Hacks reads tens of thousands of applications with dozens of volunteer
reviewers. Two things go wrong at that scale, and `/organizer/review`
addresses both.

**Throughput.** The queue serves one application at a time, least-reviewed
first and oldest-submitted as the tiebreak, so nobody chooses what to read
next and no application starves. Scoring is `1`–`5` on the keyboard, `Enter`
to submit, `S` to skip.

**Consistency.** Applicant identity is hidden while the score is being
decided. Revealing is possible but requires choosing a score first, so the
judgement is recorded before the name can move it. School is generalised
rather than hidden, because circumstances are context a reviewer legitimately
needs while the specific name is the prestige cue worth removing.

Reviewers also do not share a scale, so raw averages punish applicants who
happened to draw a harsh reader. Each score is additionally expressed as a
z-score against that reviewer's own mean and spread. In the seeded data:

| Applicant | Raw mean | Rank by raw | Rank calibrated |
| --- | --- | --- | --- |
| Rosa Delgado | 5.00 | 1 | 3 |
| Amara Okafor | 4.67 | 3 | 2 |

Rosa's single 5 came from the most generous reviewer, whose own average is
4.4. Amara's *lowest* score was a 4 from the harshest reviewer, whose average
is 2.9. Calibrated, Amara moves ahead.

Also built: draft autosave, a live applicant status timeline that updates
without a refresh, filterable organizer search with shareable URLs, bulk
decisions, CSV export, and an analytics page.

## Local development

```bash
npm install
cp .env.example .env.local     # fill in from the Supabase dashboard
npm run dev
```

Applying the schema and loading demo data:

```bash
supabase db push --db-url "$SUPABASE_DB_URL"
npm run seed
```

`npm run seed` wipes every user first. It is safe here because this project
holds nothing but invented data, and it is not something to point at a
database with real applicants in it.

Checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Layout

```
app/(auth)/        sign-in, sign-up, auth server actions
app/(portal)/      applicant side: role picker, application form, dashboard
app/organizer/     applications table, detail, review queue, analytics
components/ui/     the seven primitives everything else is built from
lib/applications/  form registry, query builder, scoring types
lib/supabase/      browser, server and service-role clients
supabase/migrations/  schema as ordered SQL
proxy.ts           session refresh and route protection
```

`proxy.ts` rather than `middleware.ts`: Next 16 renamed the convention, and
the old filename now logs a deprecation warning.

## Decisions and trade-offs

**Light theme only.** A deliberate scope choice, declared with
`color-scheme: light` so browsers do not tint form controls dark and make an
unthemed page look broken.

**No component library.** Seven small primitives instead. Every question in
every application renders through one `Field` component, which takes its
control as a render prop so the label, help text and error stay wired to the
input through `aria-describedby` and cannot be forgotten.

**Status badges carry a glyph as well as a colour.** These appear thousands
of times in a scan down the table, and colour alone would not separate
accepted from rejected for a reviewer with a colour vision deficiency.

**CSV cells beginning with an operator get a leading apostrophe,** since
spreadsheets execute those as formulas.

## What I would add next

- Reviewer assignment, so directors can route specific applications to
  specific readers rather than relying entirely on the pull queue.
- An audit trail on decisions. Right now a status change records the new
  value but not who made it or when.
- Deadline enforcement in the database. It is currently presentational.
- Tests. There are none, which is the largest gap in this submission.
- Real email delivery for decisions, on a proper SMTP provider.
