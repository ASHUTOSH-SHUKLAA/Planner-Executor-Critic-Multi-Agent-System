"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { OtpInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/brand-mark";
import { User, Mail, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { requestCode, verifyCode, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [smtpSent, setSmtpSent] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (isAdmin) {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestCode(cleanEmail, cleanName);
      setSmtpSent(res.smtp_sent ?? true);
      setStep("code");
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.trim().length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      const auth = await verifyCode(email.trim().toLowerCase(), code.trim(), name.trim());
      if (auth.user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent flash of signup panel when already authenticated or loading auth state
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <BrandMark className="h-12 w-12 animate-pulse mb-4" />
        <div className="h-4 w-4 border-2 border-[#6259b5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="auth-screen min-h-screen flex flex-col justify-center items-center bg-[var(--bg)] text-[var(--text)] px-4 py-12 relative overflow-hidden transition-colors duration-200">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] bg-[#6259b5]/10 dark:bg-[#8980d8]/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group relative z-10">
        <BrandMark className="h-10 w-10 shrink-0 transition-transform group-hover:scale-105" />
        <div className="text-xl font-bold tracking-tight text-[#1b2235] dark:text-[#ffffff]">
          <span>Synora</span>
        </div>
      </Link>

      {/* Signup Card */}
      <div className="auth-card w-full max-w-sm rounded-2xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] p-7 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1b2235] dark:text-[#ffffff] tracking-tight">
            {step === "details" ? "Create an account" : "Check your email"}
          </h1>
          <p className="text-xs text-[#626b82] dark:text-[#a9b2c6] mt-1.5">
            {step === "details"
              ? "Autonomous multi-agent research platform"
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-[#D62832]/10 border border-[#D62832]/30 p-3 text-xs text-[#D62832] dark:text-[#ff8a90] flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[#D62832] flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === "details" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1b2235] dark:text-[#ffffff] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#626b82] dark:text-[#a9b2c6]" />
                <Input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#0c1120] py-2.5 pl-10 pr-4 text-sm text-[#1b2235] dark:text-[#ffffff] placeholder-[#626b82]/60 dark:placeholder-[#a9b2c6]/60 focus:border-[#6259b5] focus:outline-none focus:ring-1 focus:ring-[#6259b5] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1b2235] dark:text-[#ffffff] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#626b82] dark:text-[#a9b2c6]" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#0c1120] py-2.5 pl-10 pr-4 text-sm text-[#1b2235] dark:text-[#ffffff] placeholder-[#626b82]/60 dark:placeholder-[#a9b2c6]/60 focus:border-[#6259b5] focus:outline-none focus:ring-1 focus:ring-[#6259b5] transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6259b5] py-2.5 text-sm font-semibold text-white shadow-md shadow-[#6259b5]/20 hover:bg-[#51489d] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Sending code...</span>
                </span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#1b2235] dark:text-[#ffffff]">
                  Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setCode("");
                    setError(null);
                  }}
                  className="text-[11px] text-[#6259b5] dark:text-[#c6c2fa] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" /> Change
                </button>
              </div>

              <p className="text-xs text-[#626b82] dark:text-[#a9b2c6] mb-2.5">
                Enter the 6-digit code sent to <span className="font-semibold text-[#1b2235] dark:text-[#ffffff]">{email}</span>.
              </p>

              <OtpInput value={code} onChange={setCode} autoFocus />

              {!smtpSent && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Outbound SMTP is not configured in <code className="px-1 py-0.5 rounded bg-amber-500/15 font-mono">.env</code>. Check your server terminal for the OTP, or configure Gmail SMTP in <code className="px-1 py-0.5 rounded bg-amber-500/15 font-mono">.env</code> to deliver codes directly to your inbox.
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6259b5] py-2.5 text-sm font-semibold text-white shadow-md shadow-[#6259b5]/20 hover:bg-[#51489d] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Verifying...</span>
                </span>
              ) : (
                <span>Continue</span>
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                disabled={resendCountdown > 0 || isLoading}
                onClick={handleSendCode}
                className="text-xs text-[#626b82] dark:text-[#a9b2c6] hover:text-[#6259b5] dark:hover:text-[#c6c2fa] disabled:opacity-50 cursor-pointer transition-colors"
              >
                {resendCountdown > 0 ? (
                  <span>Resend code in {resendCountdown}s</span>
                ) : (
                  <span>Didn&apos;t receive code? Resend</span>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#dce2ee] dark:border-[#303b58] text-center text-xs text-[#626b82] dark:text-[#a9b2c6]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#6259b5] dark:text-[#c6c2fa] hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
