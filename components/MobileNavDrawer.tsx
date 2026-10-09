"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  X,
  MapPin,
  PlusCircle,
  Users,
  HelpCircle,
  ExternalLink,
  PhoneCall
} from "lucide-react";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/80 backdrop-blur-md transition-opacity animate-fade-in">
      
      {/* Click backdrop to close */}
      <div className="flex-1 w-full" onClick={onClose} />

      {/* Drawer Content */}
      <div className="w-full bg-[#060612] border-t border-indigo-500/30 rounded-t-3xl p-6 space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <div className="h-full w-full bg-[#0A0F1E] rounded-md flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-sm font-black tracking-wider text-white block">
                CIVIC<span className="text-indigo-400">TRUST</span> (CGTA)
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Greater Hyderabad Municipal Portal</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Navigation Links */}
        <nav className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-2">Portal Navigation</p>

          <Link
            href="/track"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-200 text-xs font-bold hover:text-indigo-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Track a Grievance
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </Link>

          <Link
            href="/public-stats"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-200 text-xs font-bold hover:text-indigo-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Public Statistics
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </Link>

          <Link
            href="#platform-capabilities"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-200 text-xs font-bold hover:text-indigo-400 transition-colors"
          >
            <span>Platform Capabilities</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </Link>

          <Link
            href="#faq"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-200 text-xs font-bold hover:text-indigo-400 transition-colors"
          >
            <span>Government FAQ & Guidelines</span>
            <HelpCircle className="h-3.5 w-3.5 opacity-50" />
          </Link>
        </nav>

        {/* Action Buttons for Mobile Users — Citizen Only */}
        <div className="space-y-3 pt-2">
          <Link 
            href="/register" 
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-indigo-600 text-xs font-bold uppercase tracking-wider text-white text-center hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <PlusCircle className="h-4 w-4" /> File Geotagged Grievance
          </Link>

          <Link 
            href="/login" 
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-200 text-center flex items-center justify-center gap-1.5 hover:text-indigo-400"
          >
            <Users className="h-4 w-4 text-indigo-400" /> Citizen Sign In
          </Link>
        </div>

        {/* Official Helpline Info */}
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold block">Questions?</span>
            <span className="text-white font-mono font-bold">See the Platform FAQ</span>
          </div>
          <Link
            href="/#faq"
            onClick={onClose}
            className="p-2 rounded-lg bg-emerald-500 text-black font-bold text-xs flex items-center gap-1"
          >
            <PhoneCall className="h-3.5 w-3.5" /> FAQ
          </Link>
        </div>

      </div>
    </div>
  );
}
// Fix for Render
