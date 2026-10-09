"use client";

import React from "react";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  BarChart3,
  Home
} from "lucide-react";

export default function MobileBottomBar() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 px-3 py-2 text-slate-100 shadow-xl">
      <div className="grid grid-cols-4 items-center gap-1 text-center">

        {/* Home */}
        <Link
          href="/"
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-300 hover:text-white transition-all min-h-[44px]"
        >
          <Home className="h-4 w-4 mb-0.5 text-slate-400" />
          <span className="text-[10px] font-semibold">Home</span>
        </Link>

        {/* Report Issue */}
        <Link
          href="/citizen"
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-300 hover:text-white transition-all min-h-[44px]"
        >
          <PlusCircle className="h-4 w-4 mb-0.5 text-blue-400" />
          <span className="text-[10px] font-semibold">Report</span>
        </Link>

        {/* Track Grievances */}
        <Link
          href="/citizen"
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-300 hover:text-white transition-all min-h-[44px]"
        >
          <Search className="h-4 w-4 mb-0.5 text-blue-400" />
          <span className="text-[10px] font-semibold">My Tickets</span>
        </Link>

        {/* Public Stats */}
        <Link
          href="/public-stats"
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-300 hover:text-white transition-all min-h-[44px]"
        >
          <BarChart3 className="h-4 w-4 mb-0.5 text-slate-400" />
          <span className="text-[10px] font-semibold">Stats</span>
        </Link>

      </div>
    </div>
  );
}
