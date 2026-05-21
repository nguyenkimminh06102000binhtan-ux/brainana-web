import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <nav className="sticky top-0 z-50 bg-dark border-b border-cream/10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-banana font-extrabold text-xl tracking-tight">Brainana</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-cream/60 hover:text-cream text-sm font-semibold transition">
              Features
            </Link>
            <Link href="#pricing" className="text-cream/60 hover:text-cream text-sm font-semibold transition">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-cream/60 hover:text-cream text-sm font-semibold transition">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-banana text-dark font-extrabold text-sm px-5 py-2.5 rounded-full hover:bg-banana/90 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="bg-dark border-t border-cream/10">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🧠</span>
                <span className="text-banana font-extrabold text-xl">Brainana</span>
              </Link>
              <p className="text-cream/40 text-sm leading-relaxed">
                Feed your brain. One lesson at a time.
              </p>
            </div>
            <div>
              <p className="text-cream font-extrabold text-sm mb-4">Product</p>
              <ul className="space-y-2.5 text-sm text-cream/40">
                <li><Link href="#features" className="hover:text-cream transition">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-cream transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-cream transition">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-cream font-extrabold text-sm mb-4">Company</p>
              <ul className="space-y-2.5 text-sm text-cream/40">
                <li><Link href="#" className="hover:text-cream transition">About</Link></li>
                <li><Link href="#" className="hover:text-cream transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-cream transition">Careers</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-cream font-extrabold text-sm mb-4">Legal</p>
              <ul className="space-y-2.5 text-sm text-cream/40">
                <li><Link href="#" className="hover:text-cream transition">Privacy</Link></li>
                <li><Link href="#" className="hover:text-cream transition">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-cream/10 pt-8">
            <p className="text-cream/30 text-sm">© 2025 Brainana. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
