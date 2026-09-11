/**
 * Reads public facts about whatever an applicant linked to.
 *
 * Everything in this file treats its input as hostile. The URL arrives from a
 * form field a stranger filled in, and `parseRepoUrl` accepts nothing except a
 * github.com repository path — that check is what stops this becoming a
 * server-side request forgery hole. Without it a portfolio field reading
 * `http://169.254.169.254/latest/meta-data/` would have the server fetch cloud
 * metadata and hand the result to a language model.
 *
 * The facts that come back are hostile too, which is less obvious. The server
 * fetched them, so they feel like ours, but an applicant owns the repository
 * they linked and therefore writes its description, its file names and its
 * README. Every one of those reaches a prompt. See `fenceRepoFacts` in
 * generate.ts.
 */

const GITHUB_API = "https://api.github.com";

/** Long enough for a slow response, short enough that a reviewer is not stranded. */
const TIMEOUT_MS = 15_000;

/**
 * The file tree gets longer, because it is the one request that can be huge.
 *
 * A recursive tree for a large project is tens of thousands of entries and
 * several megabytes, and ten seconds was not enough for it — a real reseed
 * produced "GitHub did not answer for that repository" on an applicant who
 * had linked a perfectly good one. Reporting our own timeout as a fact about
 * their link is the same mistake as reporting our own rate limit that way.
 */
const TREE_TIMEOUT_MS = 30_000;

export type Contributor = { login: string; commits: number };
export type RecentCommit = { message: string; at: string; by: string | null };
export type Directory = { path: string; files: number; bytes: number };

export type RepoFacts = {
  owner: string;
  repo: string;
  url: string;
  description: string | null;
  /** The repository's own labels, and the site it points at. */
  topics: string[];
  homepage: string | null;
  hasPages: boolean;

  /** A repository under an organization cannot be "the applicant's account". */
  ownerType: "User" | "Organization" | "unknown";
  isFork: boolean;
  forkedFrom: string | null;
  isArchived: boolean;
  license: string | null;
  defaultBranch: string;

  createdAt: string;
  lastPushedAt: string;
  lastCommitAt: string | null;
  lastCommitBy: string | null;

  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  /** Kilobytes, as GitHub counts them. */
  sizeKb: number;

  primaryLanguage: string | null;
  /** Language name to share of the codebase, rounded to a percentage. */
  languageShare: Record<string, number>;

  commitCount: number | null;
  /**
   * The most recent commit subjects.
   *
   * A commit log is the cheapest description of what somebody actually did,
   * and it is written by them rather than about them. Two commits nine
   * minutes apart and forty commits over three months are different projects
   * with the same file count.
   */
  recentCommits: RecentCommit[];
  /** Distinct days with a commit, among the ones read. */
  activeDays: number | null;
  firstCommitAt: string | null;

  /**
   * Authorship. The single most useful unanswered question about a linked
   * repository is how much of it is this applicant's work, and none of the
   * fields above touch it. These are facts, not conclusions: a reviewer
   * decides what a 3% share means, and an essay that never claimed sole
   * authorship is not contradicted by one.
   */
  contributorCount: number;
  /** True when GitHub had more contributors than the one page we asked for. */
  moreContributors: boolean;
  topContributors: Contributor[];
  /** Commits by the account named in the URL, when that account is a person. */
  ownerCommits: number | null;
  ownerCommitShare: number | null;

  /** From the recursive tree, so a nested test suite is not invisible. */
  fileCount: number | null;
  totalBytes: number | null;
  treeTruncated: boolean;
  topLevelEntries: string[];
  /** Where the code actually is, by file count and size. */
  directories: Directory[];
  /** The file types present, most common first. */
  extensions: { ext: string; files: number }[];
  /** The biggest files, which is usually where the substance is. */
  largestFiles: { path: string; bytes: number }[];
  /** Paths under .github/workflows, which is what CI actually means. */
  workflowFiles: string[];
  /** Other CI configuration, for projects that predate or avoid Actions. */
  otherCiFiles: string[];
  testFileCount: number;
  /** A handful of examples, so the count above can be checked. */
  testFileSamples: string[];
  dependencyManifests: string[];
  /** The contents of the first manifest found, so the real dependencies show. */
  manifestPath: string | null;
  manifestExcerpt: string | null;

  readmeExcerpt: string | null;
  readmeChars: number | null;
};

