"use client";

import React from "react";
import Link from "next/link";
import { 
  PlusCircle, 
  Search, 
  UserCheck, 
  PhoneCall, 
  MapPin,
  ShieldCheck
} from "lucide-react";

export default function MobileBottomBar() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#030309]/95 backdrop-blur-xl border-t border-cyan-500/20 px-3 py-2 text-slate-200 shadow-2xl">
      <div className="grid grid-cols-3 items-center gap-1 text-center">
        
        {/* Report Issue (Citizen) */}
        <Link 
          href="/register" 
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-300 hover:text-cyan-400 active:scale-95 transition-all"
        >
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-0.5">
            <PlusCircle className="h-4 w-4" />
          </div>
          <span className="text-[9px] font-bold tracking-tight">Report</span>
        </Link>

        {/* Track Grievance */}
        <Link 
          href="/login" 
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-300 hover:text-cyan-400 active:scale-95 transition-all"
        >
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-0.5">
            <Search className="h-4 w-4" />
          </div>
          <span className="text-[9px] font-bold tracking-tight">Track Ticket</span>
        </Link>

        {/* Emergency SOS Call */}
        <a 
          href="tel:1100" 
          className="flex flex-col items-center justify-center py-1 rounded-xl text-rose-400 hover:text-rose-300 active:scale-95 transition-all"
        >
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 mb-0.5 animate-pulse">
            <PhoneCall className="h-4 w-4" />
          </div>
          <span className="text-[9px] font-black tracking-tight uppercase">SOS 1100</span>
        </a>

      </div>
    </div>
  );
}
