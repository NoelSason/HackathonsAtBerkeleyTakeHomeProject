"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp } from "@/app/(auth)/actions";
import { EMPTY_AUTH_STATE } from "@/lib/auth-form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, EMPTY_AUTH_STATE);

  // Hidden until asked for. Almost everyone creating an account here is an
  // applicant, and a field labelled "organizer code" on the default view
  // invites people to go looking for one.
  const [showOrganizerCode, setShowOrganizerCode] = useState(false);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Create an account</h1>
      <p className="mt-2 text-muted">One account covers every role you apply for.</p>

      <form action={formAction} className="mt-9 space-y-5">
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-[13px] font-semibold">
            Full name
          </label>
          <Input id="full_name" name="full_name" autoComplete="name" required />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold">
            Email
          </label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div>
          <label htmlFor="school" className="mb-1.5 block text-[13px] font-semibold">
            School <span className="font-normal text-faint">optional</span>
          </label>
          <Input id="school" name="school" autoComplete="organization" />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-help"
          />
          <p id="password-help" className="mt-1.5 text-[13px] text-muted">
            At least 8 characters.
          </p>
        </div>

        {showOrganizerCode ? (
          <div>
            <label htmlFor="organizer_code" className="mb-1.5 block text-[13px] font-semibold">
              Organizer code
            </label>
            <Input id="organizer_code" name="organizer_code" autoComplete="off" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowOrganizerCode(true)}
            className="text-[13px] font-medium text-berkeley hover:underline"
          >
            I have an organizer code
          </button>
        )}

        {state.error && (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {state.error}
          </p>
        )}

        {state.notice && (
          <p role="status" className="rounded-control bg-berkeley-soft px-3.5 py-2.5 text-[13px] text-berkeley">
            {state.notice}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="h-11 w-full">
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-7 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-berkeley hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
