"use client";

import { Suspense } from "react";
import { RoleAuthPage } from "@/components/RoleAuthPage";

/**
 * /login — Citizen Authentication
 *
 * This is the public citizen login page. Officers, Admins, and Department Heads
 * have their own separate login routes.
 */
function CitizenLogin() {
  return <RoleAuthPage roleKey="CITIZEN" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030308] flex items-center justify-center text-slate-400 font-mono">Initializing Citizen Portal...</div>}>
      <CitizenLogin />
    </Suspense>
  );
}
