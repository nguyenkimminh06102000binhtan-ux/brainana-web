import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Brainana",
  description: "How Brainana collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="font-nunito flex flex-col min-h-screen">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-dark border-b border-cream/10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-banana font-extrabold text-xl tracking-tight">Brainana</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="border-2 border-cream/30 text-cream font-bold text-sm px-6 py-2.5 rounded-full hover:border-cream transition">
              Log in
            </Link>
            <Link href="/signup" className="bg-banana text-dark font-extrabold text-sm px-6 py-2.5 rounded-full hover:bg-banana/90 transition">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-dark py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-banana text-sm font-bold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-cream text-4xl md:text-5xl font-extrabold mb-4">Privacy Policy</h1>
          <p className="text-cream/50 text-sm">Last updated: May 21, 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-cream flex-1 py-16 px-6">
        <div className="mx-auto max-w-3xl space-y-12 text-dark">

          {/* Intro */}
          <div>
            <p className="text-dark/70 text-base leading-relaxed">
              Brainana (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
              you use our web application and services (collectively, the &ldquo;Service&rdquo;). Please read this
              policy carefully. If you disagree with its terms, please discontinue use of the Service.
            </p>
          </div>

          <Divider />

          {/* 1 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">1. Information We Collect</h2>

            <h3 className="text-dark text-lg font-bold mb-2">1.1 Information You Provide</h3>
            <p className="text-dark/70 leading-relaxed mb-4">
              When you create an account or use the Service, we may collect:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed mb-6">
              <li><strong className="text-dark font-semibold">Account information</strong> — your email address and password when you register directly, or your name and email address when you register via a third-party provider such as Google.</li>
              <li><strong className="text-dark font-semibold">Profile information</strong> — any additional details you choose to add to your profile, such as a display name or avatar.</li>
              <li><strong className="text-dark font-semibold">User-generated content</strong> — flashcard decks, courses, and other learning materials you create or upload.</li>
              <li><strong className="text-dark font-semibold">Payment information</strong> — if you subscribe to Brainana Pro, payment details are processed by our third-party payment processor (Stripe). We do not store full card numbers on our servers.</li>
              <li><strong className="text-dark font-semibold">Communications</strong> — messages you send us via support channels or feedback forms.</li>
            </ul>

            <h3 className="text-dark text-lg font-bold mb-2">1.2 Information Collected Automatically</h3>
            <p className="text-dark/70 leading-relaxed mb-4">
              When you access the Service, we automatically collect certain technical data:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed">
              <li><strong className="text-dark font-semibold">Usage data</strong> — pages visited, features used, session duration, study streaks, and lesson completion rates.</li>
              <li><strong className="text-dark font-semibold">Device information</strong> — browser type, operating system, IP address, and device identifiers.</li>
              <li><strong className="text-dark font-semibold">Cookies and similar technologies</strong> — session tokens and preference cookies necessary for authentication and core functionality. See Section 7 for details.</li>
            </ul>
          </div>

          <Divider />

          {/* 2 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">2. How We Use Your Information</h2>
            <p className="text-dark/70 leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed">
              <li>Create and manage your account and authenticate your identity.</li>
              <li>Provide, operate, and improve the Service, including personalising your learning experience and spaced repetition schedule.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Send transactional emails, such as account verification, password resets, and subscription receipts.</li>
              <li>Send service-related announcements and, where you have opted in, promotional communications. You may opt out at any time.</li>
              <li>Monitor and analyse usage trends to diagnose technical problems and improve performance.</li>
              <li>Comply with legal obligations and enforce our Terms of Service.</li>
              <li>Prevent fraud, abuse, and other harmful activity.</li>
            </ul>
          </div>

          <Divider />

          {/* 3 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">3. Sharing of Information</h2>
            <p className="text-dark/70 leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following limited circumstances:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed">
              <li><strong className="text-dark font-semibold">Service providers</strong> — we share data with trusted vendors who help us deliver the Service, including Supabase (database and authentication), Stripe (payment processing), and hosting providers. These parties are contractually bound to process data only as instructed.</li>
              <li><strong className="text-dark font-semibold">Business transfers</strong> — in the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.</li>
              <li><strong className="text-dark font-semibold">Legal requirements</strong> — we may disclose information if required by law, court order, or governmental authority, or if we believe in good faith that disclosure is necessary to protect our rights or the safety of others.</li>
              <li><strong className="text-dark font-semibold">With your consent</strong> — in any other circumstances, we will ask for your explicit consent before sharing your personal information.</li>
            </ul>
          </div>

          <Divider />

          {/* 4 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">4. Data Retention</h2>
            <p className="text-dark/70 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide the Service.
              If you delete your account, we will delete or anonymise your personal data within 30 days, except where we are
              legally required to retain it (for example, financial records for tax purposes). Anonymised, aggregated usage
              data may be retained indefinitely for analytics.
            </p>
          </div>

          <Divider />

          {/* 5 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">5. Data Security</h2>
            <p className="text-dark/70 leading-relaxed">
              We implement industry-standard technical and organisational measures to protect your information against
              unauthorised access, alteration, disclosure, or destruction. These measures include encryption in transit
              (TLS), encryption at rest, strict access controls, and regular security reviews. However, no method of
              transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal
              data, we cannot guarantee its absolute security.
            </p>
          </div>

          <Divider />

          {/* 6 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">6. Your Rights</h2>
            <p className="text-dark/70 leading-relaxed mb-4">
              Depending on your jurisdiction, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed mb-4">
              <li><strong className="text-dark font-semibold">Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong className="text-dark font-semibold">Rectification</strong> — request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-dark font-semibold">Erasure</strong> — request deletion of your personal data (&ldquo;right to be forgotten&rdquo;).</li>
              <li><strong className="text-dark font-semibold">Portability</strong> — request a machine-readable export of your data.</li>
              <li><strong className="text-dark font-semibold">Objection</strong> — object to processing of your data for direct marketing or other purposes based on legitimate interests.</li>
              <li><strong className="text-dark font-semibold">Restriction</strong> — request that we restrict processing of your data in certain circumstances.</li>
            </ul>
            <p className="text-dark/70 leading-relaxed">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@brainana.app" className="text-brain font-semibold hover:underline">
                privacy@brainana.app
              </a>. We will respond within 30 days.
            </p>
          </div>

          <Divider />

          {/* 7 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">7. Cookies</h2>
            <p className="text-dark/70 leading-relaxed mb-4">
              We use the following types of cookies:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed">
              <li><strong className="text-dark font-semibold">Strictly necessary cookies</strong> — session tokens required for authentication. These cannot be disabled without breaking core functionality.</li>
              <li><strong className="text-dark font-semibold">Preference cookies</strong> — remember your settings and preferences across sessions.</li>
              <li><strong className="text-dark font-semibold">Analytics cookies</strong> — help us understand how users interact with the Service so we can improve it. We use anonymised, aggregated data only.</li>
            </ul>
            <p className="text-dark/70 leading-relaxed mt-4">
              You can control cookies through your browser settings. Disabling strictly necessary cookies will prevent you from logging in.
            </p>
          </div>

          <Divider />

          {/* 8 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">8. Children&apos;s Privacy</h2>
            <p className="text-dark/70 leading-relaxed">
              The Service is not directed to children under the age of 13 (or 16 in the European Economic Area).
              We do not knowingly collect personal data from children. If you believe a child has provided us with
              personal information, please contact us immediately and we will take steps to delete it.
            </p>
          </div>

          <Divider />

          {/* 9 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">9. International Transfers</h2>
            <p className="text-dark/70 leading-relaxed">
              Your information may be processed and stored in countries other than your own. We ensure
              that any such transfers comply with applicable data protection laws, including through the
              use of Standard Contractual Clauses approved by the European Commission where required.
            </p>
          </div>

          <Divider />

          {/* 10 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">10. Changes to This Policy</h2>
            <p className="text-dark/70 leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will update the &ldquo;Last updated&rdquo;
              date at the top of this page and, where the changes are material, notify you by email or via an
              in-app notice. Your continued use of the Service after any changes constitutes your acceptance
              of the revised policy.
            </p>
          </div>

          <Divider />

          {/* 11 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">11. Contact Us</h2>
            <p className="text-dark/70 leading-relaxed">
              If you have any questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 bg-white rounded-2xl border border-dark/10 p-6 text-dark/70 leading-relaxed text-sm space-y-1">
              <p className="font-bold text-dark">Brainana</p>
              <p>Email: <a href="mailto:privacy@brainana.app" className="text-brain hover:underline">privacy@brainana.app</a></p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark border-t border-cream/10 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="text-banana font-extrabold text-lg">Brainana</span>
          </Link>
          <div className="flex items-center gap-8 text-sm text-cream/40">
            <Link href="/privacy" className="text-cream/70 hover:text-cream transition">Privacy</Link>
            <Link href="/terms" className="hover:text-cream transition">Terms</Link>
            <Link href="/" className="hover:text-cream transition">Home</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

function Divider() {
  return <div className="h-px bg-dark/10" />;
}
