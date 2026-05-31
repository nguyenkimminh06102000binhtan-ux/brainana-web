"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveNativeLanguage, saveOnboarding, type OnboardingState } from "./actions";
import { PURPOSES, DAILY_GOALS, INTERESTS, LANGUAGES } from "./constants";
import AvatarPicker from "@/components/avatar-picker";
import { t } from "@/utils/t";
import { Icon } from "@/components/ui-icons";

type StartLabels = {
  estimatedTime: string;
  title: string;
  languageTitle: string;
  languageIntro: string;
  motherTongue: string;
  motherTonguePlaceholder: string;
  chooseLanguageHelp: string;
  savingLanguage: string;
  next: string;
  name: string;
  namePlaceholder: string;
  avatar: string;
  whyHere: string;
  dailyGoal: string;
  cardsPerDay: string;
  topics: string;
  takeMeHome: string;
  saving: string;
  purposes: Record<string, string>;
};

export default function OnboardingForm({
  userId,
  initialNativeLanguage,
  initialLabels,
  initialCategories,
}: {
  userId: string;
  initialNativeLanguage: string | null;
  initialLabels: StartLabels;
  initialCategories: Record<string, string>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    saveOnboarding,
    null
  );
  const [labels, setLabels] = useState(initialLabels);
  const [categories, setCategories] = useState(initialCategories);
  const [step, setStep] = useState(initialNativeLanguage ? 2 : 1);
  const [nativeLanguage, setNativeLanguage] = useState(initialNativeLanguage ?? "");
  const nativeLanguageRef = useRef(initialNativeLanguage ?? "");
  const [nativeLanguageSaved, setNativeLanguageSaved] = useState(Boolean(initialNativeLanguage));
  const [nativeLanguageError, setNativeLanguageError] = useState<string | null>(null);
  const [savingNativeLanguage, startSavingNativeLanguage] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  function handleNativeLanguageChange(value: string) {
    setNativeLanguage(value);
    nativeLanguageRef.current = value;
    setNativeLanguageSaved(false);
    setNativeLanguageError(null);

    startSavingNativeLanguage(async () => {
      const result = await saveNativeLanguage(value);
      if (nativeLanguageRef.current !== value) return;
      setLabels(result.labels);
      setCategories(result.categories);
      setNativeLanguageError(result.error);
      setNativeLanguageSaved(!result.error && result.language === value);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <section className="rounded-[1.5rem] bg-paper-2 p-5 shadow-hard sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/home"
            className="flex items-center gap-3 font-fredoka text-2xl font-[700] tracking-tight"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-yellow text-2xl text-on-bright shadow-hard-sm">
              B
            </span>
            <span>
              <span className="text-orange-text">brainana</span>.app
            </span>
          </Link>
          <p className="rounded-full bg-paper px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm sm:text-sm">{labels.estimatedTime}</p>
        </div>

        <h1 className="mt-8 font-fredoka text-3xl font-[700] leading-tight tracking-tight sm:mt-10 sm:text-4xl">
          {labels.title}
        </h1>

        {step === 1 && (
          <div className="mt-8 space-y-5">
            <section className="rounded-[1.2rem] bg-paper p-5 shadow-hard-sm">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
                {labels.languageTitle}
              </p>
              <p className="mt-3 font-manrope text-sm text-ink-2">
                {labels.languageIntro}
              </p>
              <label
                htmlFor="native_language_step"
                className="mt-6 block font-mono text-xs uppercase tracking-widest text-ink-2"
              >
                {labels.motherTongue}
              </label>
              <select
                id="native_language_step"
                value={nativeLanguage}
                onChange={(event) => handleNativeLanguageChange(event.target.value)}
                className="mt-4 w-full rounded-[1rem] bg-paper-2 px-4 py-3.5 font-manrope text-base font-[700] text-ink outline-none focus:ring-2 focus:ring-ink"
              >
                <option value="" disabled>{labels.motherTonguePlaceholder}</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{categories[lang] ?? lang}</option>
                ))}
              </select>
              <p className="mt-3 font-manrope text-sm text-ink-2">
                {nativeLanguageError ?? labels.chooseLanguageHelp}
              </p>
            </section>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                disabled={!nativeLanguageSaved || savingNativeLanguage}
                onClick={() => setStep(2)}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:cursor-not-allowed disabled:bg-ink-3 disabled:text-on-ink disabled:shadow-none"
              >
                {savingNativeLanguage ? labels.savingLanguage : labels.next}
                {!savingNativeLanguage && <Icon name="arrowRight" className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
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
          <input type="hidden" name="native_language" value={nativeLanguage} />

          <section className="rounded-[1.2rem] bg-paper p-5 shadow-hard-sm">
            <label
              htmlFor="display_name"
              className="font-mono text-xs uppercase tracking-widest text-ink-2"
            >
              {labels.name}
            </label>
            <input
              id="display_name"
              name="display_name"
              required
              placeholder={labels.namePlaceholder}
              className="mt-4 w-full rounded-[1rem] bg-paper-2 px-4 py-3.5 font-manrope text-base font-[700] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
            />
          </section>

          <section className="rounded-[1.2rem] bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              {labels.avatar}
            </p>
            <div className="mt-4">
              <AvatarPicker userId={userId} value={avatarUrl} onChange={setAvatarUrl} />
            </div>
          </section>

          <section className="rounded-[1.2rem] bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              {labels.whyHere}
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
                  <span className="inline-flex min-h-10 items-center rounded-full bg-paper-2 px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm peer-checked:bg-yellow-soft">
                    {labels.purposes[p] ?? p}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-[1.2rem] bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              {labels.dailyGoal}
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
                  <span className="inline-flex min-h-10 items-center rounded-full bg-paper-2 px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm peer-checked:bg-blue peer-checked:text-ocean peer-checked:shadow-hard">
                    {t(labels.cardsPerDay, { count: goal })}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-[1.2rem] bg-paper p-5 shadow-hard-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
              {labels.topics}
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
                  <span className="inline-flex min-h-10 items-center rounded-full bg-paper-2 px-5 py-2 font-manrope text-sm font-[800] text-ink shadow-hard-sm peer-checked:bg-red-soft">
                    {categories[interest] ?? interest}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:opacity-60"
            >
              {pending ? labels.saving : labels.takeMeHome}
              {!pending && <Icon name="arrowRight" className="h-4 w-4" />}
            </button>
          </div>
        </form>
        )}
      </section>
    </div>
  );
}
