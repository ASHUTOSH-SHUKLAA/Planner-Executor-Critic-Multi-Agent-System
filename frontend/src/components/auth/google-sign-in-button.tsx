"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AlertCircle, CheckCircle2, ExternalLink, X } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          cancel: () => void;
        };
        oauth2: {
          initCodeClient: (config: any) => { requestCode: () => void };
          initTokenClient: (config: any) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode?: "login" | "signup";
  onError?: (error: string) => void;
  className?: string;
}

export function GoogleSignInButton({
  mode = "login",
  onError,
  className = "",
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const { loginWithGoogle, googleClientId } = useAuth();
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const nativeBtnRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response?.credential) {
        onError?.("Google sign-in did not return valid credentials. Please try again.");
        return;
      }

      setIsLoading(true);
      try {
        const auth = await loginWithGoogle(response.credential);
        if (auth?.user?.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/");
        }
      } catch (err: any) {
        console.error("Google auth error:", err);
        onError?.(err.message || "Failed to authenticate with Google. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithGoogle, onError, router]
  );

  // 1. Asynchronously load the official Google Identity Services script
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.accounts?.id) {
      setIsGsiLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGsiLoaded(true);
    };
    script.onerror = () => {
      console.warn("Failed to load Google Identity Services SDK");
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount to prevent repeated re-loads
    };
  }, []);

  // 2. Initialize Google Identity Services when script & client_id are ready
  useEffect(() => {
    if (!isGsiLoaded || !googleClientId || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render hidden native button into ref so we can trigger it programmatically
      if (nativeBtnRef.current) {
        nativeBtnRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(nativeBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: mode === "signup" ? "signup_with" : "signin_with",
        });
      }
    } catch (e) {
      console.warn("Could not initialize Google Identity Services:", e);
    }
  }, [isGsiLoaded, googleClientId, handleCredentialResponse, mode]);

  const handleClick = () => {
    if (isLoading) return;

    // If client ID is missing, show helpful config modal
    if (!googleClientId) {
      setShowConfigModal(true);
      return;
    }

    // Trigger Google Identity Services One-Tap prompt or click the native rendered button
    if (window.google?.accounts?.id) {
      try {
        // Find iframe button in container and click it
        const googleIframe = nativeBtnRef.current?.querySelector("iframe, div[role='button']");
        if (googleIframe) {
          (googleIframe as HTMLElement).click();
          return;
        }

        // Fallback to prompt
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("One-tap dismissed or skipped:", notification.getNotDisplayedReason?.());
          }
        });
      } catch (err) {
        console.warn("Error triggering Google prompt:", err);
      }
    } else {
      setShowConfigModal(true);
    }
  };

  return (
    <>
      {/* Hidden container holding Google's native iframe button */}
      <div ref={nativeBtnRef} className="hidden" aria-hidden="true" />

      {/* Sleek, Brand-Compliant Google Sign-In Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-3 rounded-xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#131b2e] py-2.5 px-4 text-sm font-medium text-[#1b2235] dark:text-[#ffffff] shadow-sm hover:bg-[#f4f6fb] dark:hover:bg-[#1b2438] hover:border-[#c5cee0] dark:hover:border-[#425078] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-[#6259b5] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-[#6259b5] dark:text-[#c6c2fa]">
              Connecting to Google...
            </span>
          </div>
        ) : (
          <>
            {/* Authentic Multi-Color Google "G" Icon */}
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-medium">
              {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
            </span>
          </>
        )}
      </button>

      {/* Helpful Setup Guidance Modal if Google Client ID is not yet configured */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#626b82] dark:text-[#a9b2c6] hover:bg-[#eef1f8] dark:hover:bg-[#131b2e] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#6259b5]/10 dark:bg-[#8980d8]/20 flex items-center justify-center text-[#6259b5] dark:text-[#c6c2fa]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1b2235] dark:text-[#ffffff]">
                  Google Sign-In Setup
                </h3>
                <p className="text-xs text-[#626b82] dark:text-[#a9b2c6]">
                  One-time configuration required
                </p>
              </div>
            </div>

            <p className="text-xs text-[#626b82] dark:text-[#a9b2c6] leading-relaxed mb-4">
              To enable one-click Google Sign-In, please add your Google OAuth 2.0 Client ID to your environment variables:
            </p>

            <div className="rounded-xl bg-[#f4f6fb] dark:bg-[#0c1120] border border-[#dce2ee] dark:border-[#303b58] p-3 text-xs font-mono text-[#1b2235] dark:text-[#a9b2c6] space-y-1.5 mb-4">
              <div>
                <span className="text-[#6259b5] dark:text-[#c6c2fa]"># In backend .env or Render:</span>
                <br />
                GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
              </div>
              <div className="pt-1 border-t border-[#dce2ee] dark:border-[#303b58]">
                <span className="text-[#6259b5] dark:text-[#c6c2fa]"># In Vercel / frontend .env:</span>
                <br />
                NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#6259b5] dark:text-[#c6c2fa] hover:underline font-medium"
              >
                <span>Google Cloud Console</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-[#6259b5] text-white text-xs font-semibold hover:bg-[#51489d] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
