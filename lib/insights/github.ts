/**
 * Reads public facts about a GitHub repository an applicant linked to.
 *
 * The URL here comes from an applicant's form submission, so it is treated as
 * hostile input. `parseRepoUrl` accepts nothing except a github.com repository
 * path, which is what stops this becoming a server-side request forgery hole:
 * without that check, a portfolio field reading
 * `http://169.254.169.254/latest/meta-data/` would have the server fetch cloud
 * metadata and hand the result to a language model.
 */

const GITHUB_API = "https://api.github.com";

export type RepoStats = {
  owner: string;
  repo: string;
  description: string | null;
  isFork: boolean;
  createdAt: string;
  lastPushedAt: string;
  stars: number;
  openIssues: number;
  primaryLanguage: string | null;
  /** Language name to share of the codebase, rounded to a percentage. */
  languageShare: Record<string, number>;
  commitCount: number | null;
  topLevelEntries: string[];
  hasTests: boolean;
  hasContinuousIntegration: boolean;
  readmeExcerpt: string | null;
};

/** Only ever returns something for a github.com repository URL. */
export function parseRepoUrl(raw: string): { owner: string; repo: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;

  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) return null;

  return { owner, repo: repo.replace(/\.git$/, "") };
}

function headers(): HeadersInit {
  const base: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "calhacks-portal",
  };

  // Optional. Without it GitHub allows sixty requests an hour per IP, which
  // is enough for a demo and not for a real applications season.
  const token = process.env.GITHUB_TOKEN;
  if (token) base.Authorization = `Bearer ${token}`;

  return base;
}

async function getJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: headers(),
    // Repositories do not change during a review session, and the same
    // application may be opened by several reviewers in a row.
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

/**
 * Total commits, read from the pagination header rather than by listing them.
 *
 * Asking for one commit per page makes GitHub's `Link` header point at a last
 * page whose number is the commit count. Listing every commit to count them
 * would be thousands of records for one number.
 */
async function fetchCommitCount(owner: string, repo: string): Promise<number | null> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=1`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;

  const link = response.headers.get("link");
  if (!link) return 1; // No pagination means a single page, so one commit.

  const last = /[?&]page=(\d+)>; rel="last"/.exec(link);
  return last ? Number(last[1]) : null;
}

type RepoResponse = {
  description: string | null;
  fork: boolean;
  created_at: string;
  pushed_at: string;
  stargazers_count: number;
  open_issues_count: number;
  language: string | null;
};

type ContentEntry = { name: string; type: string };

export async function fetchRepoStats(owner: string, repo: string): Promise<RepoStats | null> {
  const repository = await getJson<RepoResponse>(`/repos/${owner}/${repo}`);
  if (!repository) return null;

  const [languages, contents, commitCount, readme] = await Promise.all([
    getJson<Record<string, number>>(`/repos/${owner}/${repo}/languages`),
    getJson<ContentEntry[]>(`/repos/${owner}/${repo}/contents`),
    fetchCommitCount(owner, repo),
    fetchReadme(owner, repo),
  ]);

  // GitHub reports bytes per language. A percentage is what a reviewer can
  // actually reason about.
  const totalBytes = Object.values(languages ?? {}).reduce((sum, bytes) => sum + bytes, 0);
  const languageShare: Record<string, number> = {};
  for (const [name, bytes] of Object.entries(languages ?? {})) {
    if (totalBytes > 0) languageShare[name] = Math.round((bytes / totalBytes) * 100);
  }

  const entries = (contents ?? []).map((entry) => entry.name);

  return {
    owner,
    repo,
    description: repository.description,
    isFork: repository.fork,
    createdAt: repository.created_at,
    lastPushedAt: repository.pushed_at,
    stars: repository.stargazers_count,
    openIssues: repository.open_issues_count,
    primaryLanguage: repository.language,
    languageShare,
    commitCount,
    topLevelEntries: entries.slice(0, 40),
    hasTests: entries.some((name) => /^(tests?|spec|__tests__)$/i.test(name)),
    hasContinuousIntegration: entries.includes(".github"),
    readmeExcerpt: readme,
  };
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
    headers: { ...headers(), Accept: "application/vnd.github.raw" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;

  const text = await response.text();
  // Enough to tell whether the README explains a real project, without
  // spending the whole prompt budget on someone's documentation.
  return text.slice(0, 4000);
}
