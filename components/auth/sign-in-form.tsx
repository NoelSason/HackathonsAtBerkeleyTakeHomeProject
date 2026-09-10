"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "@/app/(auth)/actions";
import { EMPTY_AUTH_STATE } from "@/lib/auth-form-state";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(signIn, EMPTY_AUTH_STATE);

  // Controlled so the demo buttons can fill the fields. Two pieces of state
  // is cheaper than a ref dance, and the form is two inputs long.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Sign in</h1>
      <p className="mt-2 text-muted">Applicants and organizers use the same door.</p>

      <form action={formAction} className="mt-9 space-y-5">
        <input type="hidden" name="next" value={next} />

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {state.error && (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="h-11 w-full">
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3.5">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[11px] tracking-[0.08em] text-faint">DEMO ACCOUNTS</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <ul className="space-y-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(DEMO_PASSWORD);
              }}
              className="flex w-full items-center justify-between rounded-control border border-line bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-sunken"
            >
              <span>
                <span className="block text-sm font-semibold">{account.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                  {account.description}
                </span>
              </span>
              {/* The whole address, not a shortened one. These are printed so
                  somebody can type them in, and "hacker@demo" is not an account
                  that exists. */}
              <span className="ml-3 shrink-0 font-mono text-[11px] text-faint">
                {account.email}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-7 text-center text-[13px] text-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-semibold text-berkeley hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
