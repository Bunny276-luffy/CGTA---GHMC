"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import ThreeDAuthBackground from "@/components/ThreeDAuthBackground";

type Role = "CITIZEN" | "OFFICER" | "ADMIN";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>("CITIZEN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pathname === "/register") {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [pathname]);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "citizen") setRole("CITIZEN");
    else if (roleParam === "officer") setRole("OFFICER");
    else if (roleParam === "admin") setRole("ADMIN");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin 
        ? { email, password } 
        : { email, password, name, role };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else if (data.user.role === "OFFICER") {
        router.push("/officer");
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
      {/* 3D Animated Background Shapes (Stationary wireframes) */}
      <ThreeDAuthBackground />

      {/* Radial gradients to match cosmic theme */}
      <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Clean Centered Auth Card */}
      <div className="w-full max-w-md glass-panel-glow p-8 rounded-3xl border-white/5 z-10 bg-slate-950/75 backdrop-blur-lg text-left relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-650" />
        
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-black tracking-wider text-white">
              CIVIC<span className="text-indigo-400">TRUST</span>
            </span>
          </Link>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            {isLogin ? "Authenticate credentials" : "Register new ledger node"}
          </p>
        </div>

        {/* Custom Role Selector with glowing tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/60 p-1 rounded-xl mb-6 border border-white/5">
          {(["CITIZEN", "OFFICER", "ADMIN"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all ${
                role === r 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {r === "ADMIN" ? "Admin" : r === "OFFICER" ? "Officer" : "Citizen"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Email Coordinates</label>
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
            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Ledger Key (Password)</label>
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
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-650 hover:opacity-95 rounded-xl text-xs font-bold text-white transition-all mt-6 disabled:opacity-50 shadow-md shadow-indigo-500/10"
          >
            <span className="relative flex items-center justify-center gap-1.5 uppercase tracking-widest font-mono text-[10px]">
              {loading ? "Locking Secure Session..." : isLogin ? "Access Portal" : "Register Node"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          {isLogin ? (
            <p>
              New node user?{" "}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-indigo-400 hover:underline font-bold"
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
                className="text-indigo-400 hover:underline font-bold"
              >
                Sign In here
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