/**
 * Why a repository read failed, because the reasons are not interchangeable.
 *
 * The first version collapsed all of them into `null`, and the prompt then
 * told the reviewer the applicant had linked something "which is not a
 * readable public GitHub repository". For a 404 that is true. For a 403 it is
 * a false statement about an applicant, told to the person deciding their
 * application, caused by our own unauthenticated rate limit.
 */
export type RepoRead =
  | { outcome: "ok"; facts: RepoFacts }
  | { outcome: "not_found" }
  | { outcome: "rate_limited"; resetAt: string | null }
  | { outcome: "unavailable"; status: number | null };

/** What the applicant put in the link field, classified before anything is fetched. */
export type LinkedUrl =
  | { kind: "none" }
  | { kind: "repo"; owner: string; repo: string; url: string }
  | { kind: "profile"; login: string; url: string }
  | { kind: "elsewhere"; host: string; url: string }
  | { kind: "unparseable"; raw: string };

/** Only ever returns something for a github.com repository URL. */
export function parseRepoUrl(raw: string): { owner: string; repo: string } | null {
  const url = asUrl(raw);
  if (!url || !isGitHub(url)) return null;

  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) return null;

  return { owner, repo: repo.replace(/\.git$/, "") };
}

/**
 * Sorts the link field into the four things it is actually ever set to.
 *
 * A Devpost page, a personal site, a GitLab repository and a GitHub profile
 * with no repository segment all used to return null from `parseRepoUrl` and
 * vanish: the reviewer saw no repository section and no explanation for its
 * absence. Several seeded applicants link exactly the profile case.
 */
export function classifyLink(raw: string | null | undefined): LinkedUrl {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { kind: "none" };

  const url = asUrl(trimmed);
  if (!url) return { kind: "unparseable", raw: trimmed.slice(0, 120) };

  if (!isGitHub(url)) {
    return { kind: "elsewhere", host: url.hostname, url: url.toString() };
  }

  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (owner && repo) {
    const name = repo.replace(/\.git$/, "");
    return { kind: "repo", owner, repo: name, url: `https://github.com/${owner}/${name}` };
  }
  if (owner) return { kind: "profile", login: owner, url: `https://github.com/${owner}` };

  return { kind: "elsewhere", host: url.hostname, url: url.toString() };
}

/**
 * The form's own placeholder reads "github.com/yourname/project", so the
 * scheme-less form is the one applicants actually type, and new URL() throws
 * on it. Assuming https rather than rejecting is safe because the hostname
 * check is what does the work: "169.254.169.254/latest/meta-data/" becomes an
 * https URL and then fails that check like any other host.
 */
function asUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url;
}

function isGitHub(url: URL): boolean {
  return url.hostname === "github.com" || url.hostname === "www.github.com";
}

function headers(accept = "application/vnd.github+json"): HeadersInit {
  const base: Record<string, string> = {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "calhacks-portal",
  };

  // Optional. Without it GitHub allows sixty requests an hour per IP, and one
  // application costs eight of them. On a shared serverless IP that is gone
  // before the demo starts, which is why the rate-limited case above is a
  // first-class outcome rather than an error branch nobody expects to hit.
  const token = process.env.GITHUB_TOKEN;
  if (token) base.Authorization = `Bearer ${token}`;

  return base;
}

type Fetched = { response: Response | null; failed: boolean };

async function call(path: string, accept?: string, timeoutMs = TIMEOUT_MS): Promise<Fetched> {
  try {
    const response = await fetch(`${GITHUB_API}${path}`, {
      headers: headers(accept),
      signal: AbortSignal.timeout(timeoutMs),
      // Repositories do not change during a review session, and the same
      // application may be opened by several reviewers in a row.
      next: { revalidate: 3600 },
    });
    return { response, failed: false };
  } catch {
    // A timeout or a DNS failure. Distinct from a 404: nothing was learned
    // about the repository, so nothing should be said about it.
    return { response: null, failed: true };
  }
}

/** True for the specific shape of a GitHub rate-limit refusal. */
function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true;
  if (response.status !== 403) return false;
  return response.headers.get("x-ratelimit-remaining") === "0";
}

function resetAt(response: Response): string | null {
  const reset = response.headers.get("x-ratelimit-reset");
  if (!reset) return null;
  const seconds = Number(reset);
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
}

