"use client";

import React from "react";
import { ShieldCheck, Cpu, Database, BellRing } from "lucide-react";

export default function AlternatingFeatures() {
  return (
    <section id="platform-capabilities" className="py-16 md:py-20 border-t border-slate-300 bg-white relative z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-16">

        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
            Platform Capabilities
          </span>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight font-sans">
            Engineered for Municipal Redressal & Scale
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            Core features built into our evidence verification and accountability engine.
          </p>
        </div>

        {/* Feature Row 1: AI Image Forensics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
          <div className="lg:col-span-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-sans">
              Geotagged Evidence & Forensic Validation
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              CivicTrust evaluates photo metadata headers, extracting EXIF tags, GPS coordinates, and camera software tags. Edited photos containing manipulation signatures are flagged for manual supervisor audit.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4 font-mono text-xs text-slate-800 space-y-2 shadow-sm">
              <div className="font-bold text-blue-900 border-b border-slate-300 pb-2">EVIDENCE_INTEGRITY_AUDIT.LOG</div>
              <div>• camera_source: "Mobile Hardware Sensor"</div>
              <div>• gps_coordinates: 17.3850° N, 78.4867° E</div>
              <div>• ghmc_geofence: "INSIDE_BOUNDARY_SECTOR"</div>
              <div>• software_signature: "CLEAN_NATIVE_EXIF"</div>
              <div className="text-emerald-700 font-bold">• integrity_status: VERIFIED_LEGAL_EVIDENCE</div>
            </div>
          </div>
        </div>

        {/* Feature Row 2: Municipal Routing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
          <div className="lg:col-span-6 order-last lg:order-first">
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4 font-mono text-xs text-slate-800 space-y-2 shadow-sm">
              <div className="font-bold text-blue-900 border-b border-slate-300 pb-2">JURISDICTION_DISPATCH.LOG</div>
              <div>• municipality: "GHMC"</div>
              <div>• department: "Roads & Maintenance"</div>
              <div>• sla_deadline: "24 Hours"</div>
              <div>• assigned_officer: "Field Engineer Ward 104"</div>
              <div className="text-blue-800 font-bold">• status: DISPATCHED_ON_LEDGER</div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-sans">
              Automated Department & SLA Dispatch
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Geofenced grievances automatically route to responsible department teams based on category and jurisdiction boundaries, enforcing SLA deadlines and escalation pathways.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
