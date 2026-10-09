import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import MobileBottomBar from "../components/MobileBottomBar";
import PWARegister from "../components/PWARegister";
import { ErrorBoundary } from "../components/ErrorBoundary";



const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "CivicTrust | Official Public Grievance & Evidence Verification Platform",
  description: "Official Greater Hyderabad Municipal Corporation (GHMC) public grievance registration, evidence validation, and municipal accountability platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CivicTrust"
  },
  icons: {
    icon: "/icon",
    apple: "/icon"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function isExtensionError(e) {
                  try {
                    var str = (e && e.filename) || '';
                    if (e && e.message) str += ' ' + e.message;
                    if (e && e.error && e.error.stack) str += ' ' + e.error.stack;
                    if (e && e.reason) {
                      if (e.reason.message) str += ' ' + e.reason.message;
                      if (e.reason.stack) str += ' ' + e.reason.stack;
                    }
                    return (
                      str.indexOf('chrome-extension://') !== -1 ||
                      str.indexOf('moz-extension://') !== -1 ||
                      str.indexOf('safari-extension://') !== -1 ||
                      str.indexOf('inpage.js') !== -1 ||
                      str.indexOf('contentscript.js') !== -1 ||
                      str.indexOf('ExtendedBroadcastMessage') !== -1 ||
                      str.indexOf('Channel secret not available') !== -1
                    );
                  } catch (err) {
                    return false;
                  }
                }
                window.addEventListener('error', function(event) {
                  if (isExtensionError(event)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(event) {
                  if (isExtensionError(event)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${plusJakarta.variable} ${inter.variable} antialiased min-h-screen bg-slate-100 text-slate-900 selection:bg-blue-600/20 selection:text-blue-900 relative overflow-x-hidden pb-16 md:pb-0`}>
        {/* Accessibility: skip navigation for keyboard and screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-blue-700 focus:text-white focus:text-xs focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>

        {/* PWA Service Worker Registration */}
        <PWARegister />

        {/* Clean layout container */}
        <div id="main-content" className="relative z-10 w-full min-h-screen flex flex-col bg-slate-50">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>

        {/* Universal Mobile Navigation Bar */}
        <MobileBottomBar />
      </body>
    </html>
  );
}
