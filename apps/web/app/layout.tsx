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
      <body suppressHydrationWarning className="antialiased min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
