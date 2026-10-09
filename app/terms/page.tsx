import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Use | CivicTrust (CGTA)",
  description: "The terms that govern use of the CivicTrust platform."
};

export default function TermsPage() {
  const sections: { title: string; body: string[] }[] = [
    {
      title: "What CivicTrust is",
      body: [
        "CivicTrust is an AI-assisted, evidence-backed civic grievance and accountability platform. This deployment (CGTA-GHMC) is a project implementation modelled on the current GHMC 6-zone / 30-circle / 150-ward structure.",
        "It is a prototype. It is not an official GHMC or Government of Telangana service, and no grievance submitted here is routed to a real municipal workflow.",
      ],
    },
    {
      title: "Acceptable use",
      body: [
        "Submit only truthful reports with evidence you have the right to use. Do not upload images of other people's private property or persons without consent, do not attempt to submit manipulated evidence, and do not use the platform to harass or target anyone.",
        "Attempts to bypass verification (edited evidence, false locations, duplicate filings) are recorded as verification signals and may route the submission to audit review.",
      ],
    },
    {
      title: "Verification and decisions",
      body: [
        "The verification engine produces an evidence-based trust assessment and explainable reports. AI assists the process; it does not become the authority. Deterministic rules and authorised human reviewers remain authoritative for every workflow decision.",
        "Verification signals are indicators for review — never automatic proof of fraud, and never an automatic rejection of a citizen.",
      ],
    },
    {
      title: "No guarantee of service",
      body: [
        "The platform is provided as-is for demonstration and evaluation. Resolution timelines shown are the platform's own configured SLA policy targets, not commitments by any government body.",
        "Emergency situations must be reported through official government channels, not this platform.",
      ],
    },
    {
      title: "Accounts",
      body: [
        "You are responsible for the activity on your account. Self-registration creates citizen accounts only; officer, department-head and administrator accounts are provisioned by the administration.",
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
          <h1 className="text-2xl md:text-3xl font-black text-white">Terms of Use</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The terms that govern use of this CivicTrust implementation.
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
