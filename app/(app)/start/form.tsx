"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveOnboarding, type OnboardingState } from "./actions";
import { PURPOSES, DAILY_GOALS, INTERESTS } from "./constants";
import AvatarPicker from "@/components/avatar-picker";

export default function OnboardingForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    saveOnboarding,
    null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/home"
            className="flex items-center gap-3 font-fredoka text-2xl font-[700] tracking-tight"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-yellow text-2xl text-ink shadow-hard-sm">
              B
            </span>
            <span>
              <span className="text-orange">brainana</span>.app
            </span>
          </Link>
          <p className="font-manrope text-sm font-[800] text-ink-2">~60 sec · all on one page</p>
        </div>

        <h1 className="mt-10 font-fredoka text-4xl font-[700] leading-tight tracking-tight">
          Let&apos;s set up your brain.
        </h1>

        <form action={action} className="mt-8 space-y-5">
          {state?.error && (
            <div
              role="alert"
              className="rounded-md bg-red-soft px-5 py-3 font-manrope text-sm font-[800] text-ink"
            >
              {state.error}
            </div>
          )}

          <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />

          <section className="rounded-lg bg-paper p-5 shadow-hard-sm">
            <label
              htmlFor="display_name"
              className="font-mono text-xs uppercase tracking-widest text-ink-2"
            >
              01 · Your name
            </label>
            <input
              id="display_name"
              name="display_name"
              required
              placeholder="type your name..."
              className="mt-4 w-full rounded-md bg-paper-2 px-4 py-3 font-manrope text-base font-[700] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow"
            />
          </section>

          <section className="rounded-lg bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              02 · Your avatar
            </p>
            <div className="mt-4">
              <AvatarPicker userId={userId} value={avatarUrl} onChange={setAvatarUrl} />
            </div>
          </section>

          <section className="rounded-lg bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              03 · Why are you here?
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {PURPOSES.map((p) => (
                <label key={p} className="cursor-pointer">
                  <input
                    type="radio"
                    name="purpose"
                    value={p}
                    required
                    defaultChecked={p === "Hobby"}
                    className="peer sr-only"
                  />
                  <span className="inline-flex rounded-full bg-paper-2 px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm peer-checked:bg-yellow-soft">
                    {p}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              04 · Daily goal
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {DAILY_GOALS.map((goal) => (
                <label key={goal} className="cursor-pointer">
                  <input
                    type="radio"
                    name="daily_goal"
                    value={goal}
                    required
                    defaultChecked={goal === 10}
                    className="peer sr-only"
                  />
                  <span className="inline-flex rounded-full bg-paper-2 px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm peer-checked:bg-blue peer-checked:text-ocean peer-checked:shadow-hard">
                    {goal} cards/day
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              05 · Topics (pick any)
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {INTERESTS.map((interest) => (
                <label key={interest} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="interests"
                    value={interest}
                    defaultChecked={["Languages", "Science", "Trivia"].includes(interest)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex rounded-full bg-paper-2 px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm peer-checked:bg-red-soft">
                    {interest}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:opacity-60"
            >
              {pending ? "Saving…" : "Take me home →"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
