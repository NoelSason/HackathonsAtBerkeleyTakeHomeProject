import { describe, expect, it } from "vitest";
import { parseRepoUrl } from "@/lib/insights/github";

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
    // the reading aid silently ignored the most common real input.
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
