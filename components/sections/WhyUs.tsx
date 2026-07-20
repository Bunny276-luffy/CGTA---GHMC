"use client";

import React from "react";
import { Cpu, ShieldAlert, CopyCheck, Landmark, Compass, Eye, ShieldCheck, BarChart3 } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <TiltCard>
      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-950/45 text-left space-y-4 hover:border-blue-500/20 transition-all duration-300 h-full flex flex-col justify-between min-h-[190px]">
        <div className="h-9 w-9 rounded-xl bg-blue-500/5 border border-blue-500/25 flex items-center justify-center text-blue-400">
          {icon}
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs font-mono font-bold text-white uppercase">{title}</h4>
          <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </TiltCard>
  );
}

export default function WhyUsSection() {
  return (
    <section id="features" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6 space-y-16">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="Autonomous Validation Features"
            className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Protecting municipal resources and accelerating resolutions through automated cryptographic and metadata verifications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Cpu className="h-4.5 w-4.5" />}
            title="AI Verification"
            description="Automatic geofence mapping, optical character scans, and object identification checks."
          />
          <FeatureCard
            icon={<ShieldAlert className="h-4.5 w-4.5" />}
            title="Fraud Detection"
            description="Examines photo headers to flag image manipulation or software editor metadata tags."
          />
          <FeatureCard
            icon={<CopyCheck className="h-4.5 w-4.5" />}
            title="Duplicate Suppression"
            description="Checks active categories in a 100m proximity to prevent overlapping work tickets."
          />
          <FeatureCard
            icon={<Landmark className="h-4.5 w-4.5" />}
            title="Smart Assignment"
            description="Instantly routes verified reports to the specific ward operator node."
          />
          <FeatureCard
            icon={<Compass className="h-4.5 w-4.5" />}
            title="Real-Time Tracking"
            description="Follow verification, allocation, and closure milestones directly on-ledger."
          />
          <FeatureCard
            icon={<Eye className="h-4.5 w-4.5" />}
            title="Explainable Decisions"
            description="Provides a plain-English log explaining why a complaint failed or passed validation."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-4.5 w-4.5" />}
            title="Public Ledger"
            description="Anchors reports on an immutable audit ledger to guarantee department transparency."
          />
          <FeatureCard
            icon={<BarChart3 className="h-4.5 w-4.5" />}
            title="SaaS Analytics"
            description="Track ward response times, categories, and audit trends on responsive graphs."
          />
        </div>

      </div>
    </section>
  );
}
