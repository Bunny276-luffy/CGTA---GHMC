"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  ArrowRight,
  ShieldCheck,
  Camera,
  MapPin,
  Cpu,
  Route,
  Wrench,
  BadgeCheck,
  ClipboardCheck
} from "lucide-react";

const WORKFLOW_STEPS = [
  { icon: <Camera className="h-4 w-4" />, label: "Capture" },
  { icon: <MapPin className="h-4 w-4" />, label: "Locate" },
  { icon: <Cpu className="h-4 w-4" />, label: "Verify" },
  { icon: <Route className="h-4 w-4" />, label: "Route" },
  { icon: <Wrench className="h-4 w-4" />, label: "Resolve" },
  { icon: <BadgeCheck className="h-4 w-4" />, label: "Confirm" },
];

export default function HeroSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 md:pt-14 pb-14 md:pb-16 text-left flex flex-col justify-center bg-slate-50 z-10 overflow-hidden">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10 w-full">

        {/* Left: Title & CTAs */}
        <div className="lg:col-span-7 flex flex-col gap-5 items-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              Public Service Verification Platform
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider">
              Evidence-Backed Municipal Accountability
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 font-sans">
            Empowering Citizens. <br />
            <span className="text-blue-700">Restoring Public Trust.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl font-sans font-medium">
            CivicTrust provides geotagged evidence verification, municipal geofencing, and transparent resolution tracking for local authorities and citizens across India.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/citizen"
              className="w-full sm:w-auto text-center px-6 py-3.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-2 font-sans min-h-[48px]"
            >
              Report a Civic Issue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/public-stats"
              className="w-full sm:w-auto text-center px-6 py-3.5 bg-white border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 font-sans min-h-[48px]"
            >
              <MapPin className="h-4 w-4 text-blue-700" /> View Public Statistics
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-300 flex flex-wrap gap-2.5 max-w-lg w-full">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-sans font-bold w-full">Quick Access Portals:</span>
            <Link
              href="/login"
              className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 min-h-[44px]"
            >
              <Users className="h-4 w-4 text-blue-700" /> Citizen Sign In
            </Link>
            <Link
              href="/track"
              className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 min-h-[44px]"
            >
              <ClipboardCheck className="h-4 w-4 text-blue-700" /> Track Grievance Status
            </Link>
          </div>
        </div>

        {/* Right: Verification Workflow Steps */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-300 shadow-sm space-y-4">
          <div className="border-b pb-3 border-slate-200">
            <span className="text-xs font-bold text-blue-900 uppercase block tracking-wider">Accountability Workflow</span>
            <h3 className="text-base font-bold text-slate-900">How Grievance Verification Works</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="text-blue-700">{step.icon}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed font-medium">
            1. Photo & GPS evidence captured onsite.<br />
            2. AI checks camera EXIF, geofence, and duplicate records.<br />
            3. Dispatched to field officer with verified proof.
          </div>
        </div>

      </div>

    </section>
  );
}
