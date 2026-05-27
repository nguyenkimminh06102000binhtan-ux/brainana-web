export default async function StudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Study</p>
        <h1 className="mt-3 font-fredoka text-4xl font-[600] leading-tight tracking-tight">
          Study {slug}
        </h1>
        <p className="mt-3 font-manrope text-sm leading-6 text-ink-2">
          Learning session placeholder.
        </p>
      </section>
    </div>
  );
}