async function getJson<T>(path: string, timeoutMs?: number): Promise<T | null> {
  const { response } = await call(path, undefined, timeoutMs);
  if (!response || !response.ok) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Total commits, read from the pagination header rather than by listing them.
 *
 * Asking for one commit per page makes GitHub's `Link` header point at a last
 * page whose number is the commit count. The same response body carries the
 * most recent commit, so the date and author come free.
 */
type CommitSummary = {
  count: number | null;
  lastAt: string | null;
  lastBy: string | null;
  firstAt: string | null;
  activeDays: number | null;
  recent: RecentCommit[];
};

async function fetchCommitSummary(owner: string, repo: string): Promise<CommitSummary> {
  const empty: CommitSummary = {
    count: null,
    lastAt: null,
    lastBy: null,
    firstAt: null,
    activeDays: null,
    recent: [],
  };

  const { response } = await call(`/repos/${owner}/${repo}/commits?per_page=1`);
  if (!response || !response.ok) return empty;

  let count: number | null = 1; // No pagination means a single page, so one commit.
  const link = response.headers.get("link");
  if (link) {
    const last = /[?&]page=(\d+)>; rel="last"/.exec(link);
    count = last ? Number(last[1]) : null;
  }

  const log = await fetchRecentCommits(owner, repo);

  try {
    const body = (await response.json()) as CommitResponse[];
    const head = body[0];
    return {
      count,
      lastAt: head?.commit?.author?.date ?? null,
      lastBy: head?.author?.login ?? head?.commit?.author?.name ?? null,
      firstAt: log.firstAt,
      activeDays: log.activeDays,
      recent: log.recent,
    };
  } catch {
    return { ...empty, count, ...log };
  }
}

/**
 * The last thirty commit subjects, and the shape of the history behind them.
 *
 * **A commit log is the cheapest description of what somebody actually did**,
 * and unlike a README it is written as the work happens rather than
 * afterwards. Two commits nine minutes apart and forty commits over three
 * months are different projects with the same file count, and nothing else in
 * these facts tells them apart.
 *
 * Thirty rather than a hundred because the subjects are what matter and a
 * hundred of them is a page of prompt for a diminishing return.
 */
async function fetchRecentCommits(
  owner: string,
  repo: string,
): Promise<{ recent: RecentCommit[]; activeDays: number | null; firstAt: string | null }> {
  const body = await getJson<CommitResponse[]>(`/repos/${owner}/${repo}/commits?per_page=30`);
  if (!body || !Array.isArray(body)) return { recent: [], activeDays: null, firstAt: null };

  const recent = body.map((entry) => ({
    // The subject line only. A commit body can be a page long and the subject
    // is what a reviewer would skim.
    message: (entry.commit?.message ?? "").split("\n")[0].slice(0, 140),
    at: entry.commit?.author?.date ?? "",
    by: entry.author?.login ?? entry.commit?.author?.name ?? null,
  }));

  const days = new Set(recent.map((entry) => entry.at.slice(0, 10)).filter(Boolean));

  return {
    recent,
    activeDays: days.size || null,
    firstAt: recent.at(-1)?.at || null,
  };
}

/**
 * Who committed, and how much.
 *
 * One request, one page. When GitHub says there is another page the count is
 * reported as a floor rather than guessed at: "at least 100 contributors" is
 * true and useful, and an invented exact number would not be either.
 */
async function fetchContributors(
  owner: string,
  repo: string,
): Promise<{ list: Contributor[]; more: boolean }> {
  const { response } = await call(`/repos/${owner}/${repo}/contributors?per_page=100`);
  if (!response || !response.ok) return { list: [], more: false };

  const more = (response.headers.get("link") ?? "").includes('rel="next"');

  try {
    const body = (await response.json()) as ContributorResponse[];
    const list = body
      .filter((entry) => typeof entry.login === "string")
      .map((entry) => ({ login: entry.login, commits: entry.contributions }));
    return { list, more };
  } catch {
    return { list: [], more: false };
  }
}

/*
 * What counts as a test, across the ecosystems a hackathon applicant turns up
 * with. The first version was `entries.includes("tests")` on the top level
 * alone, which reported `hasTests: false` for a Go project, for a Java project
 * with src/test/java, and for anything keeping its suite beside the source.
 * A confident false is worse than no field at all.
 */
const TEST_DIRECTORY = /(^|\/)(tests?|specs?|__tests__|testing)\//i;
const TEST_FILE = /(^|\/)(test_[^/]+\.py|[^/]+_test\.(go|py|rb|ts|js|java)|[^/]+\.(test|spec)\.[cm]?[jt]sx?)$/i;

const MANIFESTS = new Set([
  "package.json", "requirements.txt", "pyproject.toml", "setup.py", "Pipfile",
  "Cargo.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle", "build.gradle.kts",
  "composer.json", "Package.swift", "Podfile", "CMakeLists.txt", "Dockerfile",
  "docker-compose.yml", "pubspec.yaml", "mix.exs",
]);

/** CI that is not GitHub Actions, so an older project is not reported as having none. */
const OTHER_CI = [
  ".travis.yml", "azure-pipelines.yml", "Jenkinsfile", ".gitlab-ci.yml",
  "appveyor.yml", ".drone.yml", "cloudbuild.yaml", "buildkite.yml",
];

type TreeEntry = { path: string; type: string; size?: number };

export type TreeFacts = {
  fileCount: number | null;
  totalBytes: number;
  truncated: boolean;
  workflowFiles: string[];
  otherCiFiles: string[];
  testFileCount: number;
  testFileSamples: string[];
  dependencyManifests: string[];
  directories: Directory[];
  extensions: { ext: string; files: number }[];
  largestFiles: { path: string; bytes: number }[];
};

/**
 * The whole file list, in one request.
 *
 * `?recursive=1` is the cheap way to answer questions a top-level listing
 * cannot: whether .github/workflows holds an actual workflow rather than an
 * issue template, and whether a test suite exists anywhere rather than only in
 * a directory named `tests` at the root. GitHub truncates the response for
 * very large repositories and says so, which is reported rather than hidden —
 * a truncated tree makes "no tests" unprovable, not false.
 */
async function fetchTree(owner: string, repo: string, branch: string): Promise<TreeFacts | null> {
  const body = await getJson<{ tree?: TreeEntry[]; truncated?: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    TREE_TIMEOUT_MS,
  );
  if (!body?.tree) return null;

  const files = body.tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => ({ path: entry.path, bytes: entry.size ?? 0 }));

  return summariseTree(files, body.truncated === true);
}

