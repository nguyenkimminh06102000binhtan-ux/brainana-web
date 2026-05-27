export const metadata = {
  title: "Cookie Policy - Brainana",
  description: "How Brainana uses cookies.",
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Legal</p>
        <h1 className="mt-3 font-fredoka text-5xl font-[600] leading-tight tracking-tight">
          Cookie Policy
        </h1>
        <p className="mt-6 font-manrope leading-7 text-ink-2">
          Brainana uses necessary cookies for authentication and product functionality.
          Preference cookies may store settings such as theme selection.
        </p>
      </section>
    </main>
  );
}
