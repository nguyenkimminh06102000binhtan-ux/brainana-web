import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Brainana",
  description: "Brainana web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
