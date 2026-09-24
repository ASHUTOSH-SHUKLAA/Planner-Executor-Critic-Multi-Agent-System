"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  WorkflowListItem,
  apiListWorkflows,
  apiDownloadWorkflow,
} from "@/lib/api";
import {
  History,
  Download,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();

  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchWorkflows = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiListWorkflows(token);
      setWorkflows(data);
    } catch (err: any) {
      error(err.message || "Failed to load workflow history", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkflows();
    }
  }, [token]);

  const handleDownload = async (workflowId: string, format: "md" | "txt") => {
    if (!token) return;
    setDownloadingId(`${workflowId}_${format}`);
    try {
      const { blob, filename } = await apiDownloadWorkflow(workflowId, format, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
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

  const filteredWorkflows = workflows.filter((w) =>
    w.task.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <History className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Research Workflow History
              </h1>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Persistent record of all multi-agent research executions, token telemetry, and verified deliverables.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchWorkflows}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>New Research</span>
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Filter research tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 py-2.5 pl-10 pr-4 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Content Table / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-zinc-500">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-600 animate-spin" />
            <p className="text-xs">Loading workflow history...</p>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              {searchTerm ? "No matching workflows found" : "No research workflows yet"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
              {searchTerm
                ? "Try searching with different keywords."
                : "Execute a research task in the workspace to see it recorded here with full token telemetry and exportable reports."}
            </p>
            {!searchTerm && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Objective</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Tokens</th>
                    <th className="py-3.5 px-4">Cost (USD)</th>
                    <th className="py-3.5 px-4">Created At</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {filteredWorkflows.map((wf) => (
                    <tr
                      key={wf.workflow_id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6 max-w-xs sm:max-w-md font-medium text-zinc-900 dark:text-white">
                        <div className="line-clamp-2">{wf.task}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          ID: {wf.workflow_id}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {wf.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>COMPLETED</span>
                          </span>
                        ) : wf.status === "FAILED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 text-[10px] font-semibold">
                            <XCircle className="h-3 w-3" />
                            <span>FAILED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold">
                            <Clock className="h-3 w-3 animate-spin" />
                            <span>{wf.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-zinc-700 dark:text-zinc-300">
                        {wf.total_tokens.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-zinc-700 dark:text-zinc-300">
                        ${wf.estimated_cost_usd.toFixed(5)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-zinc-500">
                        {wf.created_at}
                      </td>
                      <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownload(wf.workflow_id, "md")}
                            disabled={downloadingId === `${wf.workflow_id}_md`}
                            title="Download Markdown Report"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <FileText className="h-3 w-3 text-indigo-500" />
                            <span>.MD</span>
                          </button>
                          <button
                            onClick={() => handleDownload(wf.workflow_id, "txt")}
                            disabled={downloadingId === `${wf.workflow_id}_txt`}
                            title="Download Plain Text Report"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Download className="h-3 w-3 text-sky-500" />
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
