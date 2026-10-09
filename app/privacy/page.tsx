import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Notice | CivicTrust (CGTA)",
  description: "What information CivicTrust collects, why, and how it is handled."
};

/**
 * Privacy notice — written to the standard of India's DPDP Act 2023
 * explanatory principles: clear, standalone, understandable (master report §46/§48).
 */
export default function PrivacyPage() {
  const sections: { title: string; body: string[] }[] = [
    {
      title: "What information is collected",
      body: [
        "Account details you provide at registration: name, email address, and a scrypt-hashed password (never the password itself).",
        "Grievance content you submit: description, category, severity, address/landmark text, GPS coordinates, and the photo evidence you attach.",
        "Technical records required for the workflow: timestamps, the audit trail of actions taken on your grievances, and — where applicable — the field officer's GPS location when they verify a resolution.",
      ],
    },
    {
      title: "Why it is collected",
      body: [
        "Location, photo evidence and timestamps exist so the verification engine can assess whether evidence is geographically consistent, within the configured jurisdiction, and free of duplicate or manipulation signals. Without them, the accountability chain cannot function.",
        "Account details exist to authenticate you, link your grievances to your account, and notify you of workflow progress.",
      ],
    },
    {
      title: "How it is used and shared",
      body: [
        "Grievance content is visible to authorised municipal staff (field officers, department heads, administrators) responsible for acting on it.",
        "Public pages show only aggregate statistics and tracking-ID lifecycle information. Private citizen identity is never published on public pages.",
        "Nothing is sold, advertised against, or shared with third parties for non-civic purposes.",
      ],
    },
    {
      title: "Data minimisation",
      body: [
        "Only information required for the grievance workflow is collected. The platform does not read your contacts, does not track continuous location history, and does not access unrelated files or photographs.",
      ],
    },
    {
      title: "Retention and security",
      body: [
        "Grievances and their audit trails are retained as the accountability record of the workflow. Passwords are stored only as scrypt hashes with per-user salts.",
        "Sessions use signed HttpOnly cookies; all role-gated actions are authorised server-side and recorded.",
      ],
    },
    {
      title: "Prototype notice",
      body: [
        "CivicTrust is a project implementation modelled on the GHMC civic structure. It is not an official government deployment, and no government identity verification (OTP / official identity) is currently connected — that integration slot is reserved and documented in INTEGRATIONS.md.",
      ],
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#0A0F1E] text-slate-100 flex flex-col">
      <header className="border-b border-white/5 bg-[#0A0F1E]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="h-9 w-9 bg-slate-900 border border-white/5 hover:border-indigo-500/20 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-black tracking-wider text-white">
                CIVIC<span className="text-indigo-400">TRUST</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow mx-auto max-w-4xl px-6 py-12 w-full space-y-8 text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Privacy Notice</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            This notice explains what personal information CivicTrust handles, why, and how —
            written to be clear and standalone, consistent with the principles of India's
            Digital Personal Data Protection Act, 2023.
          </p>
        </div>

        {sections.map((s) => (
          <section key={s.title} className="space-y-2.5">
            <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-xs text-slate-300 leading-relaxed">{p}</p>
            ))}
          </section>
        ))}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-[10px] font-mono text-slate-500 uppercase tracking-wider">
        CivicTrust (CGTA) — project implementation. Not affiliated with GHMC.
      </footer>
    </div>
  );
}
