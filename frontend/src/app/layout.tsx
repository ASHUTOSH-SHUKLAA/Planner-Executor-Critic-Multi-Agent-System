import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import { ResearchProvider } from "@/lib/research-context";
import { ToastContainer } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ACTIVE_TYPOGRAPHY_PAIRING, TYPOGRAPHY_PAIRINGS } from "@/lib/typography-config";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1120" },
  ],
};

export const metadata: Metadata = {
  applicationName: "Synora",
  icons: {
    icon: "/brand/synora-logo.png",
    apple: "/brand/synora-logo.png",
  },
  title: {
    default: "Synora | Autonomous AI Research",
    template: "%s | Synora",
  },
  description:
    "Autonomous research powered by coordinated intelligence. Think. Investigate. Validate. Synthesize.",
  openGraph: {
    type: "website",
    siteName: "Synora",
    title: "Synora | Autonomous AI Research",
    description: "Autonomous research powered by coordinated intelligence.",
  },
  twitter: {
    card: "summary",
    title: "Synora | Autonomous AI Research",
    description: "Autonomous research powered by coordinated intelligence.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activePairing = TYPOGRAPHY_PAIRINGS[ACTIVE_TYPOGRAPHY_PAIRING];

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${activePairing.cssClass} font-sans min-h-full antialiased`}
    >
      <head>
        {/* Blocking theme init: runs before first paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aegis_theme')||'dark';var active=t==='light'?'light':(t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'dark');if(active==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`,
          }}
        />
        {/* Prevent white flash before CSS loads — set bg to dark immediately */}
        <style dangerouslySetInnerHTML={{ __html: `html,body{background:#0b0b0b;color:#ffffff}html.dark,html.dark body{background:#0b0b0b;color:#ffffff}` }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ResearchProvider>
                <TooltipProvider>
                  {children}
                  <ToastContainer />
                </TooltipProvider>
              </ResearchProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
