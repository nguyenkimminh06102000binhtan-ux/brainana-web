import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "sonner";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://brainana.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Brainana — Learn with mems that stick",
    template: "%s",
  },
  description:
    "Build tiny memory tricks, study with playful review modes, and keep every course feeling friendly instead of flat. Spaced repetition with community courses.",
  keywords: [
    "flashcards",
    "spaced repetition",
    "memory",
    "learning",
    "study",
    "courses",
    "mnemonics",
    "mems",
  ],
  authors: [{ name: "Brainana", url: siteUrl }],
  creator: "Brainana",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Brainana",
    title: "Brainana — Learn with mems that stick",
    description:
      "Build tiny memory tricks, study with playful review modes, and keep every course feeling friendly instead of flat.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@brainana",
    title: "Brainana — Learn with mems that stick",
    description:
      "Build tiny memory tricks, study with playful review modes, and keep every course feeling friendly instead of flat.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Brainana",
      url: siteUrl,
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@brainana.app",
        contactType: "customer support",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Brainana",
      description:
        "Build tiny memory tricks, study with playful review modes, and keep every course feeling friendly instead of flat.",
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/browse?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen font-manrope antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('brainana-theme');
                if (theme === 'dark') {
                  document.documentElement.dataset.theme = 'dark';
                } else {
                  document.documentElement.dataset.theme = 'light';
                }
              } catch (_) {
                document.documentElement.dataset.theme = 'light';
              }
            `,
          }}
        />
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
