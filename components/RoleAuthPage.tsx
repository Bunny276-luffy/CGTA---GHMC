"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, Mail, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface RoleAuthConfig {
  role: "CITIZEN" | "OFFICER" | "ADMIN" | "DEPT_HEAD";
  title: string;
  subtitle: string;
  description: string;
  portalRedirect: string;
  allowRegistration: boolean;
}

const ROLE_CONFIGS: Record<string, RoleAuthConfig> = {
  CITIZEN: {
    role: "CITIZEN",
    title: "Citizen Portal Access",
    subtitle: "Report and track civic grievances",
    description: "Sign in to file geotagged grievances, attach photo evidence, and track municipal resolution progress.",
    portalRedirect: "/citizen",
    allowRegistration: true,
  },
  OFFICER: {
    role: "OFFICER",
    title: "Field Officer Workspace",
    subtitle: "Field operations and resolution proof",
    description: "Authorized municipal field officers only. Access assigned grievances and submit onsite resolution evidence.",
    portalRedirect: "/officer",
    allowRegistration: false,
  },
  ADMIN: {
    role: "ADMIN",
    title: "Municipal Command Console",
    subtitle: "System oversight and jurisdiction management",
    description: "Authorized administrative personnel only. Monitor municipal grievance telemetry and audit policy logs.",
    portalRedirect: "/admin",
    allowRegistration: false,
  },
  DEPT_HEAD: {
    role: "DEPT_HEAD",
    title: "Department Head Access",
    subtitle: "Departmental workload oversight",
    description: "Authorized department heads only. Oversee departmental grievance pipelines and officer workload assignments.",
    portalRedirect: "/dept-head",
    allowRegistration: false,
  },
};

export function RoleAuthPage({ roleKey }: { roleKey: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const config = ROLE_CONFIGS[roleKey] || ROLE_CONFIGS.CITIZEN;

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pathname === "/register") {
      setIsLogin(false);
    }
  }, [pathname]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("error") === "unauthorized") {
      setError("Access denied: this account is not authorized for the requested portal.");
    }
  }, [pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { email, password }
        : { email, password, name, role: config.role };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      const userRole = data.user.role?.toUpperCase();
      const allowedRoles = config.role === "DEPT_HEAD"
        ? ["DEPT_HEAD", "ADMIN"]
        : config.role === "ADMIN"
          ? ["ADMIN", "DEPT_HEAD"]
          : [config.role];

      if (!allowedRoles.includes(userRole)) {
        throw new Error(
          `Access denied. Your account role (${userRole}) does not match this portal.`
        );
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      if (userRole === "ADMIN") {
        router.push("/admin");
      } else if (userRole === "OFFICER") {
        router.push("/officer");
      } else if (userRole === "DEPT_HEAD") {
        router.push("/dept-head");
      } else {
        router.push("/citizen");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 sm:p-8 shadow-md space-y-6 text-left">

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{config.title}</h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">{config.subtitle}</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
          {config.description}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 font-bold">
            <AlertCircle className="h-4 w-4 text-rose-700 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && config.allowRegistration && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@example.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[46px] pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-800"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : isLogin ? "Sign In to Portal" : "Create Account"}
          </button>
        </form>

        {/* Footer Toggle for Registration */}
        {config.allowRegistration && (
          <div className="text-center pt-2 border-t border-slate-200">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              {isLogin ? "Don't have an account? Register here" : "Already registered? Sign in"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
