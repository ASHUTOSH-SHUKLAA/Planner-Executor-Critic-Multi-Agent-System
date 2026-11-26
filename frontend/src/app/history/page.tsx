"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useResearch } from "@/lib/research-context";
import {
  WorkflowListItem,
  apiListWorkflows,
  apiDownloadWorkflow,
} from "@/lib/api";
import {
  Download,
  FileDown,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();
  const { isRunning, goal, elapsedSeconds, handleNewResearch } = useResearch();

  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchWorkflows = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiListWorkflows(token);
      setWorkflows(data || []);
    } catch (err: any) {
      error(err.message || "Failed to load workflow history", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkflows();
    } else {
      setWorkflows([]);
    }
  }, [token]);

  const handleDownload = async (workflowId: string, format: "md" | "txt" | "pdf") => {
    if (!token) return;
    setDownloadingId(`${workflowId}_${format}`);
    try {
      const { blob, filename } = await apiDownloadWorkflow(workflowId, format, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const item = (workflows || []).find((w) => w.workflow_id === workflowId);
      const rawTitle = item?.task || "";
      const taskSlug = rawTitle
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, "-")
        .slice(0, 55);
      const finalFilename =
        (!filename || filename.startsWith("synora_") || filename.startsWith("synora-")) && taskSlug
          ? `${taskSlug}.${format}`
          : (filename || `synora_report.${format}`);

      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success(`Report downloaded as ${format.toUpperCase()}`, "Download Complete");
    } catch (err: any) {
      error(err.message || "Download failed", "Download Error");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredWorkflows = (workflows || []).filter((w) =>
    (w.task || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasSavedToken = typeof window !== "undefined" && Boolean(localStorage.getItem("pec_token"));
  if (authLoading && !hasSavedToken && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <BrandMark className="h-12 w-12 animate-pulse mb-4" />
        <div className="h-4 w-4 border-2 border-[#6259b5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      <Navbar />

      <main className="history-screen flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dce2ee] dark:border-[#303b58] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1b2235] dark:text-[#ffffff]">
              Research Workflow History
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchWorkflows}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] text-xs font-semibold text-[#1b2235] dark:text-[#ffffff] hover:bg-[#eef1f8] dark:hover:bg-[#1b2235] transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <button
              type="button"
              onClick={() => {
                handleNewResearch();
                router.push("/");
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6259b5] hover:bg-[#51489d] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>New Research</span>
            </button>
          </div>
        </div>

        {/* Active Research Banner (if running in background) */}
        {isRunning && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#6259b5]/30 bg-[#efedff]/80 dark:bg-[#8980d8]/15 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6259b5] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6259b5]"></span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#1b2235] dark:text-[#ffffff] flex items-center gap-2">
                  <span>Deep Research in progress</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#6259b5]/10 dark:bg-[#8980d8]/30 text-[#6259b5] dark:text-[#c6c2fa]">
                    {elapsedSeconds}s elapsed
                  </span>
                </div>
                <p className="text-[11px] text-[#626b82] dark:text-[#a9b2c6] line-clamp-1 mt-0.5">
                  {goal || "Autonomous research loop running"}
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6259b5] hover:bg-[#51489d] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <span>Return to Live Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#626b82]" />
          <Input
            type="text"
            placeholder="Filter research tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] py-2.5 pl-10 pr-4 text-xs text-[#1b2235] dark:text-[#ffffff] placeholder-[#626b82] focus:border-[#6259b5] focus:outline-none focus:ring-1 focus:ring-[#6259b5] transition-colors"
          />
        </div>

        {/* Content Table / List */}
        {loading ? (
          <div className="rounded-2xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#0c1120] overflow-hidden shadow-xs animate-pulse">
            <div className="h-11 bg-[#eef1f8]/60 dark:bg-[#1b2438]/60 border-b border-[#dce2ee] dark:border-[#303b58]" />
            <div className="divide-y divide-[#dce2ee]/60 dark:divide-[#303b58]/60">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 max-w-md">
                    <div className="h-3.5 bg-[#e2e8f0] dark:bg-[#1e293b] rounded w-3/4" />
                    <div className="h-2.5 bg-[#e2e8f0]/60 dark:bg-[#1e293b]/60 rounded w-1/4" />
                  </div>
                  <div className="h-5 w-20 bg-[#e2e8f0] dark:bg-[#1e293b] rounded-full shrink-0" />
                  <div className="h-3.5 w-16 bg-[#e2e8f0] dark:bg-[#1e293b] rounded shrink-0 hidden sm:block" />
                  <div className="h-3.5 w-16 bg-[#e2e8f0] dark:bg-[#1e293b] rounded shrink-0 hidden sm:block" />
                  <div className="h-3.5 w-24 bg-[#e2e8f0] dark:bg-[#1e293b] rounded shrink-0 hidden sm:block" />
                  <div className="h-8 w-24 bg-[#e2e8f0] dark:bg-[#1e293b] rounded-xl shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="rounded-2xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-[#eef1f8] dark:bg-[#1b2235] flex items-center justify-center text-[#626b82] mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-[#1b2235] dark:text-[#ffffff] mb-1">
              {searchTerm ? "No matching workflows found" : "No research workflows yet"}
            </h3>
            <p className="text-xs text-[#626b82] dark:text-[#a9b2c6] max-w-sm mx-auto mb-6">
              {searchTerm
                ? "Try searching with different keywords."
                : "Execute a research task in the workspace to see it recorded here with full token telemetry and exportable reports."}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => {
                  handleNewResearch();
                  router.push("/");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6259b5] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#51489d] transition-colors cursor-pointer"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#0c1120] overflow-hidden shadow-xs">
            {/* Mobile Cards List (< sm screens) */}
            <div className="sm:hidden divide-y divide-[#dce2ee] dark:divide-[#303b58]">
              {filteredWorkflows.map((wf) => (
                <div
                  key={wf.workflow_id}
                  onClick={() => router.push(`/?workflow_id=${wf.workflow_id}`)}
                  className="p-4 hover:bg-[#f4f6fb] dark:hover:bg-[#1b2438] transition-colors cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-[#1b2235] dark:text-[#ffffff] line-clamp-2 leading-snug">
                        {wf.task || "Untitled Research"}
                      </h4>
                      <p className="text-[10px] text-[#626b82] font-mono mt-0.5">
                        ID: {wf.workflow_id}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        wf.status === "COMPLETED"
                          ? "bg-[#efedff] dark:bg-[#8980d8]/20 text-[#6259b5] dark:text-[#c6c2fa] border border-[#6259b5]/30"
                          : wf.status === "FAILED"
                          ? "bg-[#D62832]/10 text-[#D62832] border border-[#D62832]/30"
                          : "bg-[#12b9d5]/15 text-[#12b9d5] border border-[#12b9d5]/30"
                      }`}
                    >
                      {wf.status === "COMPLETED" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : wf.status === "FAILED" ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3 animate-spin" />
                      )}
                      <span>{wf.status}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#626b82] dark:text-[#a9b2c6] pt-1">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span>{(wf.total_tokens ?? 0).toLocaleString()} tok</span>
                      <span>•</span>
                      <span>${(wf.estimated_cost_usd ?? 0).toFixed(4)}</span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/?workflow_id=${wf.workflow_id}`)}
                        className="px-2 py-1 rounded-lg border border-[#6259b5]/30 bg-[#efedff]/60 dark:bg-[#8980d8]/20 text-[10px] font-semibold text-[#6259b5] dark:text-[#c6c2fa]"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(wf.workflow_id, "pdf")}
                        disabled={downloadingId === `${wf.workflow_id}_pdf`}
                        className="px-2 py-1 rounded-lg border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] text-[10px] font-medium text-rose-500"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDownload(wf.workflow_id, "md")}
                        disabled={downloadingId === `${wf.workflow_id}_md`}
                        className="px-2 py-1 rounded-lg border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] text-[10px] font-medium text-[#6259b5]"
                      >
                        MD
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / Tablet Table (Hidden on < sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1b2235] dark:text-[#ffffff]">
                <thead className="bg-[#eef1f8] dark:bg-[#1b2438] border-b border-[#dce2ee] dark:border-[#303b58] text-[11px] font-semibold uppercase tracking-wider text-[#626b82] dark:text-[#a9b2c6]">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Objective</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Tokens</th>
                    <th className="py-3.5 px-4">Cost (USD)</th>
                    <th className="py-3.5 px-4">Created At</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce2ee] dark:divide-[#303b58]">
                  {filteredWorkflows.map((wf) => (
                    <tr
                      key={wf.workflow_id}
                      onClick={() => router.push(`/?workflow_id=${wf.workflow_id}`)}
                      className="hover:bg-[#f4f6fb] dark:hover:bg-[#1b2438] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 sm:px-6 max-w-xs sm:max-w-md font-medium text-[#1b2235] dark:text-[#ffffff]">
                        <div className="line-clamp-2 group-hover:text-[#6259b5] dark:group-hover:text-[#c6c2fa] transition-colors">{wf.task}</div>
                        <div className="text-[10px] text-[#626b82] font-mono mt-0.5">
                          ID: {wf.workflow_id}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {wf.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#efedff] dark:bg-[#8980d8]/20 text-[#6259b5] dark:text-[#c6c2fa] border border-[#6259b5]/30 px-2 py-0.5 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>COMPLETED</span>
                          </span>
                        ) : wf.status === "FAILED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D62832]/10 text-[#D62832] border border-[#D62832]/30 px-2 py-0.5 text-[10px] font-semibold">
                            <XCircle className="h-3 w-3" />
                            <span>FAILED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#12b9d5]/15 text-[#12b9d5] border border-[#12b9d5]/30 px-2 py-0.5 text-[10px] font-semibold">
                            <Clock className="h-3 w-3 animate-spin" />
                            <span>{wf.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-[#1b2235] dark:text-[#ffffff]">
                        {(wf.total_tokens ?? 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-[#1b2235] dark:text-[#ffffff]">
                        ${(wf.estimated_cost_usd ?? 0).toFixed(5)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-[#626b82] dark:text-[#a9b2c6]">
                        {wf.created_at}
                      </td>
                      <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/?workflow_id=${wf.workflow_id}`)}
                            title="View Report in Workspace"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#6259b5]/30 bg-[#efedff]/60 dark:bg-[#8980d8]/20 text-[11px] font-semibold text-[#6259b5] dark:text-[#c6c2fa] hover:bg-[#6259b5] hover:text-white dark:hover:bg-[#8980d8] dark:hover:text-white transition-all shadow-xs cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDownload(wf.workflow_id, "pdf")}
                            disabled={downloadingId === `${wf.workflow_id}_pdf`}
                            title="Download Publication-Ready PDF Report"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] text-[11px] font-medium text-[#1b2235] dark:text-[#ffffff] hover:bg-[#eef1f8] dark:hover:bg-[#1b2235] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <FileDown className="h-3 w-3 text-rose-500" />
                            <span>.PDF</span>
                          </button>
                          <button
                            onClick={() => handleDownload(wf.workflow_id, "md")}
                            disabled={downloadingId === `${wf.workflow_id}_md`}
                            title="Download Markdown Report"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] text-[11px] font-medium text-[#1b2235] dark:text-[#ffffff] hover:bg-[#eef1f8] dark:hover:bg-[#1b2235] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <FileText className="h-3 w-3 text-[#6259b5]" />
                            <span>.MD</span>
                          </button>
                          <button
                            onClick={() => handleDownload(wf.workflow_id, "txt")}
                            disabled={downloadingId === `${wf.workflow_id}_txt`}
                            title="Download Plain Text Report"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] text-[11px] font-medium text-[#1b2235] dark:text-[#ffffff] hover:bg-[#eef1f8] dark:hover:bg-[#1b2235] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Download className="h-3 w-3 text-[#12b9d5]" />
                            <span>.TXT</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
