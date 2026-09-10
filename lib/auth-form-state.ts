/**
 * Shared shape for the sign-in and sign-up form results.
 *
 * This lives outside the actions file because a "use server" module may only
 * export async functions. A plain object exported from there fails the build,
 * since every export in such a file becomes a callable server endpoint.
 */
export type AuthState = {
  error: string | null;
  notice: string | null;
};

export const EMPTY_AUTH_STATE: AuthState = { error: null, notice: null };
