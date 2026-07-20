"use client";

import React from "react";
import { Star } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

interface TestimonialItem {
  name: string;
  role: string;
  badge: "CITIZEN" | "OFFICER" | "SUPERVISOR";
  quote: string;
  avatarLetter: string;
}

export default function TestimonialsSection() {
  const reviews: TestimonialItem[] = [
    {
      name: "Ramesh Kumar",
      role: "Jubilee Hills Resident",
      badge: "CITIZEN",
      quote: "I submitted a pothole repair on my street. The AI geofencing verified my photo instantly, and it was fixed in less than 24 hours. The ledger tracking gives real transparency.",
      avatarLetter: "R"
    },
    {
      name: "Officer A. Sharma",
      role: "Ward 142 Field Engineer",
      badge: "OFFICER",
      quote: "Before CivicTrust, we had to sort through dozens of duplicate complaints or edited stock photos. The EXIF checks and spatial alerts save us hours of inspection labor every day.",
      avatarLetter: "S"
    },
    {
      name: "K. Rao",
      role: "GHMC Municipal Director",
      badge: "SUPERVISOR",
      quote: "CivicTrust's automated department allocation and closed-loop verification timeline have increased our resolution rates by 42% while completely eliminating duplicate tickets.",
      avatarLetter: "K"
    }
  ];

  return (
    <section id="testimonials" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6 space-y-16">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="User Testimonials"
            className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Read what citizens, ward officers, and municipal supervisors say about CivicTrust (CGTA).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev, idx) => (
            <TiltCard key={idx}>
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-950/45 text-left flex flex-col justify-between min-h-[250px]">
                
                <div className="space-y-4">
                  {/* Rating Stars */}
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-cyan-400 stroke-none" />
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed italic">
                    "{rev.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-3 border-t border-white/5 pt-4 mt-6">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 font-bold font-mono text-xs">
                    {rev.avatarLetter}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-mono font-bold text-white uppercase">{rev.name}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[6.5px] font-mono font-bold border ${
                        rev.badge === "CITIZEN"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : rev.badge === "OFFICER"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      }`}>
                        {rev.badge}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 uppercase mt-0.5 block">{rev.role}</span>
                  </div>
                </div>

              </div>
            </TiltCard>
          ))}
        </div>

      </div>
    </section>
  );
}
