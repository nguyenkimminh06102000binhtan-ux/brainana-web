import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 bg-dark flex flex-col">
      <header className="px-8 pt-8 shrink-0">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <span className="text-banana font-extrabold text-xl">Brainana</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
