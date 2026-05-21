"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "../actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-cream text-3xl font-extrabold mb-2">Welcome back</h1>
        <p className="text-cream/50 text-sm">Log in to feed your brain 🧠</p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-2xl">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-dark text-sm font-bold">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-xl border-2 border-dark/10 px-4 py-3 text-sm text-dark outline-none focus:border-banana transition placeholder:text-dark/25"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-dark text-sm font-bold">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-xl border-2 border-dark/10 px-4 py-3 text-sm text-dark outline-none focus:border-banana transition placeholder:text-dark/25"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-brain font-semibold bg-brain/10 rounded-xl px-4 py-3">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 bg-banana text-dark font-extrabold py-3 rounded-xl hover:bg-banana/90 transition disabled:opacity-50"
          >
            {pending ? "Logging in…" : "Log in 🍌"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-dark/50">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-extrabold text-dark underline hover:text-brain transition">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
