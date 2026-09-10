import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// .mts rather than .ts: this file is ESM, and the project has no
// "type": "module", so Vite would otherwise load it as CommonJS and warn.

/*
 * Two suites live under tests/.
 *
 * tests/lib runs pure functions with no network and no database. It is the
 * one that runs on every save.
 *
 * tests/rls signs in as the demo accounts and asserts what the row-level
 * security policies actually do, against the real project. It skips itself
 * when there are no credentials, so `npm test` is still green for somebody
 * who has just cloned the repository.
 */
export default defineConfig({
  resolve: {
    // The `@/` alias by hand rather than vite-tsconfig-paths. One line of
    // config is cheaper than a dependency that reads a file we control.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // The security suite makes real round trips to Supabase, and the default
    // five seconds is tight for a sign-in on a cold connection.
    testTimeout: 20_000,
  },
});
