"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  AdminStats,
  AdminUser,
  AdminWorkflow,
  apiGetAdminStats,
  apiGetAdminUsers,
  apiGetAdminWorkflows,
  apiGetAdminServerLogs,
  apiDownloadWorkflow,
} from "@/lib/api";
import {
  ShieldCheck,
  Users,
  Layers,
  Cpu,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  UserCheck,
  Terminal,
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { token, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { error, success } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workflows, setWorkflows] = useState<AdminWorkflow[]>([]);
  const [serverLogs, setServerLogs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "logs">("overview");

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (!isAdmin) {
        error("Access denied: Administrative privileges required.", "Unauthorized");
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, u, w, l] = await Promise.all([
        apiGetAdminStats(token),
        apiGetAdminUsers(token),
        apiGetAdminWorkflows(token),
        apiGetAdminServerLogs(token).catch(() => ({ log_file: "logs/user_activity.log", total_lines: 0, content: "No server logs found." })),
      ]);
      setStats(s);
      setUsers(u);
      setWorkflows(w);
      setServerLogs(l.content);
    } catch (err: any) {
      error(err.message || "Failed to load admin data", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAdmin) {
      loadData();
    }
  }, [token, isAdmin]);

  const handleDownload = async (workflowId: string, format: "md" | "txt") => {
    if (!token) return;
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
      success(`Admin export: ${filename}`, "Download Complete");
    } catch (err: any) {
      error(err.message || "Download failed", "Error");
    }
  };

  if (authLoading || (!isAdmin && isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="h-7 w-7 rounded-full border-2 border-indigo-500/30 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Platform Administration
              </h1>
              <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5">
                GOVERNANCE & AUDIT
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Live system analytics, user registration registry, multi-agent workflows, and persistent server audit logs.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Real Metrics Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1">
                <Users className="h-4 w-4 text-indigo-500" />
                <span>Total Users</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                {stats.total_users}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1">
                <Layers className="h-4 w-4 text-sky-500" />
                <span>Total Workflows</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                {stats.total_tasks}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Completed Tasks</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.completed_tasks}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1">
                <Cpu className="h-4 w-4 text-purple-500" />
                <span>Total Tokens</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                {stats.total_tokens.toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span>Total Spend</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                ${stats.total_cost_usd.toFixed(4)}
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            System Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "users"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Registered Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Server Audit Trail</span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-zinc-500">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-600 animate-spin" />
            <p className="text-xs">Loading administrative telemetry...</p>
          </div>
        ) : activeTab === "overview" ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Task Objective</th>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Tokens</th>
                    <th className="py-3.5 px-4">Cost</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {workflows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No research workflows recorded yet.
                      </td>
                    </tr>
                  ) : (
                    workflows.map((wf) => (
                      <tr
                        key={wf.workflow_id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="py-4 px-4 sm:px-6 max-w-xs font-medium text-zinc-900 dark:text-white">
                          <div className="line-clamp-2">{wf.task}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {wf.workflow_id}
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">{wf.user_name}</div>
                          <div className="text-[10px] text-zinc-400">{wf.user_email}</div>
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
                        <td className="py-4 px-4 whitespace-nowrap font-mono">
                          {wf.total_tokens.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">
                          ${wf.estimated_cost_usd.toFixed(4)}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-zinc-500">
                          {wf.created_at}
                        </td>
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownload(wf.workflow_id, "md")}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Download Report"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "users" ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">User</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Total Tasks</th>
                    <th className="py-3.5 px-4 sm:px-6">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="py-4 px-4 sm:px-6 font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-indigo-500" />
                          <span>{u.name}</span>
                        </td>
                      <td className="py-4 px-4 font-mono">{u.email}</td>
                      <td className="py-4 px-4">
                        {u.role === "admin" ? (
                          <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                            Admin (Governance)
                          </span>
                        ) : (
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold px-2 py-0.5 uppercase">
                            Researcher
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-bold text-zinc-900 dark:text-white">
                        {u.total_tasks}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-zinc-500">{u.created_at}</td>
                    </tr>
                  )))
                }
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Logs Tab */
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 p-5 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-zinc-200">Server Audit Log Stream</span>
                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  logs/user_activity.log
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">Live Server Records</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed text-zinc-300 select-text font-mono text-[11px]">
              {serverLogs || "No server logs recorded yet."}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
