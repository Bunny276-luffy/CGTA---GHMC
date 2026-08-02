import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import ThreeDGlobalBackground from "@/components/ThreeDGlobalBackground";
import CustomCursor from "@/components/CustomCursor";

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

export const metadata: Metadata = {
  title: "CivicTrust (CGTA) | AI-Powered Grievance Platform",
  description: "AI-powered grievance validation, anti-fraud geofencing, and trust calculation system.",
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
                      str.indexOf('contentscript.js') !== -1 ||
                      str.indexOf('ExtendedBroadcastMessage') !== -1 ||
                      str.indexOf('Channel secret not available') !== -1 ||
                      str.indexOf('EthereumAdapter') !== -1 ||
                      str.indexOf('SolanaAdapter') !== -1 ||
                      str.indexOf('BinanceWeb3Provider') !== -1
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
      <body suppressHydrationWarning className={`${plusJakarta.variable} ${inter.variable} antialiased min-h-screen bg-[#030308] text-slate-100 selection:bg-blue-500/20 selection:text-cyan-200 relative overflow-x-hidden`}>
        {/* Global 3D Particle Space Background */}
        <ThreeDGlobalBackground />
        
        {/* Custom pointer cursor trail */}
        <CustomCursor />
        
        {/* Layout container */}
        <div className="relative z-10 w-full min-h-screen flex flex-col bg-transparent">
          {children}
        </div>
      </body>
    </html>
  );
}
