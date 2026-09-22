"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Bot, Lock, User, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#09090b] text-zinc-100 px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Brand Link */}
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
          <Bot className="h-6 w-6" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white">AegisAgent</div>
      </Link>

      {/* Login Card */}
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h1>
          <p className="text-xs text-zinc-400 mt-1">Access the live multi-agent orchestration studio</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="developer"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-300">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Signing In...</span>
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col gap-3 text-center text-xs text-zinc-400">
          <div>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create an account
            </Link>
          </div>
          <div>
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">
              Continue to Studio as Guest →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
