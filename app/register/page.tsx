"use client";

import { Suspense } from "react";
import { RoleAuthPage } from "@/components/RoleAuthPage";

/**
 * /register — Citizen Registration
 *
 * Reuses the citizen auth component in registration mode.
 */
function CitizenRegister() {
  return <RoleAuthPage roleKey="CITIZEN" />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030308] flex items-center justify-center text-slate-400 font-mono">Initializing Registration...</div>}>
      <CitizenRegister />
    </Suspense>
  );
}
