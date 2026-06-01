"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import AvatarPicker from "@/components/avatar-picker";
import { createClient } from "@/utils/supabase/client";
import { saveAccountSettings, saveProfileSettings, type AccountSettingsState, type ProfileSettingsState } from "./actions";
import { LANGUAGES } from "@/app/(app)/start/constants";

type ProfileSettings = {
  id: string;
  display_name: string | null;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  twitter_handle: string | null;
  daily_goal: number;
  show_romanization: boolean;
  native_language: string | null;
};

type GoogleIdentity = {
  id?: string;
  identity_id?: string;
  provider?: string;
  user_id?: string;
  identity_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_RE = /^[a-z0-9._]{3,24}$/;

type SettingsLabels = Record<string, string>;

export default function SettingsForm({
  labels,
  profile,
  email,
  googleIdentity,
}: {
  labels: SettingsLabels;
  profile: ProfileSettings;
  email: string;
  googleIdentity: GoogleIdentity | null;
}) {
  const [profileState, profileAction, profilePending] = useActionState<ProfileSettingsState, FormData>(
    saveProfileSettings,
    null,
  );
  const [accountState, accountAction, accountPending] = useActionState<AccountSettingsState, FormData>(
    saveAccountSettings,
    null,
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [username, setUsername] = useState(profile.username);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [dailyGoal, setDailyGoal] = useState(profile.daily_goal);
  const [identityPending, setIdentityPending] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const usernameHelp = useMemo(() => {
    if (username === profile.username) return labels.usernameCurrentHelp;
    if (usernameStatus === "checking") return labels.usernameChecking;
    if (usernameStatus === "available") return labels.usernameAvailable;
    if (usernameStatus === "taken") return labels.usernameTaken;
    if (usernameStatus === "invalid") return labels.usernameInvalid;
    return labels.usernameInvalid;
  }, [profile.username, username, usernameStatus, labels]);

  useEffect(() => {
    const nextUsername = username.trim().toLowerCase();
    if (nextUsername === profile.username) {
      setUsernameStatus("idle");
      return;
    }
    if (!USERNAME_RE.test(nextUsername)) {
      setUsernameStatus("invalid");
      return;
    }

    let cancelled = false;
    setUsernameStatus("checking");

    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", nextUsername)
        .neq("id", profile.id)
        .maybeSingle();

      if (cancelled) return;
      setUsernameStatus(error ? "idle" : data ? "taken" : "available");
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [profile.id, profile.username, username]);

  async function connectGoogle() {
    setIdentityPending(true);
    setIdentityError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      },
    });
    if (error) {
      setIdentityError(error.message);
      setIdentityPending(false);
    }
  }

  async function disconnectGoogle() {
    if (!googleIdentity) return;
    setIdentityPending(true);
    setIdentityError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.unlinkIdentity(
      googleIdentity as Parameters<typeof supabase.auth.unlinkIdentity>[0],
    );
    if (error) {
      setIdentityError(error.message);
      setIdentityPending(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{labels.accountCenter}</p>
          <h1 className="mt-2 font-fredoka text-4xl font-[700] tracking-tight text-ink">{labels.title}</h1>
        </div>
        <a
          href="/billing"
          className="flex items-center gap-2 rounded-full border-2 border-ink/20 px-4 py-2 font-manrope text-sm font-[700] text-ink-2 transition hover:border-ink/40 hover:text-ink"
        >
          💳 {labels.billingLink}
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form action={profileAction} className="space-y-6">
          {(profileState?.error || profileState?.success) && (
            <StatusMessage state={profileState} />
          )}

          <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
            <SectionHeader eyebrow="01" title={labels.profileSection} />
            <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label={labels.displayName} htmlFor="display_name">
                <input
                  id="display_name"
                  name="display_name"
                  defaultValue={profile.display_name ?? ""}
                  required
                  className={inputClassName}
                />
              </Field>

              <Field label={labels.username} htmlFor="username" help={usernameHelp} tone={usernameStatus}>
                <input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  required
                  className={inputClassName}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label={labels.bio} htmlFor="bio" help={labels.bioHelp}>
                  <textarea
                    id="bio"
                    name="bio"
                    defaultValue={profile.bio ?? ""}
                    maxLength={160}
                    rows={3}
                    className={`${inputClassName} resize-none`}
                  />
                </Field>
              </div>

              <Field label={labels.websiteUrl} htmlFor="website_url">
                <input
                  id="website_url"
                  name="website_url"
                  defaultValue={profile.website_url ?? ""}
                  placeholder="https://example.com"
                  className={inputClassName}
                />
              </Field>

              <Field label={labels.twitterHandle} htmlFor="twitter_handle">
                <input
                  id="twitter_handle"
                  name="twitter_handle"
                  defaultValue={profile.twitter_handle ?? ""}
                  placeholder="@brainana"
                  className={inputClassName}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label={labels.motherTongue} htmlFor="native_language">
                  <select
                    id="native_language"
                    name="native_language"
                    defaultValue={profile.native_language ?? ""}
                    className={inputClassName}
                  >
                    <option value="">{labels.notSet}</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-paper p-5 shadow-hard-sm">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-2">{labels.avatarUpload}</p>
              <AvatarPicker userId={profile.id} value={avatarUrl} onChange={setAvatarUrl} />
            </div>
          </section>

          <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
            <SectionHeader eyebrow="02" title={labels.studyPreferences} />
            <div className="mt-6 space-y-6">
              <div className="rounded-lg bg-paper p-5 shadow-hard-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="daily_goal" className="font-manrope text-sm font-[800] text-ink">
                    {labels.dailyGoal}
                  </label>
                  <span className="rounded-full bg-yellow-soft px-3 py-1 font-mono text-xs font-[700] text-ink">
                    {labels.cardsPerDay?.replace("{count}", String(dailyGoal))}
                  </span>
                </div>
                <input
                  id="daily_goal"
                  name="daily_goal"
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={dailyGoal}
                  onChange={(event) => setDailyGoal(Number(event.target.value))}
                  className="mt-5 w-full accent-orange"
                />
                <div className="mt-2 flex justify-between font-mono text-xs uppercase tracking-widest text-ink-3">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-paper p-5 shadow-hard-sm">
                <span>
                  <span className="block font-manrope text-sm font-[800] text-ink">{labels.showRomanization}</span>
                  <span className="mt-1 block font-manrope text-xs text-ink-2">
                    {labels.romanizationHelp}
                  </span>
                </span>
                <input
                  type="checkbox"
                  name="show_romanization"
                  defaultChecked={profile.show_romanization}
                  className="peer sr-only"
                />
                <span className="relative h-8 w-14 shrink-0 rounded-full bg-ink/15 p-1 transition after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-paper-2 after:shadow-hard-sm after:transition peer-checked:bg-blue peer-checked:after:translate-x-6" />
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profilePending || usernameStatus === "taken" || usernameStatus === "invalid"}
              className="cursor-pointer rounded-full bg-orange px-7 py-3 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {profilePending ? labels.saving : labels.saveChanges}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
            <SectionHeader eyebrow="03" title={labels.accountSection} />
            {(accountState?.error || accountState?.success) && (
              <div className="mt-5">
                <StatusMessage state={accountState} />
              </div>
            )}

            <form action={accountAction} className="mt-6 space-y-4">
              <input type="hidden" name="intent" value="email" />
              <Field label={labels.changeEmail} htmlFor="email">
                <input id="email" name="email" type="email" defaultValue={email} className={inputClassName} />
              </Field>
              <button type="submit" disabled={accountPending} className={secondaryButtonClassName}>
                {labels.updateEmail}
              </button>
            </form>

            <div className="my-6 border-t border-ink/10" />

            <form action={accountAction} className="space-y-4">
              <input type="hidden" name="intent" value="password" />
              <Field label={labels.newPassword} htmlFor="password">
                <input id="password" name="password" type="password" autoComplete="new-password" className={inputClassName} />
              </Field>
              <Field label={labels.confirmPassword} htmlFor="confirm_password">
                <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" className={inputClassName} />
              </Field>
              <button type="submit" disabled={accountPending} className={secondaryButtonClassName}>
                {labels.changePassword}
              </button>
            </form>
          </section>

          <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
            <SectionHeader eyebrow="04" title={labels.connectedAccounts} />
            <div className="mt-6 rounded-lg bg-paper p-5 shadow-hard-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-manrope text-sm font-[800] text-ink">{labels.googleProvider}</p>
                  <p className="mt-1 font-manrope text-xs text-ink-2">
                    {googleIdentity ? labels.connected : labels.notConnected}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={googleIdentity ? disconnectGoogle : connectGoogle}
                  disabled={identityPending}
                  className={googleIdentity ? dangerButtonClassName : secondaryButtonClassName}
                >
                  {identityPending ? labels.working : googleIdentity ? labels.disconnect : labels.connect}
                </button>
              </div>
              {identityError && (
                <p className="mt-3 font-manrope text-xs font-[700] text-orange-text">{identityError}</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const inputClassName =
  "mt-2 w-full rounded-md bg-paper px-4 py-3 font-manrope text-sm font-[700] text-ink outline-none placeholder:text-ink-3 shadow-hard-sm focus:ring-2 focus:ring-ink";

const secondaryButtonClassName =
  "cursor-pointer rounded-full bg-blue px-4 py-2.5 font-manrope text-xs font-[800] text-ocean shadow-hard-sm transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50";

const dangerButtonClassName =
  "cursor-pointer rounded-full bg-red-soft px-4 py-2.5 font-manrope text-xs font-[800] text-ink shadow-hard-sm transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50";

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{eyebrow}</p>
      <h2 className="mt-1 font-fredoka text-2xl font-[700] tracking-tight text-ink">{title}</h2>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  help,
  tone,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  tone?: UsernameStatus;
  children: React.ReactNode;
}) {
  const helpClassName =
    tone === "available"
      ? "text-blue-text"
      : tone === "taken" || tone === "invalid"
        ? "text-orange-text"
        : "text-ink-3";

  return (
    <div>
      <label htmlFor={htmlFor} className="font-mono text-xs uppercase tracking-widest text-ink-2">
        {label}
      </label>
      {children}
      {help && <p className={`mt-2 font-manrope text-xs font-[700] ${helpClassName}`}>{help}</p>}
    </div>
  );
}

function StatusMessage({ state }: { state: { error?: string; success?: string } }) {
  return (
    <div
      role="status"
      className={`rounded-md px-5 py-3 font-manrope text-sm font-[800] ${
        state.error ? "bg-red-soft text-ink" : "bg-green-soft text-ink"
      }`}
    >
      {state.error ?? state.success}
    </div>
  );
}
