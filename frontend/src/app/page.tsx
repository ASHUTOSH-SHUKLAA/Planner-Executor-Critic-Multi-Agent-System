"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ResearchWorkspace } from "@/components/research-workspace";
import { LandingView } from "@/components/landing-view";
import { BrandMark } from "@/components/brand-mark";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdmin) {
      router.replace("/admin");
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  // While auth is resolving AND we have a saved token, show the loading screen
  const hasSavedToken = typeof window !== "undefined" && Boolean(localStorage.getItem("pec_token"));
  const authResolving = isLoading || (hasSavedToken && !isAuthenticated);

  if (authResolving || (isAuthenticated && isAdmin)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <BrandMark className="h-12 w-12 animate-pulse mb-4" />
        <div className="h-4 w-4 border-2 border-[#6259b5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // When validated and authenticated as a researcher, load the Research Workspace
  if (isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
            <BrandMark className="h-12 w-12 animate-pulse mb-4" />
            <div className="h-4 w-4 border-2 border-[#6259b5] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ResearchWorkspace />
      </Suspense>
    );
  }

  // When not authenticated, present the public Landing Page (requires sign-in to research)
  return <LandingView />;
}
