"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ResearchWorkspace } from "@/components/research-workspace";
import { BrandMark } from "@/components/brand-mark";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (isAdmin) {
        router.replace("/admin");
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  const hasSavedToken = typeof window !== "undefined" && Boolean(localStorage.getItem("pec_token"));
  if ((isLoading && !hasSavedToken && !isAuthenticated) || isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <BrandMark className="h-12 w-12 animate-pulse mb-4" />
        <div className="h-4 w-4 border-2 border-[#6259b5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
