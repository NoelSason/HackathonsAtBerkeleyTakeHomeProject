import { describe, expect, it } from "vitest";
import { parseRepoUrl, summariseTree } from "@/lib/insights/github";

/*
 * This is the security-critical one.
 *
 * The value comes from an applicant's portfolio field, and whatever it names
 * gets fetched by the server and handed to a language model. `parseRepoUrl`
 * is the only thing standing between that field and a server-side request
 * forgery, so the rejections below matter more than the acceptances.
 */
describe("parseRepoUrl", () => {
  describe("rejects anything that is not a github.com repository", () => {
    const hostile = [
      // The canonical SSRF target: cloud instance metadata.
      ["cloud metadata by IP", "http://169.254.169.254/latest/meta-data/"],
      // Same target without a scheme, which matters because we now add one.
      ["cloud metadata, scheme-less", "169.254.169.254/latest/meta-data/"],
      ["loopback", "http://127.0.0.1/owner/repo"],
      ["loopback by name", "localhost:3000/owner/repo"],
      ["a local file", "file:///etc/passwd"],
      ["a script URL", "javascript:alert(1)"],
      // github.com appearing in the path rather than the host.
      ["github.com in the path", "https://evil.com/github.com/owner/repo"],
      // github.com as a prefix of a longer host.
      ["a lookalike host", "https://github.com.evil.com/owner/repo"],
      ["another forge", "https://gitlab.com/owner/repo"],
      ["a different github host", "https://raw.githubusercontent.com/owner/repo"],
      ["not a URL at all", "not a url at all"],
      ["an empty string", ""],
    ] as const;

    it.each(hostile)("%s", (_label, input) => {
      expect(parseRepoUrl(input)).toBeNull();
    });
  });

  describe("rejects github.com URLs that do not name a repository", () => {
    it.each([
      ["the bare host", "https://github.com"],
      ["the bare host, scheme-less", "github.com"],
      ["a user profile with no repo", "https://github.com/owner"],
    ] as const)("%s", (_label, input) => {
      expect(parseRepoUrl(input)).toBeNull();
    });
  });

  describe("accepts a repository URL", () => {
    it("in its ordinary form", () => {
      expect(parseRepoUrl("https://github.com/owner/repo")).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("with a www host", () => {
      expect(parseRepoUrl("https://www.github.com/owner/repo")).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("with a .git suffix, which is stripped", () => {
      expect(parseRepoUrl("https://github.com/owner/repo.git")).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    // The form's own placeholder reads "github.com/yourname/project", so this
    // is the shape people actually type. It used to return null, which meant
    // CalIntelligence silently ignored the most common real input.
    it("without a scheme, which is what the form's placeholder invites", () => {
      expect(parseRepoUrl("github.com/owner/repo")).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("with surrounding whitespace", () => {
      expect(parseRepoUrl("  github.com/owner/repo  ")).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("ignoring anything past the repository segment", () => {
      expect(parseRepoUrl("https://github.com/owner/repo/tree/main/src")).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("ignoring a query string", () => {
      expect(parseRepoUrl("https://github.com/owner/repo?tab=readme")).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });
  });
});

/*
 * What the repository facts claim about tests and CI.
 *
 * Both fields used to be a guess made from the top-level directory listing,
 * and both were confidently wrong in ordinary cases. A `.github` directory
 * holding an issue template was reported as continuous integration, and any
 * project keeping its tests beside its source was reported as having none —
 * then the model repeated it as fact under "Backs up the essay". The whole
 * file list is one request, so there is no reason to guess.
 */
describe("summariseTree", () => {
  describe("continuous integration", () => {
    it("does not call an issue template CI", () => {
      const facts = summariseTree(
        [".github/ISSUE_TEMPLATE/bug.md", ".github/FUNDING.yml", ".github/PULL_REQUEST_TEMPLATE.md"],
        false,
      );

      expect(facts.workflowFiles).toEqual([]);
      expect(facts.otherCiFiles).toEqual([]);
    });

    it("names the workflows it found", () => {
      const facts = summariseTree(
        [".github/workflows/ci.yml", ".github/workflows/release.yaml", ".github/dependabot.yml"],
        false,
      );

      expect(facts.workflowFiles).toEqual([
        ".github/workflows/ci.yml",
        ".github/workflows/release.yaml",
      ]);
    });

    it("still finds CI that predates Actions", () => {
      expect(summariseTree([".travis.yml"], false).otherCiFiles).toEqual([".travis.yml"]);
      expect(summariseTree([".circleci/config.yml"], false).otherCiFiles).toEqual([
        ".circleci/config.yml",
      ]);
    });
  });

  describe("tests", () => {
    it("finds a nested suite the old top-level check missed", () => {
      expect(summariseTree(["src/__tests__/app.test.ts", "src/app.ts"], false).testFileCount).toBe(1);
    });

    it("finds Go test files, which live beside the source", () => {
      expect(summariseTree(["server/handler.go", "server/handler_test.go"], false).testFileCount).toBe(1);
    });

    it("finds a Maven layout", () => {
      expect(
        summariseTree(["src/main/java/App.java", "src/test/java/AppTest.java"], false).testFileCount,
      ).toBe(1);
    });

    it("finds pytest naming", () => {
      expect(summariseTree(["app.py", "test_app.py"], false).testFileCount).toBe(1);
    });

    it("reports none when there really are none", () => {
      const facts = summariseTree(["index.html", "style.css", "script.js"], false);
      expect(facts.testFileCount).toBe(0);
      expect(facts.testFileSamples).toEqual([]);
    });
  });

  it("carries GitHub's truncation flag through, so a count is read as a floor", () => {
    expect(summariseTree(["tests/a.py"], true).truncated).toBe(true);
  });

  describe("where the content is", () => {
    /*
     * A top-level listing says a `Sources` directory exists. It does not say
     * that `Sources/PyodideKit` is where all the code lives while `scripts`
     * holds one shell file, and that is the difference between naming a
     * project's parts and describing it.
     */
    it("weighs directories by size, not just by name", () => {
      const facts = summariseTree(
        [
          { path: "Sources/PyodideKit/Kernel.swift", bytes: 30_000 },
          { path: "Sources/PyodideKit/Bootstrap.swift", bytes: 10_000 },
          { path: "scripts/build.sh", bytes: 400 },
          { path: "README.md", bytes: 11_000 },
        ],
        false,
      );

      expect(facts.directories[0]).toEqual({ path: "Sources/PyodideKit", files: 2, bytes: 40_000 });
      expect(facts.directories[1]).toEqual({ path: "scripts", files: 1, bytes: 400 });
      expect(facts.totalBytes).toBe(51_400);
    });

    it("counts file types", () => {
      const facts = summariseTree(["a.swift", "b.swift", "c.ts", "Makefile"], false);
      expect(facts.extensions[0]).toEqual({ ext: "swift", files: 2 });
      expect(facts.extensions).toContainEqual({ ext: "(none)", files: 1 });
    });

    it("names the largest files, which is usually where the substance is", () => {
      const facts = summariseTree(
        [
          { path: "small.ts", bytes: 100 },
          { path: "big.ts", bytes: 90_000 },
        ],
        false,
      );
      expect(facts.largestFiles[0]).toEqual({ path: "big.ts", bytes: 90_000 });
    });

    // The old signature took plain paths and several call sites still read
    // more naturally that way.
    it("still accepts a plain list of paths", () => {
      expect(summariseTree(["tests/a.py"], false).testFileCount).toBe(1);
    });
  });

  it("picks out the dependency manifests it recognises", () => {
    expect(
      summariseTree(["package.json", "go.mod", "src/vendor/package.json"], false)
        .dependencyManifests,
    ).toEqual(["package.json", "go.mod"]);
  });
});
