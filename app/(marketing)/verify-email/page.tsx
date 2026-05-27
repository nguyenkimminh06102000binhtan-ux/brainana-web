import Link from "next/link";
import { resendVerificationEmail } from "../actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; resent?: string; error?: string }>;
}) {
  const { email, resent, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-3 text-2xl font-semibold">Check your inbox</h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          We sent a confirmation link to your email. Click it to activate your
          account.
        </p>

        {resent === "1" && (
          <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
            Verification email resent.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {email ? (
          <form action={resendVerificationEmail} className="mt-6">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Resend email
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <Link
              href="/signup"
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Back to sign up
            </Link>
          </div>
        )}

        <div className="my-6 h-px bg-zinc-200 dark:bg-zinc-800" />

        <Link href="/login" className="text-sm font-medium underline-offset-4 hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
