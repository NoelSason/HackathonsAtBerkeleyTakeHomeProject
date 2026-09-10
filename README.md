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
profiles             id → auth.users, email, full_name, school, staff_role
applications         user_id → profiles, role, status, responses (jsonb),
                     submitted_at, display_id        UNIQUE (user_id, role)
reviews              (application_id, reviewer_id) PK, score 1–5, notes
application_insights application_id PK, the cached reading aid
insight_usage        (reviewer_id, day) PK, count — the reading-aid allowance
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

An application nobody has read reports null for both scores rather than zero.
That distinction is load-bearing: zero is a real position in a z-score
ranking, so treating "unread" as "exactly average" floated every unread
application above the ones a reviewer had genuinely placed below their own
mean. Sorting cannot fix that, because a number is not a null.

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
| Rosa Delgado | 5.00 | 1 | 6 |
| Amara Okafor | 4.67 | 2 | 1 |

Rosa's single 5 came from the most generous reviewer, whose own average is
4.4. Amara's *lowest* score was a 4 from the harshest reviewer, whose average
is 3.1. Calibrated, Amara moves ahead.

Across the whole pile the effect is larger. A volunteer with a single 4 from
the harshest reviewer ranks nineteenth on raw score and first once calibrated;
`npm run portal -- outliers` lists the applications the two orderings most
disagree about, which is the question this feature raises and no screen
answers.

### The reading aid

The detail page can also read an application with Claude and, when the
applicant linked a GitHub repository, compare what they wrote against what
the repository actually contains. It reports three things separately: what
the repository backs up, what it shows that the essay never mentioned, and
where the two actively conflict.

Three constraints shape it, all because this reads real people's
applications:

- **It never scores, ranks or recommends.** A number here would anchor the
  reviewer, which is the exact failure the blind queue exists to prevent.
- **Specificity is defined as evidence density, not merit.** A plain account
  of one small real thing rates above a polished essay of unfalsifiable
  claims. The label on screen says so, so nobody reads it as a grade.
- **The raw repository facts are shown alongside**, so a reviewer checks the
  model's reading rather than trusting it.

It is gated on the reviewer having already submitted their own score, unless
they are a director. Same principle as revealing identity in the queue: form
your own judgement first. It is deliberately absent from the blind queue
entirely.

Two implementation notes. Applicant answers are fenced and labelled as data
before entering the prompt, since they are a text field a stranger filled in;
the instructions also state the model never scores, so a successful injection
has nothing useful to ask for. And the repository URL is parsed strictly:
only a `github.com` repository path is accepted, which is what stops a
portfolio field reading `http://169.254.169.254/latest/meta-data/` from
having the server fetch cloud metadata.

Results are cached per application rather than regenerated per view, so two
reviewers read identical text.

**How the number is produced.** The model answers into a Zod schema rather
than into prose, and that schema has no score, rank or recommendation field —
so there is nowhere for an opinion about the applicant to arrive, which is a
stronger guarantee than instructing it not to give one. The single number it
does return rates *evidence density*, against a five-band rubric written into
the system prompt and repeated on screen. A first-time applicant describing
one small real thing in detail rates high; a polished essay of unfalsifiable
claims rates low. It is deliberately orthogonal to how good the applicant is,
because the standard failure of an automated screener is rewarding fluent
writing, which tracks background rather than ability.

**Rate limiting lives in Postgres.** Each press is a model call plus up to
four GitHub requests: roughly a cent and sixteen seconds. `claim_insight_budget()`
allows fifty readings a day per organizer and refuses to regenerate one less
than five minutes old, and the cooldown is checked *before* the counter is
touched, so the case that actually happens — somebody pressing "Read it
again" — costs neither money nor allowance. The action claims the budget
before calling the model, so a refused request never reaches Anthropic.

