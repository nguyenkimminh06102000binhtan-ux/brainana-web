"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loginWithEmail, signInWithGoogle } from "../actions";
import { Icon } from "@/components/ui-icons";
import { BrandDomainWordmark, BrandLogo } from "@/components/brand-logo";
import { ThemeToggleFixed } from "../../theme-toggle";

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

function BrandPanel() {
  return (
    <section className="flex min-h-[560px] flex-col justify-between rounded-[1.5rem] bg-yellow-soft p-8 shadow-hard">
      <Link href="/" className="flex items-center gap-3 font-fredoka text-2xl font-[700] tracking-tight">
        <BrandLogo label={<BrandDomainWordmark />} />
      </Link>

      <div>
        <h2 className="font-fredoka text-5xl font-[700] leading-[0.98] tracking-tight sm:text-6xl">
          welcome back, <span className="text-orange-text">keep</span> your streak alive.
        </h2>
        <p className="mt-6 max-w-xl font-manrope text-lg leading-8 text-ink-2">
          Your courses, saved mems, and next review are ready when you are.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-5">
        {[
          { eyebrow: "[ korean ]", title: "Korean", accent: "bg-green-soft" },
          { eyebrow: "[ GRE ]", title: "GRE Vocab", accent: "bg-red-soft" },
        ].map((card) => (
          <article key={card.title} className="w-40 overflow-hidden rounded-[1rem] bg-paper-2 shadow-hard-sm">
            <div className={`${card.accent} border-b border-ink px-4 py-5`}>
              <p className="font-mono text-xs font-[700] uppercase tracking-widest text-ink-2">
                {card.eyebrow}
              </p>
            </div>
            <div className="p-4">
              <h2 className="font-fredoka text-xl font-[700] tracking-tight">{card.title}</h2>
            </div>
          </article>
        ))}
        <p className="font-manrope text-sm font-[800] text-ink-2">480k learners and counting</p>
      </div>
    </section>
  );
}

function getEmailError(email: string) {
  if (!email) return "Email is required.";
  if (!email.includes("@")) return "Email needs an @ sign.";

  const [localPart, domain] = email.split("@");
  if (!localPart) return "Email needs a name before @.";
  if (!domain) return "Email needs a domain after @.";
  if (!domain.includes(".")) return "Email domain needs a dot, like hello.io.";
  if (domain.endsWith(".")) return "Email domain cannot end with a dot.";

  return "";
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginWithEmail, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError = useMemo(() => getEmailError(email), [email]);
  const canSubmit = !emailError && password.length > 0 && !pending;

  useEffect(() => {
    if (!state?.error) return;
    const id = window.setTimeout(() => setPassword(""), 0);
    return () => window.clearTimeout(id);
  }, [state]);

  return (
    <main className="min-h-screen bg-paper px-4 py-5 text-ink sm:px-6 sm:py-8">
      <ThemeToggleFixed />
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="hidden lg:block"><BrandPanel /></div>

        <div className="flex items-center justify-center rounded-[1.5rem] bg-paper-2 p-5 shadow-hard sm:p-8">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 flex items-center gap-3 font-fredoka text-2xl font-[700] tracking-tight lg:hidden">
              <BrandLogo />
            </Link>
            <div className="mb-8">
              <h1 className="font-fredoka text-3xl font-[700] tracking-tight sm:text-5xl">Hey, welcome back</h1>
              <p className="mt-2 font-manrope text-sm font-[800] text-ink-2">
                Log in to continue your streak, or{" "}
                <Link href="/signup" className="text-orange-text">
                  create an account
                </Link>
              </p>
            </div>

            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-paper px-5 py-4 font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-[1.5px] flex-1 bg-ink" />
              <span className="font-mono text-xs uppercase tracking-widest text-ink-2">or with email</span>
              <div className="h-[1.5px] flex-1 bg-ink" />
            </div>

            <form action={formAction} className="flex flex-col gap-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="sam@hello.io"
                  required
                  value={email}
                  onBlur={() => setEmailTouched(true)}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (!emailTouched) setEmailTouched(true);
                  }}
                  autoComplete="email"
                  className={`w-full rounded-[1rem] bg-paper px-4 py-3.5 font-manrope text-base text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink ${state?.error ? "border-red" : ""}`}
                />
                {emailTouched && emailError && (
                  <p className="mt-2 font-manrope text-sm font-[700] text-orange-text">{emailError}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-ink-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="********"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className={`w-full rounded-[1rem] bg-paper px-4 py-3.5 font-manrope text-base text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink ${state?.error ? "border-red" : ""}`}
                />
              </div>

              {state?.error && (
                <p className="rounded-md border border-red bg-red-soft px-3 py-2 font-manrope text-sm text-ink">
                  {state.error}
                </p>
              )}

              <div className="flex justify-end font-manrope text-sm font-[800] text-ink-2">
                <Link href="/login" className="text-orange-text">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-1 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-4 font-manrope text-base font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:cursor-not-allowed disabled:bg-ink-3 disabled:text-on-ink disabled:shadow-none"
              >
                {pending ? "Logging in..." : "Log in"}
                {!pending && <Icon name="arrowRight" className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
