"use client";

import { Suspense } from "react";
import { RoleAuthPage } from "@/components/RoleAuthPage";

/**
 * /dept-head/login — Department Head Authentication
 * 
 * Completely separate from citizen and officer access points.
 * Department Head accounts are provisioned internally by administrators.
 */
function DeptHeadLogin() {
  return <RoleAuthPage roleKey="DEPT_HEAD" />;
}

export default function DeptHeadLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030308] flex items-center justify-center text-slate-400 font-mono">Initializing Department Console...</div>}>
      <DeptHeadLogin />
    </Suspense>
  );
}
