import Link from "next/link";
import { resendVerificationEmail } from "../actions";
import { Icon } from "@/components/ui-icons";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggleFixed } from "../../theme-toggle";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; resent?: string; error?: string }>;
}) {
  const { email, resent, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12 text-ink sm:px-6">
      <ThemeToggleFixed />
      <div className="w-full max-w-md rounded-[1.5rem] bg-paper-2 p-6 text-center shadow-hard sm:p-8">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-3 font-fredoka text-2xl font-[700] tracking-tight">
          <BrandLogo />
        </Link>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-blue-text shadow-hard-sm">
          <Icon name="check" className="h-7 w-7" />
        </div>
        <h1 className="mb-3 font-fredoka text-3xl font-[600] leading-tight tracking-tight">Check your inbox</h1>
        <p className="font-manrope text-sm leading-6 text-ink-2">
          We sent a confirmation link to your email. Click it to activate your
          account.
        </p>

        {resent === "1" && (
          <p className="mt-4 rounded-md border border-green bg-green-soft px-3 py-2 font-manrope text-sm text-ink">
            Verification email resent.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-red bg-red-soft px-3 py-2 font-manrope text-sm text-ink">
            {error}
          </p>
        )}

        {email ? (
          <form action={resendVerificationEmail} className="mt-6">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-yellow px-5 py-3 font-manrope text-base font-[800] text-on-bright shadow-hard transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Resend email <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <Link
              href="/signup"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-paper px-5 py-3 text-center font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
            >
              Back to sign up <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        )}

        <div className="my-6 h-[1.5px] bg-ink" />

        <Link href="/login" className="font-manrope text-sm font-[600] text-red underline-offset-4 hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
