import Link from "next/link";
import { resendVerificationEmail } from "../actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; resent?: string; error?: string }>;
}) {
  const { email, resent, error } = await searchParams;

  return (
    <main className="font-nunito min-h-screen bg-dark flex items-center justify-center px-6 py-12">
      <div className="bg-cream rounded-2xl p-8 md:p-10 w-full max-w-md text-center">

        {/* Icon */}
        <div className="text-6xl mb-6">📬</div>

        {/* Headline */}
        <h1 className="text-dark text-2xl font-extrabold mb-3">Check your inbox</h1>
        <p className="text-dark/55 text-sm leading-relaxed">
          We sent a confirmation link to your email. Click it to activate your
          account and start feeding your brain.
        </p>

        {/* Feedback */}
        {resent === "1" && (
          <p className="mt-4 text-zombie text-sm font-bold bg-zombie/10 rounded-xl px-4 py-3">
            ✓ Verification email resent!
          </p>
        )}
        {error && (
          <p className="mt-4 text-brain text-sm font-semibold bg-brain/10 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Resend button */}
        {email ? (
          <form action={resendVerificationEmail} className="mt-6">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="w-full border-2 border-dark/20 text-dark font-bold py-3 rounded-full hover:bg-dark/5 transition text-sm"
            >
              Resend email
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <Link
              href="/signup"
              className="block w-full border-2 border-dark/20 text-dark font-bold py-3 rounded-full hover:bg-dark/5 transition text-sm text-center"
            >
              Back to sign up
            </Link>
          </div>
        )}

        <div className="h-px bg-dark/10 my-6" />

        <Link href="/login" className="text-brain font-bold text-sm hover:underline">
          ← Back to login
        </Link>

      </div>
    </main>
  );
}