It is in the database rather than in the server action for the same reason
everything else is: `save_application_insight` is callable straight off the
REST API by any signed-in organizer, so a rule enforced only in TypeScript is
a rule enforced only for people using the website. The counter table has its
default grants revoked, leaving `select` and nothing else, or an organizer
could simply reset their own tally.

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
npm test
```

## Tests

Two suites, in `tests/`.

`tests/lib` covers the pure functions: the URL parser that is the SSRF
boundary on the reading aid, the query-string parser behind the organizer
filters, both application schemas, the view-row mapper, the CSV escaper and
the date formatting. No network, no database, under a fifth of a second.

`tests/rls` signs in as the three demo accounts and asserts what the row-level
security policies actually do — that an applicant sees their own rows and no
reviews at all, that setting their own `staff_role` to director fails with
`42501`, that a reviewer calling `set_application_status` is refused by the
function, that an anonymous caller sees nothing.

**Those run against the real project rather than a mock on purpose.** A mock
would only assert my own understanding of the policies, which is the part most
likely to be wrong, and it would never catch a policy that is correct in the
migration file but was never applied. The suite skips itself when `.env.local`
is absent, so `npm test` is still green on a fresh clone, and it restores the
one row it mutates.

## Reading the pile from a terminal

Two entry points over one read-only query layer in `lib/portal/`.

```bash
npm run portal -- stats                    # totals and review progress
npm run portal -- queue                    # how much reading is left, by role
npm run portal -- calibration              # each reviewer's own mean and spread
npm run portal -- outliers                 # where raw and calibrated ranking disagree
npm run portal -- show 2111                # one application, answers and reviews
npm run portal -- list --role hacker --status under_review
```

`outliers` is the one worth running. It answers the question the calibration
feature raises and no screen answers, because comparing two sorted columns by
eye means holding both in your head:

```
2165  Nadia Petrova (Volunteer): raw #19, calibrated #1   — up 18
2111  Rosa Delgado  (Hacker):    raw #1,  calibrated #14  — down 13
```

The same reads are available to an AI assistant over MCP:

```json
{
  "mcpServers": {
    "calhacks-portal": {
      "command": "node",
      "args": ["--env-file=.env.local", "scripts/portal-mcp.ts"],
      "cwd": "/absolute/path/to/this/repository"
    }
  }
}
```

Six tools: `list_applications`, `get_application`, `overview_stats`,
`reviewer_calibration`, `queue_status`, `score_outliers`.

**Both authenticate as a named organizer and run every query under that
person's row-level security. Neither reads the service role key.** So an
assistant connected here sees exactly what the human who configured it sees in
the portal, and configuring it with an applicant account makes it refuse to
start rather than answer "how many applications are there" with two. Set
`PORTAL_ORGANIZER_EMAIL` and `PORTAL_ORGANIZER_PASSWORD` to choose whose view
it is.

The schema already refuses the shortcut, which is the better argument:
`organizer_analytics` is `SECURITY INVOKER` and guards itself with
`is_organizer()`, which reads `auth.uid()`. A service-role connection has none,
so it would not merely be over-privileged — it would fail.

**Nothing writes.** There is no tool to grade, decide, message anyone or
trigger the reading aid, which is what makes the surface safe to attach to a
model that might misunderstand an instruction. `grep -nE "\.(insert|update|delete|upsert)\(" lib/portal/*.ts scripts/portal-*.ts`
returns nothing.

## Layout

```
app/(auth)/        sign-in, sign-up, auth server actions
app/(portal)/      applicant side: role picker, application form, dashboard
app/organizer/     applications table, detail, review queue, analytics
components/ui/     the seven primitives everything else is built from
lib/applications/  form registry, query builder, scoring types
lib/insights/      GitHub reader and the Claude call behind the reading aid
lib/portal/        the read-only query layer the CLI and MCP server share
lib/supabase/      browser, server and service-role clients
scripts/           seed data, the organizer CLI, the MCP server
tests/lib/         pure functions, no network
tests/rls/         the security policies, against the real project
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

**Every timestamp renders on the event's clock, not the reader's.** Leaving
the zone unset takes the runtime's, and that differs by where a component
renders — server components format on Vercel, which is UTC, and client
components format in the browser. The same submission was appearing as 13:48
in the table and 8:48 PM on its own detail page. Pacific is the right zone
rather than the reader's own, because every deadline in the product is quoted
in Pacific and a reviewer comparing a timestamp against one should be reading
the same clock.

**Row-level security decides what a query may return, not what it is asking
for.** Policies OR together, and there are two on `applications`: applicants
read their own, organizers read every one. So an unfiltered read means "mine"
for an applicant and "all of them" for an organizer, and the applicant
dashboard has to say `user_id` explicitly even though a policy would have
stopped the wrong person seeing anything.

## What I would add next

- Reviewer assignment, so directors can route specific applications to
  specific readers rather than relying entirely on the pull queue.
- An audit trail on decisions. Right now a status change records the new
  value but not who made it or when.
- Deadline enforcement in the database. It is currently presentational.
- Real email delivery for decisions, on a proper SMTP provider.
- An evaluation of the reading aid. Nobody has checked whether its
  specificity ratings agree with human reviewers, and that is what I would
  want before trusting it at real volume.
- Component and end-to-end tests. The pure functions and the security
  policies are covered; the React components and the click-through paths are
  not, and I verified those by hand.
- Starting an application on a POST rather than a GET. Opening
  `/apply/<role>` creates the draft row, which is idempotent but means link
  prefetching can create empty drafts.
