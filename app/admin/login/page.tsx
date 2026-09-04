"use client";

import { Suspense } from "react";
import { RoleAuthPage } from "@/components/RoleAuthPage";

/**
 * /admin/login — Municipal Administration Authentication
 * 
 * Completely separate from citizen and officer access points.
 * Admin and Department Head accounts are provisioned internally.
 */
function AdminLogin() {
  return <RoleAuthPage roleKey="ADMIN" />;
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030308] flex items-center justify-center text-slate-400 font-mono">Initializing Admin Console...</div>}>
      <AdminLogin />
    </Suspense>
  );
}
