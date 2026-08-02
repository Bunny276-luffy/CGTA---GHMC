"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Mail, Lock, User, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

type Role = "CITIZEN" | "OFFICER" | "ADMIN";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>("CITIZEN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read role from query params if available
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

      // Store auth session
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      // Redirect depending on user role
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#030308] px-6 py-12">
      {/* Background Orbs */}
      <div className="absolute top-[20%] left-[20%] h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md glass-panel-glow p-8 rounded-2xl border-white/10 z-10 transition-all duration-500">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-md font-black tracking-wider text-white">
              CIVIC<span className="text-cyan-400">TRUST</span>
            </span>
          </Link>
          <p className="text-xs text-slate-400">
            {isLogin ? "Authenticate to access security credentials" : "Create new verified identity"}
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-xl mb-6 border border-white/5">
          {(["CITIZEN", "OFFICER", "ADMIN"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                role === r 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r === "ADMIN" ? "Admin" : r === "OFFICER" ? "Officer" : "Citizen"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Yashasvi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 focus:border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 focus:border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Security Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 focus:border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden rounded-xl py-3.5 text-xs font-bold text-white transition-all mt-6 disabled:opacity-50"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300" />
            <span className="relative flex items-center justify-center gap-1.5">
              {loading ? "Authorizing Secure Shell..." : isLogin ? "Access Portal" : "Register Identity"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {isLogin ? (
            <p>
              New user?{" "}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-cyan-400 hover:underline font-semibold"
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
                className="text-cyan-400 hover:underline font-semibold"
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