/**
 * Turns a list of paths into the handful of facts worth reporting.
 *
 * Separate from the fetch, and exported, because this is where the old
 * version was wrong and a test is the only way to keep it right. CI used to
 * be `entries.includes(".github")`, which is true of a repository holding
 * nothing but an issue template, and tests used to be a top-level directory
 * name, which is false of every Go project ever written.
 */
export function summariseTree(
  input: readonly (string | { path: string; bytes: number })[],
  truncated: boolean,
): TreeFacts {
  const entries = input.map((entry) =>
    typeof entry === "string" ? { path: entry, bytes: 0 } : entry,
  );
  const files = entries.map((entry) => entry.path);

  const workflowFiles = files.filter((path) =>
    /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path),
  );

  const otherCiFiles = files.filter(
    (path) => OTHER_CI.includes(path) || /^\.circleci\//.test(path),
  );

  const testFiles = files.filter((path) => TEST_DIRECTORY.test(path) || TEST_FILE.test(path));

  /*
   * Where the code actually is, rather than only what it is called.
   *
   * A list of top-level names says nothing about which of them holds the
   * work. Two levels deep, counted and weighed, is the difference between
   * "there is a Sources directory" and "Sources/PyodideKit is nine files and
   * forty kilobytes of Swift, while scripts is one shell file".
   */
  const byDirectory = new Map<string, { files: number; bytes: number }>();
  for (const entry of entries) {
    const parts = entry.path.split("/");
    if (parts.length < 2) continue;
    const key = parts.slice(0, Math.min(2, parts.length - 1)).join("/");
    const current = byDirectory.get(key) ?? { files: 0, bytes: 0 };
    current.files += 1;
    current.bytes += entry.bytes;
    byDirectory.set(key, current);
  }

  const directories = [...byDirectory.entries()]
    .map(([path, value]) => ({ path, files: value.files, bytes: value.bytes }))
    .sort((a, b) => b.bytes - a.bytes || b.files - a.files)
    .slice(0, 12);

  const byExtension = new Map<string, number>();
  for (const path of files) {
    const name = path.split("/").at(-1) ?? "";
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "(none)";
    byExtension.set(ext, (byExtension.get(ext) ?? 0) + 1);
  }

  const extensions = [...byExtension.entries()]
    .map(([ext, count]) => ({ ext, files: count }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 10);

  const largestFiles = [...entries]
    .filter((entry) => entry.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 6)
    .map((entry) => ({ path: entry.path, bytes: entry.bytes }));

  return {
    fileCount: files.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    truncated,
    workflowFiles: workflowFiles.slice(0, 12),
    otherCiFiles: otherCiFiles.slice(0, 6),
    testFileCount: testFiles.length,
    testFileSamples: testFiles.slice(0, 8),
    dependencyManifests: [...new Set(files.filter((path) => MANIFESTS.has(path)))].slice(0, 8),
    directories,
    extensions,
    largestFiles,
  };
}

