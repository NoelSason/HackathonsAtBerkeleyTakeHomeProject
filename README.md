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

**Each role lands where its work is.** A reviewer signs in to the blind queue,
a director to the applications list, an applicant to their own dashboard. That
is one function in `lib/landing.ts` rather than a literal in two places,
because the sign-in action and the proxy both need the answer. The reviewer
case is the one that matters: the queue takes away the choice of what to read
next and hides names until a score is in, and landing a reviewer on the full
pile hands both of those back before they find the right tab.

`GITHUB_TOKEN` is optional and documented in `.env.example`. Without it
GitHub allows sixty requests an hour per IP address, and one application
costs six of them. CalIntelligence works either way — a repository it could
not read because of that limit says so on the panel, in those words — but on
a shared serverless address the limit is worth raising.

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
application_insights application_id PK, the cached CalIntelligence reading
insight_usage        (reviewer_id, day) PK, count — the reading allowance
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
decided. The name, the real school and the linked repository all appear the
moment a score is recorded, so the judgement is on the record before the
identity can move it and nobody pays a second click for it. School is generalised
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

Across the whole pile the effect is larger: a volunteer with a single 4 from
the harshest reviewer ranks nineteenth on raw score and first once
calibrated.

Because the queue only ever serves what you have not read, there is also a
**Reset my reviews** control at the top of it. The first handful of scores in
a session are calibrated against nothing, and without this there is no way
back to them. It clears only the reviews belonging to the person clicking —
the function takes no argument and reads the reviewer from the session — and
returns the applications no review survives to `submitted`, since the status
was advanced by a trigger that has nothing to walk it back.

### CalIntelligence

The detail page can read an application with Claude: it restates the written
answers, pulls out the sentences a reviewer could go and verify, rates how
much checkable evidence the writing carries, and — when the applicant linked
a GitHub repository — holds what the repository actually contains against
what the essay claimed. It reports three things separately: what the
repository backs up, what it shows that the essay never mentioned, and where
the two actively conflict.

Three constraints shape it, all because this reads real people's
applications:

- **It never scores, ranks or recommends.** A number here would anchor the
  reviewer, which is the exact failure the blind queue exists to prevent.
- **Specificity is defined as evidence density, not merit.** A plain account
  of one small real thing rates above a polished essay of unfalsifiable
  claims. The label on screen says so, so nobody reads it as a grade.
- **Nothing appears that cannot be traced.** Every quotation is checked
  against the answer it claims to come from before it is stored, and the raw
  repository facts sit on the same page, so a reviewer checks the model's
  reading rather than trusting it.

**It is open to any organizer on the detail page**, and an earlier version was
not: that page already shows the applicant's name, their school and every
score another organizer has left, so requiring a reviewer to score before
reading a summary of the answers printed above it protected nothing the page
had not already given away.

**It appears in the blind queue too, split in half.** The summary, the
evidence rating and the quotations come from the answers already on the card,
so they tell a reviewer nothing new about who the applicant is. The repository
section does: the link is `github.com/theirname/project`, so the URL, the
owner, the contributor logins and the model's own sentences all name the
account. That half waits for the same Reveal that uncovers the name, which is
the rule the card already applies to every link field in an application.

**Two calls, in parallel, with different information.** The reader sees only
the written answers and produces the summary, the rating and the quotations.
The auditor sees the answers next to the repository facts and produces the
three comparison lists. Splitting them costs a second call and buys three
things: each prompt holds one job, the wall-clock cost is the slower of the
two rather than the sum, and **the call that chooses the rating is never
shown a repository at all** — so a README cannot influence the number even in
principle.

**It streams.** The endpoint writes one JSON object per line as each part
lands, so the repository facts appear in about four seconds and the summary
writes itself in while the comparison is still running, instead of a spinner
turning for seventeen seconds and everything arriving at once. It is the one
route handler in the app rather than a server action, and that is the reason.

**Untrusted input, on both sides.** Applicant answers are fenced and labelled
as data before entering the prompt, since they are a text field a stranger
filled in. So are the repository facts, which is the less obvious half: the
server fetched them, but an applicant owns the repository they linked and
therefore writes its description, its file names and its README. The URL is
parsed strictly — only a `github.com` repository path is accepted, which is
what stops a portfolio field reading
`http://169.254.169.254/latest/meta-data/` from having the server fetch cloud
metadata.

**What it reads from a repository.** Eight requests: the repository, its
languages, its contributors, its commit count, its last thirty commit
subjects, its full file tree, its dependency manifest and its README.

The file tree is what makes the test and CI figures true rather than guessed —
continuous integration means a workflow file under `.github/workflows`, not
the presence of a `.github` directory, and a test suite is found wherever it
lives rather than only in a top-level `tests` folder. The same response gives
the directory breakdown, the file-type histogram and the largest files, so the
panel can say where the content actually is rather than only what the
top-level folders are called.

The commit log is the cheapest description of what somebody did, and unlike a
README it is written as the work happens. The contributor list answers the
question nothing else did: how much of this repository is the linked account's
work. Those are reported as figures, never as a conclusion, because "214
contributors and 3% of the commits" is a fact and "they probably did not build
this" is the reviewer's call.

