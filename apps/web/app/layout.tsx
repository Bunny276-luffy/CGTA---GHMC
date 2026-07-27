import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicTrust (CGTA) | AI-Powered Grievance Platform",
  description: "AI-powered civic grievance verification, anti-fraud geofencing, and trust calculation system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
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
                      str.indexOf('ExtendedBroadcastMessage') !== -1
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
      <body suppressHydrationWarning className="antialiased min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
