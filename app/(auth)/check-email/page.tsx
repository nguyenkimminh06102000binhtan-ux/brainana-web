import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
        <div className="text-6xl mb-6">📬</div>
        <h1 className="text-dark text-2xl font-extrabold mb-3">Check your inbox</h1>
        <p className="text-dark/55 text-sm leading-relaxed">
          We sent you a confirmation link. Click it to activate your account,
          then come back to start learning.
        </p>

        <div className="bg-banana/10 border border-banana/20 rounded-2xl px-4 py-3 mt-6 text-left">
          <p className="text-dark text-xs font-bold mb-1">Didn&apos;t get it?</p>
          <p className="text-dark/50 text-xs">Check your spam folder, or try signing up again with the same email.</p>
        </div>

        <div className="h-px bg-dark/10 my-6" />

        <Link
          href="/login"
          className="text-dark font-extrabold text-sm underline hover:text-brain transition"
        >
          ← Back to log in
        </Link>
      </div>
    </div>
  );
}
