import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Brainana",
  description: "The terms and conditions governing your use of Brainana.",
};

export default function TermsOfServicePage() {
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
          <h1 className="text-cream text-4xl md:text-5xl font-extrabold mb-4">Terms of Service</h1>
          <p className="text-cream/50 text-sm">Last updated: May 21, 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-cream flex-1 py-16 px-6">
        <div className="mx-auto max-w-3xl space-y-12 text-dark">

          {/* Intro */}
          <div>
            <p className="text-dark/70 text-base leading-relaxed">
              Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using the Brainana web application
              and related services (the &ldquo;Service&rdquo;) operated by Brainana (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;).
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree
              to all of the Terms, you may not access the Service.
            </p>
          </div>

          <Divider />

          {/* 1 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">1. Eligibility</h2>
            <p className="text-dark/70 leading-relaxed">
              You must be at least 13 years old (or 16 years old if you are in the European Economic Area)
              to use the Service. By using the Service, you represent and warrant that you meet this age
              requirement and that you have the legal capacity to enter into these Terms. If you are using
              the Service on behalf of an organisation, you represent that you have the authority to bind
              that organisation to these Terms.
            </p>
          </div>

          <Divider />

          {/* 2 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">2. Account Registration</h2>
            <p className="text-dark/70 leading-relaxed mb-4">
              To access certain features of the Service, you must create an account. When registering, you agree to:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed mb-4">
              <li>Provide accurate, current, and complete information.</li>
              <li>Maintain and promptly update your account information to keep it accurate and complete.</li>
              <li>Keep your password confidential and not share it with any third party.</li>
              <li>Notify us immediately of any unauthorised use of your account or any other security breach.</li>
              <li>Accept responsibility for all activities that occur under your account.</li>
            </ul>
            <p className="text-dark/70 leading-relaxed">
              We reserve the right to suspend or terminate accounts that contain false information or that
              are used in violation of these Terms.
            </p>
          </div>

          <Divider />

          {/* 3 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">3. The Service</h2>

            <h3 className="text-dark text-lg font-bold mb-2">3.1 Description</h3>
            <p className="text-dark/70 leading-relaxed mb-5">
              Brainana is a spaced repetition learning platform that allows users to study flashcard-based
              courses, track learning progress, build study streaks, and access community-created educational
              content. We offer both a free tier and a paid subscription (&ldquo;Brainana Pro&rdquo;).
            </p>

            <h3 className="text-dark text-lg font-bold mb-2">3.2 Free Tier</h3>
            <p className="text-dark/70 leading-relaxed mb-5">
              The free tier provides limited access to the Service, including up to three active courses,
              basic progress tracking, and access to the community library. Free tier features may be
              changed, limited, or discontinued at our sole discretion with reasonable notice.
            </p>

            <h3 className="text-dark text-lg font-bold mb-2">3.3 Brainana Pro</h3>
            <p className="text-dark/70 leading-relaxed">
              Brainana Pro is a paid subscription offering unlimited courses, advanced analytics, offline
              access, priority support, and other premium features. By subscribing, you authorise us to
              charge your payment method on a recurring basis. Subscription fees are non-refundable except
              where required by applicable law.
            </p>
          </div>

          <Divider />

          {/* 4 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">4. Payment and Billing</h2>
            <p className="text-dark/70 leading-relaxed mb-4">
              If you subscribe to Brainana Pro:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed">
              <li>Fees are billed in advance on a monthly or annual basis, depending on the plan you select.</li>
              <li>You authorise us (via our payment processor, Stripe) to charge your payment method automatically at the start of each billing cycle.</li>
              <li>If a payment fails, we may suspend your access to Pro features until payment is resolved.</li>
              <li>You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period.</li>
              <li>We reserve the right to change subscription fees upon 30 days&apos; prior notice. Continued use of the Service after the price change constitutes your agreement to the new fees.</li>
            </ul>
          </div>

          <Divider />

          {/* 5 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">5. User-Generated Content</h2>
            <p className="text-dark/70 leading-relaxed mb-4">
              The Service allows you to create, upload, and share flashcard decks and courses
              (&ldquo;User Content&rdquo;). By submitting User Content, you:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed mb-4">
              <li>Grant us a non-exclusive, worldwide, royalty-free licence to host, display, and distribute your User Content solely for the purpose of operating and improving the Service.</li>
              <li>Represent and warrant that you own or have the necessary rights to the content and that it does not infringe any third-party intellectual property, privacy, or other rights.</li>
              <li>Acknowledge that you, not Brainana, are solely responsible for the accuracy and legality of your User Content.</li>
            </ul>
            <p className="text-dark/70 leading-relaxed">
              We reserve the right to remove any User Content that violates these Terms or that we determine,
              in our sole discretion, to be harmful, inaccurate, or objectionable.
            </p>
          </div>

          <Divider />

          {/* 6 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">6. Acceptable Use</h2>
            <p className="text-dark/70 leading-relaxed mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed">
              <li>Violate any applicable local, national, or international law or regulation.</li>
              <li>Infringe the intellectual property rights of others, including copyright, trademark, or trade secret rights.</li>
              <li>Upload or transmit viruses, malware, or any other malicious code.</li>
              <li>Attempt to gain unauthorised access to any part of the Service, other accounts, or connected systems.</li>
              <li>Scrape, crawl, or data-mine the Service without our express written consent.</li>
              <li>Harass, abuse, or harm other users.</li>
              <li>Use the Service to transmit unsolicited commercial messages (spam).</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
              <li>Circumvent, disable, or interfere with security features of the Service.</li>
            </ul>
          </div>

          <Divider />

          {/* 7 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">7. Intellectual Property</h2>
            <p className="text-dark/70 leading-relaxed">
              The Service and its original content, features, and functionality — excluding User Content —
              are and will remain the exclusive property of Brainana and its licensors. Our trademarks and
              trade dress may not be used in connection with any product or service without our prior written
              consent. Nothing in these Terms grants you any right to use our name, logo, or branding.
            </p>
          </div>

          <Divider />

          {/* 8 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">8. Disclaimer of Warranties</h2>
            <p className="text-dark/70 leading-relaxed">
              The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind,
              either express or implied, including but not limited to implied warranties of merchantability,
              fitness for a particular purpose, or non-infringement. We do not warrant that the Service will
              be uninterrupted, error-free, or free of harmful components. We make no representations
              regarding the accuracy or completeness of any content available through the Service.
            </p>
          </div>

          <Divider />

          {/* 9 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">9. Limitation of Liability</h2>
            <p className="text-dark/70 leading-relaxed">
              To the maximum extent permitted by applicable law, Brainana and its directors, employees,
              partners, agents, suppliers, and affiliates shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, data, or goodwill,
              arising out of or in connection with your use of or inability to use the Service. In no event
              shall our total liability to you for all claims arising out of or relating to these Terms or
              the Service exceed the amount you paid to us in the 12 months preceding the claim, or
              USD $50 if you have not made any payments.
            </p>
          </div>

          <Divider />

          {/* 10 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">10. Termination</h2>
            <p className="text-dark/70 leading-relaxed mb-4">
              We may suspend or terminate your access to the Service at any time, with or without cause
              and with or without notice, if we believe you have violated these Terms or for any other
              legitimate business reason. Upon termination:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-dark/70 leading-relaxed">
              <li>Your right to use the Service ceases immediately.</li>
              <li>We may delete your account and associated data in accordance with our Privacy Policy.</li>
              <li>Any outstanding amounts owed remain due and payable.</li>
              <li>Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.</li>
            </ul>
            <p className="text-dark/70 leading-relaxed mt-4">
              You may also terminate your account at any time by contacting us or using the account deletion
              option in your settings.
            </p>
          </div>

          <Divider />

          {/* 11 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">11. Governing Law and Disputes</h2>
            <p className="text-dark/70 leading-relaxed">
              These Terms are governed by and construed in accordance with applicable laws, without regard
              to conflict of law principles. Any dispute arising out of or relating to these Terms or the
              Service that cannot be resolved informally shall be subject to binding arbitration, except
              that either party may seek injunctive or other equitable relief in any court of competent
              jurisdiction where necessary to prevent irreparable harm. You agree to resolve disputes
              individually and waive any right to participate in class action proceedings.
            </p>
          </div>

          <Divider />

          {/* 12 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">12. Changes to These Terms</h2>
            <p className="text-dark/70 leading-relaxed">
              We reserve the right to modify these Terms at any time. When we make material changes, we
              will notify you by updating the &ldquo;Last updated&rdquo; date and, where appropriate, by email or
              in-app notification. Your continued use of the Service after any changes constitutes your
              acceptance of the revised Terms. If you do not agree to the updated Terms, you must stop
              using the Service.
            </p>
          </div>

          <Divider />

          {/* 13 */}
          <div>
            <h2 className="text-dark text-2xl font-extrabold mb-5">13. Contact Us</h2>
            <p className="text-dark/70 leading-relaxed">
              If you have any questions about these Terms or wish to report a violation, please contact us:
            </p>
            <div className="mt-4 bg-white rounded-2xl border border-dark/10 p-6 text-dark/70 leading-relaxed text-sm space-y-1">
              <p className="font-bold text-dark">Brainana</p>
              <p>Email: <a href="mailto:legal@brainana.app" className="text-brain hover:underline">legal@brainana.app</a></p>
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
            <Link href="/privacy" className="hover:text-cream transition">Privacy</Link>
            <Link href="/terms" className="text-cream/70 hover:text-cream transition">Terms</Link>
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
