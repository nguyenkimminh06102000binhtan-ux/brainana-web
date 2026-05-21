"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupWithEmail, signInWithGoogle } from "../actions";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupWithEmail, null);

  return (
    <main className="font-nunito min-h-screen bg-dark flex items-center justify-center px-6 py-12">
      <div className="bg-cream rounded-2xl p-8 md:p-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🧠</span>
          <h1 className="text-banana font-extrabold text-2xl mt-2">Brainana</h1>
          <p className="text-dark/55 text-sm mt-1">Create your account, future zombie scholar</p>
        </div>

        {/* Signup form */}
        <form action={formAction} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            placeholder="Email address"
            required
            autoComplete="email"
            className="rounded-xl border border-dark/20 px-4 py-3 w-full bg-white text-dark text-sm focus:outline-none focus:ring-2 focus:ring-banana placeholder:text-dark/35"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-xl border border-dark/20 px-4 py-3 w-full bg-white text-dark text-sm focus:outline-none focus:ring-2 focus:ring-banana placeholder:text-dark/35"
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm password"
            required
            autoComplete="new-password"
            className="rounded-xl border border-dark/20 px-4 py-3 w-full bg-white text-dark text-sm focus:outline-none focus:ring-2 focus:ring-banana placeholder:text-dark/35"
          />

          {state?.error && (
            <p className="text-brain text-sm font-semibold bg-brain/10 rounded-xl px-4 py-3">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-banana text-dark font-extrabold py-3 rounded-full hover:bg-banana/90 transition disabled:opacity-50 mt-1"
          >
            {pending ? "Creating account…" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-dark/15" />
          <span className="text-dark/40 text-sm font-medium">or</span>
          <div className="flex-1 h-px bg-dark/15" />
        </div>

        {/* Google */}
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex items-center justify-center gap-3 w-full border-2 border-dark/20 text-dark font-bold py-3 rounded-full hover:bg-dark/5 transition text-sm"
          >
            <GoogleIcon />
            Sign up with Google
          </button>
        </form>

        {/* Terms note */}
        <p className="text-center text-xs text-dark/35 mt-4 leading-relaxed">
          By signing up you agree to our{" "}
          <Link href="/terms" className="underline hover:text-dark transition">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-dark transition">Privacy Policy</Link>.
        </p>

        <div className="h-px bg-dark/10 my-5" />

        {/* Switch link */}
        <p className="text-center text-sm text-dark/55">
          Already have an account?{" "}
          <Link href="/login" className="text-brain font-bold hover:underline">
            Login
          </Link>
        </p>

      </div>
    </main>
  );
}
