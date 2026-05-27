"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginWithEmail, signInWithGoogle } from "../actions";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
    </svg>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginWithEmail, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12 text-ink">
      <div className="w-full max-w-sm rounded-lg bg-paper-2 p-8 shadow-hard">
        <div className="mb-8 text-center">
          <Link href="/" className="font-fredoka text-3xl font-[600] tracking-tight">
            Brainana
          </Link>
          <p className="mt-2 font-manrope text-sm text-ink-2">
            Log in to continue.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email address"
              required
              autoComplete="email"
              className={`w-full rounded-md bg-paper px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow ${state?.error ? "border-red" : ""}`}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              className={`w-full rounded-md bg-paper px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow ${state?.error ? "border-red" : ""}`}
            />
          </div>

          {state?.error && (
            <p className="rounded-md border border-red bg-red-soft px-3 py-2 font-manrope text-sm text-ink">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 w-full rounded-full bg-orange px-5 py-3 font-manrope text-base font-[800] text-ink shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:opacity-70"
          >
            {pending ? "Logging in…" : "Login"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-[1.5px] flex-1 bg-ink" />
          <span className="font-mono text-xs uppercase tracking-widest text-ink-2">or</span>
          <div className="h-[1.5px] flex-1 bg-ink" />
        </div>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-full bg-paper px-5 py-3 font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-center font-manrope text-sm text-ink-2">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-[600] text-red underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
