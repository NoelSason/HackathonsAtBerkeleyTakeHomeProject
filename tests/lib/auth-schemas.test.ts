import { describe, expect, it } from "vitest";
import { readSignIn, readSignUp } from "@/lib/auth-schemas";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

const COMPLETE = {
  full_name: "Noel Sason",
  email: "noel@example.com",
  password: "a-long-enough-password",
};

describe("readSignUp", () => {
  /*
   * The regression this file exists for.
   *
   * The organizer code input is only rendered after somebody clicks "I have
   * an organizer code", so on the ordinary path it is not in the submitted
   * form at all. FormData.get returns null for that, Zod's .optional()
   * accepts undefined but not null, and sign-up failed for every applicant
   * with "Invalid input: expected string, received null".
   *
   * It survived being clicked through because opening the disclosure to try a
   * code makes the input exist and submit an empty string, which parses fine.
   * Testing the unusual path is what hid it.
   */
  it("accepts a sign-up with no organizer code field in the form at all", () => {
    const parsed = readSignUp(form(COMPLETE));

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.organizer_code).toBeUndefined();
  });

  it("accepts one where the field exists but is empty", () => {
    const parsed = readSignUp(form({ ...COMPLETE, organizer_code: "", school: "" }));
    expect(parsed.success).toBe(true);
  });

  it("keeps an organizer code that was actually typed", () => {
    const parsed = readSignUp(form({ ...COMPLETE, organizer_code: "  a-code  " }));

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.organizer_code).toBe("a-code");
  });

  it("accepts a missing school, which is genuinely optional", () => {
    expect(readSignUp(form(COMPLETE)).success).toBe(true);
  });

  describe("still rejects what it should", () => {
    it("a missing name", () => {
      const rest = { ...COMPLETE };
      delete (rest as Partial<typeof COMPLETE>).full_name;
      expect(readSignUp(form(rest)).success).toBe(false);
    });

    it("a name that is only whitespace", () => {
      expect(readSignUp(form({ ...COMPLETE, full_name: "   " })).success).toBe(false);
    });

    it("something that is not an email", () => {
      expect(readSignUp(form({ ...COMPLETE, email: "noel" })).success).toBe(false);
    });

    it("a password under eight characters", () => {
      expect(readSignUp(form({ ...COMPLETE, password: "short" })).success).toBe(false);
    });
  });
});

describe("readSignIn", () => {
  it("accepts an email and password", () => {
    expect(readSignIn(form({ email: "noel@example.com", password: "x" })).success).toBe(true);
  });

  it("rejects an empty submission rather than asking the server", () => {
    expect(readSignIn(new FormData()).success).toBe(false);
  });

  it("rejects a blank password", () => {
    expect(readSignIn(form({ email: "noel@example.com", password: "" })).success).toBe(false);
  });
});
