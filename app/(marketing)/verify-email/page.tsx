import Link from "next/link";
import { resendVerificationEmail } from "../actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; resent?: string; error?: string }>;
}) {
  const { email, resent, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12 text-ink">
      <div className="w-full max-w-sm rounded-lg bg-paper-2 p-8 text-center shadow-hard">
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
              className="w-full rounded-full bg-yellow px-5 py-3 font-manrope text-base font-[800] text-on-bright shadow-hard transition active:translate-y-[2px] active:shadow-hard-sm"
            >
              Resend email
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <Link
              href="/signup"
              className="block w-full rounded-full bg-paper px-5 py-3 text-center font-manrope text-base font-[800] text-ink shadow-hard-sm transition active:translate-y-[2px] active:shadow-none"
            >
              Back to sign up
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