type RepoResponse = {
  description: string | null;
  topics?: string[];
  homepage?: string | null;
  has_pages?: boolean;
  size?: number;
  subscribers_count?: number;
  watchers_count?: number;
  fork: boolean;
  parent?: { full_name: string } | null;
  archived: boolean;
  license: { spdx_id: string | null; name: string } | null;
  default_branch: string;
  owner: { login: string; type: string } | null;
  created_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
};

type CommitResponse = {
  commit?: { message?: string; author?: { date?: string; name?: string } | null } | null;
  author?: { login?: string } | null;
};

type ContributorResponse = { login: string; contributions: number };

type ContentEntry = { name: string; type: string };

/**
 * One in-process copy of each repository read, for an hour.
 *
 * Inside the app this is belt and braces — every fetch below already carries
 * `next: { revalidate: 3600 }`, and Next's data cache does the same job
 * better, across instances. It earns its place outside the app: the warm
 * script runs under plain Node, where that option is ignored, and it reads
 * the same handful of repositories dozens of times in a row. Sixty
 * unauthenticated requests an hour does not survive that without this.
 */
const reads = new Map<string, { at: number; read: RepoRead }>();
const READ_TTL_MS = 3_600_000;

/**
 * Eight requests: the repository, its languages, its contributors, its commit
 * count, its last thirty commit subjects, its file tree, its dependency
 * manifest and its README. All but the first run in parallel — the first has
 * to land before the default branch is known — and the manifest waits on the
 * tree, which is what tells it there is one.
 */
export async function readRepository(owner: string, repo: string): Promise<RepoRead> {
  const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = reads.get(key);
  if (cached && Date.now() - cached.at < READ_TTL_MS) return cached.read;

  const read = await fetchRepository(owner, repo);

  // A rate-limited read is not cached. It says nothing about the repository,
  // and remembering it for an hour would outlast the limit that caused it.
  if (read.outcome !== "rate_limited") reads.set(key, { at: Date.now(), read });

  return read;
}

