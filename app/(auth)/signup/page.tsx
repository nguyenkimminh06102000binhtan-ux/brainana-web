"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "../actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, null);

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-cream text-3xl font-extrabold mb-2">Create your account</h1>
        <p className="text-cream/50 text-sm">The zombie is waiting 🧟</p>
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
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
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
            {pending ? "Creating account…" : "Sign up free 🧠"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-dark/35 leading-relaxed">
          By signing up you agree to our{" "}
          <Link href="#" className="underline hover:text-dark transition">Terms</Link>
          {" "}and{" "}
          <Link href="#" className="underline hover:text-dark transition">Privacy Policy</Link>.
        </p>

        <div className="h-px bg-dark/10 my-5" />

        <p className="text-center text-sm text-dark/50">
          Already have an account?{" "}
          <Link href="/login" className="font-extrabold text-dark underline hover:text-brain transition">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
