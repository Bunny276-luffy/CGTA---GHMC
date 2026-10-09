"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function CallToAction() {
  return (
    <section className="py-16 md:py-20 border-t border-slate-300 bg-slate-100 text-center relative z-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">

        <div className="p-8 sm:p-10 rounded-2xl border border-slate-300 bg-white shadow-sm space-y-6 flex flex-col items-center">

          <div className="h-12 w-12 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
              Report Civic Issues with CivicTrust
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Join citizens securing public accountability through geotagged evidence validation and transparent municipal auditing.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/citizen"
              className="px-6 py-3.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center gap-2 shadow-md min-h-[48px]"
            >
              Report a Civic Issue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-200 transition-all min-h-[48px]"
            >
              Citizen Sign In
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
