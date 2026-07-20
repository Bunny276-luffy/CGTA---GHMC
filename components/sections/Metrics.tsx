"use client";

import React, { useEffect, useState } from "react";
import TiltCard from "../TiltCard";

interface MetricItemProps {
  label: string;
  target: number;
  suffix?: string;
  decimals?: number;
  description: string;
  colorClass?: string;
}

function CounterMetric({ label, target, suffix = "", decimals = 0, description, colorClass = "text-blue-450" }: MetricItemProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200; // 1.2s animation
    const stepTime = 16; // ~60fps
    const totalSteps = duration / stepTime;
    const stepValue = target / totalSteps;

    const timer = setInterval(() => {
      start += stepValue;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target]);

  const displayVal = decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString();

  return (
    <TiltCard>
      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-950/45 text-left flex flex-col justify-between min-h-[160px]">
        <div>
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block">{label}</span>
          <h3 className={`text-3xl md:text-4xl font-mono font-black mt-2 ${colorClass}`}>
            {displayVal}{suffix}
          </h3>
        </div>
        <p className="text-[10px] text-slate-450 font-mono mt-3 leading-normal border-t border-white/5 pt-2">
          {description}
        </p>
      </div>
    </TiltCard>
  );
}

export default function MetricsSection() {
  return (
    <section className="py-24 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Animated KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CounterMetric
            label="Complaints Processed"
            target={4291}
            colorClass="text-blue-450"
            description="Geofence checkpoints registered and resolved across administrative sectors."
          />
          <CounterMetric
            label="AI Verification Accuracy"
            target={99.4}
            suffix="%"
            decimals={1}
            colorClass="text-emerald-450"
            description="Confidence score check verification success rate on raw EXIF files."
          />
          <CounterMetric
            label="Average Resolution Speed"
            target={18.4}
            suffix=" Hrs"
            decimals={1}
            colorClass="text-blue-450"
            description="Closed-loop verification turnaround time from upload to ledger seal."
          />
          <CounterMetric
            label="Citizen Satisfaction"
            target={98.2}
            suffix="%"
            decimals={1}
            colorClass="text-emerald-450"
            description="Anonymous positive ledger responses logged at resolution checkpoints."
          />
        </div>

      </div>
    </section>
  );
}