async function fetchRepository(owner: string, repo: string): Promise<RepoRead> {
  const { response, failed } = await call(`/repos/${owner}/${repo}`);

  if (failed || !response) return { outcome: "unavailable", status: null };
  if (isRateLimited(response)) return { outcome: "rate_limited", resetAt: resetAt(response) };
  if (response.status === 404) return { outcome: "not_found" };
  if (!response.ok) return { outcome: "unavailable", status: response.status };

  let repository: RepoResponse;
  try {
    repository = (await response.json()) as RepoResponse;
  } catch {
    return { outcome: "unavailable", status: response.status };
  }

  const branch = repository.default_branch || "main";

  const [languages, contents, commits, contributors, tree, readme] = await Promise.all([
    getJson<Record<string, number>>(`/repos/${owner}/${repo}/languages`),
    getJson<ContentEntry[]>(`/repos/${owner}/${repo}/contents`),
    fetchCommitSummary(owner, repo),
    fetchContributors(owner, repo),
    fetchTree(owner, repo, branch),
    fetchReadme(owner, repo),
  ]);

  // The dependency list is the one thing a file tree cannot tell you, and it
  // is a good description of what was actually assembled. One request, and
  // only when the tree found a manifest worth reading.
  const manifestPath = tree?.dependencyManifests[0] ?? null;
  const manifest = manifestPath ? await fetchTextFile(owner, repo, manifestPath) : null;

  // GitHub reports bytes per language. A percentage is what a reviewer can
  // actually reason about.
  const totalBytes = Object.values(languages ?? {}).reduce((sum, bytes) => sum + bytes, 0);
  const languageShare: Record<string, number> = {};
  for (const [name, bytes] of Object.entries(languages ?? {})) {
    if (totalBytes > 0) languageShare[name] = Math.round((bytes / totalBytes) * 100);
  }

  const ownerType =
    repository.owner?.type === "User" || repository.owner?.type === "Organization"
      ? repository.owner.type
      : "unknown";

  // Only meaningful when the URL names a person. A repository under an
  // organization has no contributor whose login is the organization, and
  // reporting a 0% share there would invite exactly the wrong conclusion.
  const ownerEntry =
    ownerType === "User"
      ? contributors.list.find((entry) => entry.login.toLowerCase() === owner.toLowerCase())
      : undefined;

  const totalContributions = contributors.list.reduce((sum, entry) => sum + entry.commits, 0);

  return {
    outcome: "ok",
    facts: {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
      description: repository.description,
      topics: repository.topics ?? [],
      homepage: repository.homepage || null,
      hasPages: repository.has_pages === true,
      ownerType,
      isFork: repository.fork,
      forkedFrom: repository.parent?.full_name ?? null,
      isArchived: repository.archived,
      license: repository.license?.spdx_id ?? repository.license?.name ?? null,
      defaultBranch: branch,
      createdAt: repository.created_at,
      lastPushedAt: repository.pushed_at,
      lastCommitAt: commits.lastAt,
      lastCommitBy: commits.lastBy,
      firstCommitAt: commits.firstAt,
      activeDays: commits.activeDays,
      recentCommits: commits.recent,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      watchers: repository.subscribers_count ?? repository.watchers_count ?? 0,
      openIssues: repository.open_issues_count,
      sizeKb: repository.size ?? 0,
      primaryLanguage: repository.language,
      languageShare,
      commitCount: commits.count,
      contributorCount: contributors.list.length,
      moreContributors: contributors.more,
      topContributors: contributors.list.slice(0, 5),
      ownerCommits: ownerEntry?.commits ?? (ownerType === "User" ? 0 : null),
      ownerCommitShare:
        ownerType === "User" && totalContributions > 0
          ? Math.round(((ownerEntry?.commits ?? 0) / totalContributions) * 100)
          : null,
      fileCount: tree?.fileCount ?? null,
      totalBytes: tree?.totalBytes ?? null,
      treeTruncated: tree?.truncated ?? false,
      topLevelEntries: (contents ?? []).map((entry) => entry.name).slice(0, 40),
      directories: tree?.directories ?? [],
      extensions: tree?.extensions ?? [],
      largestFiles: tree?.largestFiles ?? [],
      workflowFiles: tree?.workflowFiles ?? [],
      otherCiFiles: tree?.otherCiFiles ?? [],
      testFileCount: tree?.testFileCount ?? 0,
      testFileSamples: tree?.testFileSamples ?? [],
      dependencyManifests: tree?.dependencyManifests ?? [],
      manifestPath,
      manifestExcerpt: manifest,
      readmeExcerpt: readme?.excerpt ?? null,
      readmeChars: readme?.length ?? null,
    },
  };
}

async function fetchReadme(
  owner: string,
  repo: string,
): Promise<{ excerpt: string; length: number } | null> {
  const { response } = await call(
    `/repos/${owner}/${repo}/readme`,
    "application/vnd.github.raw",
  );
  if (!response || !response.ok) return null;

  try {
    const text = await response.text();
    /*
     * Twelve thousand characters, not four.
     *
     * Four kept the prompt small and it was the wrong trade. A README is the
     * only place a repository explains itself in its own words, and on a
     * project that documents its reasoning the first four thousand characters
     * are the pitch — the part saying what was hard and what was decided
     * comes after it. One real example ran to eleven thousand characters with
     * everything specific past the cut, and the panel duly reported that the
     * repository was "described only as an open source project".
     *
     * The cost is a few thousand input tokens on one of the two calls, which
     * is a fraction of a cent.
     */
    return { excerpt: text.slice(0, 12000), length: text.length };
  } catch {
    return null;
  }
}

/** One text file from the repository, capped. Used for the dependency manifest. */
async function fetchTextFile(owner: string, repo: string, path: string): Promise<string | null> {
  const { response } = await call(
    `/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
    "application/vnd.github.raw",
  );
  if (!response || !response.ok) return null;

  try {
    return (await response.text()).slice(0, 2500);
  } catch {
    return null;
  }
}