**It also says what the project is.** The three comparison lists are all
relative to the essay, which leaves a hole: when an applicant writes one line,
everything true about their project lands under "not mentioned in the essay"
and nothing says plainly what it is. A short description drawn from the
README, the file tree, the manifest and the commit log sits above them. It is
description and not assessment — the prompt forbids any judgement of whether a
project is good, and prefers a commit log to an adjective.

**A link that is not a repository says so.** A GitHub profile with no
repository, a Devpost page, a repository that does not exist, and one GitHub
would not serve us are four different situations and the panel now names
which one happened. The last of those matters most: a rate limit on our side
used to be reported to the reviewer as "not a readable public GitHub
repository", which is a false statement about an applicant caused by our own
quota. It now says so in its own words, and it does not spend one of the
reviewer's readings.

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

Reading the seeded pile twice, the rating was identical on 28 of 30
applications and never moved more than one band. The most fluent essay in the
seed rates 1 and the plainest account of a real thing sits at the top, which
is the rubric doing what it claims. It has still never been compared against
human reviewers, and that remains the honest limit of the claim.

**The model is `claude-haiku-4-5`, and moving down to it was measured rather
than assumed.** It started on `claude-opus-5`, which costs five times as much
per token. A model swap is a change to what every reviewer reads, so the new
output was held against the old: it agrees with the Opus ratings on 98% of
applications within one band, its own run-to-run consistency is better (93%
identical against 83%), and a README demanding a high rating still moves
nothing. Two things got worse and both are worth knowing — the top of the
scale compressed, so a 5 is rare, and the verbatim-quote check began firing at
about one quotation in a hundred where the more expensive model had never
tripped it. **That check had never fired before, which is exactly why it was
worth having.**

**Rate limiting lives in Postgres.** Each press is two model calls plus up to
eight GitHub requests: roughly half a cent and fifteen seconds.
`claim_insight_budget()` allows fifty readings a day per organizer and
refuses to regenerate one less than five minutes old, and the cooldown is
checked *before* the counter is touched, so the case that actually happens —
somebody pressing "Read it again" — costs neither money nor allowance. The
budget is claimed before the model is called, so a refused request never
reaches Anthropic.

It is in the database rather than in the route handler for the same reason
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
npm run warm     # optional, pre-reads the seeded pile with CalIntelligence
```

`npm run seed` removes only the accounts it owns — every seeded address is
listed in the script — so a real sign-up on the deployed site survives a
reseed. It is still a service-role script that writes directly past every
policy, so it runs from a developer's machine and never from the app.

`npm run warm` produces a CalIntelligence reading for every seeded
application ahead of time. Readings are cached per application, so this
simply puts the seeded pile in the state it would be in a week into a real
season, when somebody has already read most of it. A new applicant is
untouched by it: nothing has been read for them, so the first organizer to
open their application generates it live.

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
boundary on CalIntelligence, the prompt fences that keep an applicant's own
README from closing them, the check that discards a quotation the model did
not copy word for word, the file-tree reader behind the test and CI figures,
the query-string parser behind the organizer filters, both application
schemas, the view-row mapper, the CSV escaper and the date formatting. No
network, no database, under a fifth of a second.

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

## Layout

```
app/(auth)/        sign-in, sign-up, auth server actions
app/(portal)/      applicant side: role picker, application form, dashboard
app/organizer/     applications table, detail, review queue, analytics
components/ui/     the seven primitives everything else is built from
lib/applications/  form registry, query builder, scoring types
lib/insights/      GitHub reader and the two Claude calls behind CalIntelligence
lib/supabase/      browser, server and service-role clients
scripts/           the seed, and the script that warms CalIntelligence
tests/lib/         pure functions, no network
tests/rls/         the security policies, against the real project
supabase/migrations/  schema as ordered SQL
proxy.ts           session refresh and route protection
```

`proxy.ts` rather than `middleware.ts`: Next 16 renamed the convention, and
the old filename now logs a deprecation warning.

`next.config.ts` lists `allowedDevOrigins`, which matters only in
development. `next dev` serves its client chunks to the origin it thinks it
is being browsed from. Open the same server at `127.0.0.1`, or at the
machine's address on the network to try the forms on a phone, and those
requests are refused: the pages render, because that is the server, and then
nothing hydrates and every button on the application form silently does
nothing. It takes a while to work out, because a page that renders perfectly
and ignores its own buttons does not look like a networking problem.

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
- An evaluation of CalIntelligence against human reviewers. I checked that
  it applies its own rubric consistently and that a hostile README cannot
  move the rating, but nobody has compared its ratings against a committee's,
  and that is what I would want before trusting it at real volume.
- Component and end-to-end tests. The pure functions and the security
  policies are covered; the React components and the click-through paths are
  not, and I verified those by hand.
- Starting an application on a POST rather than a GET. Opening
  `/apply/<role>` creates the draft row, which is idempotent but means link
  prefetching can create empty drafts.
