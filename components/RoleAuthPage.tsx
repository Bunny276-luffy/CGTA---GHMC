"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import ThreeDAuthBackground from "@/components/ThreeDAuthBackground";

/**
 * Shared Role-Specific Authentication Component
 * 
 * Each role has its own login route and identity.
 * This component is reused across /login, /officer/login, /admin/login, /dept-head/login
 * but is locked to the specified role — no role-switching tabs.
 */

interface RoleAuthConfig {
  role: "CITIZEN" | "OFFICER" | "ADMIN" | "DEPT_HEAD";
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  portalRedirect: string;
  allowRegistration: boolean;
}

const ROLE_CONFIGS: Record<string, RoleAuthConfig> = {
  CITIZEN: {
    role: "CITIZEN",
    title: "Citizen Access",
    subtitle: "Report and track civic grievances",
    description: "Sign in to file grievances, upload evidence, and track complaint resolution status across GHMC municipal wards.",
    accentColor: "text-cyan-400",
    gradientFrom: "from-cyan-500",
    gradientTo: "to-blue-600",
    portalRedirect: "/citizen",
    allowRegistration: true,
  },
  OFFICER: {
    role: "OFFICER",
    title: "Field Officer Access",
    subtitle: "Field operations / assigned grievances / resolution evidence",
    description: "Authorized GHMC field officers only. Access assigned grievances, submit GPS-verified resolution evidence, and manage ward operations.",
    accentColor: "text-emerald-400",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-teal-600",
    portalRedirect: "/officer",
    allowRegistration: false,
  },
  ADMIN: {
    role: "ADMIN",
    title: "Municipal Administration",
    subtitle: "Operations / audit / policy / system management",
    description: "Authorized administrative personnel only. Monitor ward performance, resolve escalated tickets, and manage system-wide audit policies.",
    accentColor: "text-purple-400",
    gradientFrom: "from-purple-500",
    gradientTo: "to-indigo-600",
    portalRedirect: "/admin",
    allowRegistration: false,
  },
  DEPT_HEAD: {
    role: "DEPT_HEAD",
    title: "Department Head Access",
    subtitle: "Department-level oversight and grievance management",
    description: "Authorized department heads only. Oversee departmental grievance pipelines, review officer performance, and manage escalation workflows.",
    accentColor: "text-amber-400",
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-600",
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If this is the /register route, default to registration mode (citizens only)
  useEffect(() => {
    if (pathname === "/register") {
      setIsLogin(false);
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
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // Verify server-returned role matches expected role for this login page
      const userRole = data.user.role?.toUpperCase();
      
      // For DEPT_HEAD, the login API may return ADMIN role — both use /admin/login entry
      const allowedRoles = config.role === "DEPT_HEAD" 
        ? ["DEPT_HEAD", "ADMIN"]
        : config.role === "ADMIN" 
          ? ["ADMIN", "DEPT_HEAD"]
          : [config.role];

      if (!allowedRoles.includes(userRole)) {
        throw new Error(
          `Access denied. Your account role (${userRole}) does not match this portal. Please use the correct login page for your role.`
        );
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      // Set auth cookie for server-side middleware role verification
      document.cookie = `civictrust-auth=${btoa(JSON.stringify(data.user))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      // Route to the correct portal based on the actual server role
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
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-transparent overflow-hidden">
      {/* 3D Animated Background Shapes */}
      <ThreeDAuthBackground />

      {/* Radial gradients */}
      <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-md glass-panel-glow p-8 rounded-3xl border-white/5 z-10 bg-slate-950/75 backdrop-blur-lg text-left relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`} />

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <div className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center`}>
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-black tracking-wider text-white">
              CIVIC<span className={config.accentColor}>TRUST</span>
            </span>
          </Link>

          {/* Role Identity */}
          <h1 className={`text-base font-bold ${config.accentColor} font-mono uppercase tracking-wider`}>
            {config.title}
          </h1>
          <p className="text-[10px] font-mono text-slate-500 text-center mt-1 max-w-xs">
            {config.subtitle}
          </p>
        </div>

        {/* Role Description Badge */}
        <div className="mb-6 p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[10px] text-slate-400 font-mono leading-relaxed">
          {config.description}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && config.allowRegistration && (
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Yashasvi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/5 focus:border-indigo-500/35 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 focus:border-indigo-500/35 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 focus:border-indigo-500/35 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} hover:opacity-95 rounded-xl text-xs font-bold text-white transition-all mt-6 disabled:opacity-50 shadow-md`}
          >
            <span className="relative flex items-center justify-center gap-1.5 uppercase tracking-widest font-mono text-[10px]">
              {loading ? "Authenticating..." : isLogin ? "Access Portal" : "Create Account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </span>
          </button>
        </form>

        {/* Toggle login/register — only for citizens */}
        {config.allowRegistration && (
          <div className="mt-6 text-center text-xs text-slate-500">
            {isLogin ? (
              <p>
                New citizen?{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`${config.accentColor} hover:underline font-bold`}
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`${config.accentColor} hover:underline font-bold`}
                >
                  Sign In here
                </button>
              </p>
            )}
          </div>
        )}

        {/* Back to home */}
        <div className="mt-4 text-center">
          <Link href="/" className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to CivicTrust Home
          </Link>
        </div>
      </div>
    </div>
  );
}
