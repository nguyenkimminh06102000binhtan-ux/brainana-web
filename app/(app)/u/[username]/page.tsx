export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Profile</p>
        <h1 className="mt-3 font-fredoka text-4xl font-[600] leading-tight tracking-tight">
          @{username}
        </h1>
        <p className="mt-3 font-manrope text-sm leading-6 text-ink-2">
          Public profile and learning progress placeholder.
        </p>
      </section>
    </div>
  );
}
