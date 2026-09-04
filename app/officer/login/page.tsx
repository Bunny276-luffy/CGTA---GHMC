"use client";

import { Suspense } from "react";
import { RoleAuthPage } from "@/components/RoleAuthPage";

/**
 * /officer/login — Field Officer Authentication
 * 
 * Completely separate from citizen and admin access points.
 * Officers cannot register through the UI — accounts are provisioned by admins.
 */
function OfficerLogin() {
  return <RoleAuthPage roleKey="OFFICER" />;
}

export default function OfficerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030308] flex items-center justify-center text-slate-400 font-mono">Initializing Officer Portal...</div>}>
      <OfficerLogin />
    </Suspense>
  );
}
