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
  Workflow,
  UsersRound,
  ScrollText,
  Cpu,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  UserCheck,
  Eye,
  X,
  Filter,
  Search,
  Copy,
  Check,
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
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isAdmin) {
        error("Access denied: Administrative privileges required.", "Unauthorized");
        router.replace("/");
      }
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const loadData = async (userFilter: AdminUser | null = selectedUser) => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, u, w, l] = await Promise.all([
        apiGetAdminStats(token),
        apiGetAdminUsers(token),
        apiGetAdminWorkflows(token, userFilter ? userFilter.id : undefined),
        apiGetAdminServerLogs(token).catch(() => ({
          log_file: "logs/user_activity.log",
          total_lines: 0,
          content: "No server logs found.",
        })),
      ]);
      if (s) setStats(s);
      if (u) setUsers(u);
      if (w) setWorkflows(w);
      setServerLogs(l?.content || "No server logs found.");
    } catch (err: any) {
      error(err.message || "Failed to load admin data", "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (u: AdminUser | null) => {
    if (!token) return;
    setSelectedUser(u);
    setLoading(true);
    try {
      const w = await apiGetAdminWorkflows(token, u ? u.id : undefined);
      setWorkflows(w);
      setActiveTab("overview");
    } catch (err: any) {
      error(err.message || "Failed to load user workflows", "Error");
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
    setDownloadingId(workflowId);
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
    } finally {
      setDownloadingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    success("Copied to clipboard", "Copied");
  };

  const filteredWorkflows = workflows.filter((wf) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (wf.task || "").toLowerCase().includes(q) ||
      (wf.workflow_id || "").toLowerCase().includes(q) ||
      (wf.user_name || "").toLowerCase().includes(q) ||
      (wf.user_email || "").toLowerCase().includes(q) ||
      (wf.status || "").toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    if (!userSearchTerm.trim()) return true;
    const q = userSearchTerm.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  if (authLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 rounded-full border-2 border-[#6259b5]/30 border-t-[#6259b5] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      <Navbar />

      <main className="admin-console flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Header - Clean text-only title and description (logo and live telemetry removed as requested) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-zinc-200 dark:border-zinc-800/80 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
              Centralized multi-agent orchestrator telemetry, researcher accounts, workflow lifecycle monitoring, and system audit logs.
            </p>
          </div>

          <div className="flex items-center self-start sm:self-auto shrink-0">
            <button
              onClick={() => loadData(selectedUser)}
              disabled={loading}
              className="admin-refresh-btn"
              title="Refresh platform telemetry"
            >
              <RefreshCw className={`h-4 w-4 text-white ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Real metrics grid uses the Synora brand palette and semantic status colors. */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Users - Brand Electric Iris */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6259b5] to-[#c6c2fa]" />
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Users
                </span>
                <div className="p-2 rounded-xl bg-[#6259b5]/10 text-[#6259b5] dark:text-[#c6c2fa] group-hover:scale-110 transition-transform">
                  <UsersRound className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                {stats.total_users}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Registered researchers
              </div>
            </div>

            {/* Card 2: Total Workflows - Radiant Teal */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0d9488] to-[#12B9D5]" />
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Workflows
                </span>
                <div className="p-2 rounded-xl bg-[#12B9D5]/20 text-[#0d9488] dark:text-[#12B9D5] group-hover:scale-110 transition-transform">
                  <Workflow className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                {stats.total_tasks}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Multi-agent executions
              </div>
            </div>

            {/* Card 3: Completed Tasks - Emerald Success */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-400" />
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Completed Tasks
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.completed_tasks}
              </div>
              <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
                {stats.total_tasks > 0
                  ? `${((stats.completed_tasks / stats.total_tasks) * 100).toFixed(0)}% completion rate`
                  : "100% completion"}
              </div>
            </div>

            {/* Card 4: Total Tokens - Violet / Iris */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-[#c6c2fa]" />
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Tokens
                </span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <Cpu className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight">
                {stats.total_tokens.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                LLM prompt & completion
              </div>
            </div>

            {/* Card 5: Total Spend - Honey Gold / Warm Amber */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-[#F3B765]" />
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Spend
                </span>
                <div className="p-2 rounded-xl bg-[#F3B765]/20 text-[#b45309] dark:text-[#F3B765] group-hover:scale-110 transition-transform">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight">
                ${stats.total_cost_usd.toFixed(4)}
              </div>
              <div className="text-[11px] text-amber-600/80 dark:text-[#F3B765]/80 mt-1 font-mono">
                USD Cumulative
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls - Interactive Segmented Tabs */}
        <div
          className="admin-tabs"
          role="tablist"
          aria-label="Administration sections"
        >
          <button
            onClick={() => setActiveTab("overview")}
            role="tab"
            aria-selected={activeTab === "overview"}
            className="group cursor-pointer"
          >
            <Workflow
              className={`h-4 w-4 transition-transform duration-200 ${
                activeTab === "overview"
                  ? "text-[#6259b5] dark:text-[#c6c2fa] scale-110"
                  : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
              }`}
            />
            <span className="font-semibold">
              {selectedUser
                ? `${(selectedUser.name || "User").split(" ")[0]}'s Workflows`
                : "System Workflows"}
            </span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-[#6259b5]/15 text-[#6259b5] dark:bg-[#c6c2fa]/20 dark:text-[#c6c2fa]"
                  : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-300/70"
              }`}
            >
              {workflows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            role="tab"
            aria-selected={activeTab === "users"}
            className="group cursor-pointer"
          >
            <UsersRound
              className={`h-4 w-4 transition-transform duration-200 ${
                activeTab === "users"
                  ? "text-[#0d9488] dark:text-[#12B9D5] scale-110"
                  : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
              }`}
            />
            <span className="font-semibold">Registered Users</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                activeTab === "users"
                  ? "bg-[#12B9D5]/25 text-[#0d9488] dark:bg-[#12B9D5]/20 dark:text-[#12B9D5]"
                  : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-300/70"
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            role="tab"
            aria-selected={activeTab === "logs"}
            className="group cursor-pointer"
          >
            <ScrollText
              className={`h-4 w-4 transition-transform duration-200 ${
                activeTab === "logs"
                  ? "text-emerald-500 scale-110"
                  : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
              }`}
            />
            <span className="font-semibold">Server Audit Trail</span>
            <span
              className={`h-2 w-2 rounded-full transition-all ${
                activeTab === "logs"
                  ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20"
                  : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            />
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 text-zinc-500">
            <div className="h-8 w-8 rounded-full border-2 border-[#6259b5]/30 border-t-[#6259b5] animate-spin" />
            <p className="text-xs font-medium">Loading administrative telemetry...</p>
          </div>
        ) : activeTab === "overview" ? (
          /* WORKFLOW COMPONENT - Enhanced, Spacious, Efficient & Non-overlapping */
          <div className="flex flex-col gap-4">
            {/* Filter & Search Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter workflows by objective, ID, or researcher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#6259b5]/30 focus:border-[#6259b5] transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* User Filter Indicator or Total Count */}
              <div className="flex items-center gap-3">
                {selectedUser && (
                  <div className="inline-flex items-center gap-2 bg-[#6259b5]/10 text-[#6259b5] dark:text-[#c6c2fa] border border-[#6259b5]/25 rounded-xl px-3 py-1.5 text-xs font-medium">
                    <Filter className="h-3.5 w-3.5" />
                    <span>
                      Researcher: <strong>{selectedUser.name}</strong>
                    </span>
                    <button
                      onClick={() => handleSelectUser(null)}
                      className="hover:bg-[#6259b5]/20 p-1 rounded-full transition-colors cursor-pointer"
                      title="Clear user filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Showing <strong>{filteredWorkflows.length}</strong> of {workflows.length} workflows
                </span>
              </div>
            </div>

            {/* Spacious Table Container */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400 border-collapse">
                  <thead className="bg-zinc-100/90 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th scope="col" className="py-3.5 px-6 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 w-[36%] min-w-[240px]">
                        Task Objective
                      </th>
                      <th scope="col" className="py-3.5 px-6 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 w-[18%] min-w-[140px]">
                        Researcher
                      </th>
                      <th scope="col" className="py-3.5 px-5 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 w-[11%] min-w-[100px]">
                        Status
                      </th>
                      <th scope="col" className="py-3.5 px-5 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 w-[10%] min-w-[85px]">
                        Tokens
                      </th>
                      <th scope="col" className="py-3.5 px-5 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 w-[9%] min-w-[80px]">
                        Est. Cost
                      </th>
                      <th scope="col" className="py-3.5 px-5 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 w-[11%] min-w-[95px]">
                        Date
                      </th>
                      <th scope="col" className="py-3.5 px-6 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 text-right w-[10%] min-w-[90px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                    {filteredWorkflows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-[#6259b5]/10 text-[#6259b5] dark:text-[#c6c2fa] flex items-center justify-center">
                              <Workflow className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                              No workflows found
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                              {searchTerm
                                ? `No workflows match "${searchTerm}". Try resetting your search filter.`
                                : selectedUser
                                ? `No workflows recorded for ${selectedUser.name}.`
                                : "No research workflows recorded yet in the database."}
                            </p>
                            {searchTerm && (
                              <button
                                onClick={() => setSearchTerm("")}
                                className="mt-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#6259b5] dark:text-[#c6c2fa] bg-[#6259b5]/10 hover:bg-[#6259b5]/20 transition-colors cursor-pointer"
                              >
                                Clear search
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredWorkflows.map((wf) => (
                        <tr
                          key={wf.workflow_id}
                          className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors"
                        >
                          {/* Task Objective */}
                          <td className="py-4.5 px-6 align-middle">
                            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug break-words">
                              {wf.task}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800 truncate max-w-[220px]">
                                {wf.workflow_id}
                              </span>
                              <button
                                onClick={() => copyToClipboard(wf.workflow_id, wf.workflow_id)}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                title="Copy workflow ID"
                              >
                                {copiedId === wf.workflow_id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Researcher */}
                          <td className="py-4.5 px-6 align-middle">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#6259b5] to-[#12B9D5] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                                {(wf.user_name || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                  {wf.user_name || "Unknown"}
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono truncate">
                                  {wf.user_email || "no email"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4.5 px-5 whitespace-nowrap align-middle">
                            {wf.status === "COMPLETED" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span>COMPLETED</span>
                              </span>
                            ) : wf.status === "FAILED" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-1 text-[11px] font-semibold">
                                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                                <span>FAILED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B9D5]/15 text-[#0d9488] dark:text-[#12B9D5] border border-[#12B9D5]/30 px-2.5 py-1 text-[11px] font-semibold">
                                <Clock className="h-3.5 w-3.5 animate-spin" />
                                <span>{wf.status || "RUNNING"}</span>
                              </span>
                            )}
                          </td>

                          {/* Tokens */}
                          <td className="py-4.5 px-5 whitespace-nowrap align-middle">
                            <span className="inline-flex items-center gap-1 font-mono font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-100/70 dark:bg-zinc-900/70 px-2.5 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                              <Cpu className="h-3 w-3 text-purple-500" />
                              {wf.total_tokens.toLocaleString()}
                            </span>
                          </td>

                          {/* Est. Cost */}
                          <td className="py-4.5 px-5 whitespace-nowrap align-middle">
                            <span className="inline-flex items-center font-mono font-medium text-amber-600 dark:text-[#F3B765] bg-amber-500/10 dark:bg-[#F3B765]/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                              ${wf.estimated_cost_usd.toFixed(4)}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-4.5 px-5 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-xs align-middle">
                            {wf.created_at}
                          </td>

                          {/* Actions */}
                          <td className="py-4.5 px-6 whitespace-nowrap text-right align-middle">
                            <button
                              onClick={() => handleDownload(wf.workflow_id, "md")}
                              disabled={downloadingId === wf.workflow_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-[#6259b5] dark:hover:text-[#c6c2fa] hover:border-[#6259b5]/30 hover:bg-[#efedff]/50 dark:hover:bg-[#8980d8]/10 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                              title="Download Markdown Report"
                            >
                              {downloadingId === wf.workflow_id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#6259b5]" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-[#6259b5] dark:text-[#c6c2fa]" />
                              )}
                              <span>Export .md</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === "users" ? (
          /* USERS COMPONENT - Enhanced, Spacious & Consistent */
          <div className="flex flex-col gap-4">
            {/* User Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter users by name, email, or role..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#6259b5]/30 focus:border-[#6259b5] transition-all"
                />
                {userSearchTerm && (
                  <button
                    onClick={() => setUserSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing <strong>{filteredUsers.length}</strong> of {users.length} registered researchers
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400 border-collapse table-auto">
                  <thead className="bg-zinc-100/90 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th scope="col" className="py-3.5 px-6 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 min-w-[220px]">
                        User
                      </th>
                      <th scope="col" className="py-3.5 px-6 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 min-w-[220px]">
                        Email
                      </th>
                      <th scope="col" className="py-3.5 px-5 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 min-w-[130px]">
                        Role
                      </th>
                      <th scope="col" className="py-3.5 px-5 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 min-w-[120px]">
                        Total Tasks
                      </th>
                      <th scope="col" className="py-3.5 px-5 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 min-w-[140px]">
                        Joined Date
                      </th>
                      <th scope="col" className="py-3.5 px-6 font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 text-right min-w-[140px]">
                        Workflow History
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-zinc-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <UsersRound className="h-8 w-8 text-zinc-400" />
                            <p className="text-sm font-semibold">No registered users found.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                          title={`Click to view ${u.name}'s workflow history`}
                        >
                          <td className="py-4.5 px-6 font-medium text-zinc-900 dark:text-white align-middle">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#6259b5] to-[#12B9D5] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                                {(u.name || "U").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold group-hover:text-[#6259b5] dark:group-hover:text-[#c6c2fa] transition-colors">
                                {u.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4.5 px-6 font-mono text-zinc-700 dark:text-zinc-300 align-middle">
                            {u.email}
                          </td>
                          <td className="py-4.5 px-5 align-middle">
                            {u.role === "admin" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6259b5]/10 text-[#6259b5] dark:text-[#c6c2fa] border border-[#6259b5]/25 text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wide">
                                Administrator
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B9D5]/15 text-[#0d9488] dark:text-[#12B9D5] border border-[#12B9D5]/30 text-[11px] font-semibold px-2.5 py-0.5 uppercase tracking-wide">
                                Researcher
                              </span>
                            )}
                          </td>
                          <td className="py-4.5 px-5 align-middle">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 font-bold text-zinc-900 dark:text-white border border-zinc-200/60 dark:border-zinc-800">
                              {u.total_tasks}
                            </span>
                          </td>
                          <td className="py-4.5 px-5 text-zinc-500 dark:text-zinc-400 align-middle">
                            {u.created_at}
                          </td>
                          <td className="py-4.5 px-6 text-right align-middle">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectUser(u);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-[#6259b5] dark:hover:text-[#c6c2fa] hover:border-[#6259b5]/40 hover:bg-[#efedff]/50 dark:hover:bg-[#8980d8]/10 transition-all shadow-2xs cursor-pointer"
                              title={`View workflows by ${u.name}`}
                            >
                              <Eye className="h-3.5 w-3.5 text-[#6259b5] dark:text-[#c6c2fa]" />
                              <span>View Workflows ({u.total_tasks})</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* LOGS TAB - Terminal-style Server Audit Stream */
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 overflow-hidden shadow-xl">
            {/* Terminal Chrome Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/70">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="flex items-center gap-2 text-zinc-300 text-xs font-mono pl-2 border-l border-zinc-800">
                  <ScrollText className="h-3.5 w-3.5 text-[#12B9D5]" />
                  <span className="font-semibold text-zinc-200">Server Audit Log Stream</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(serverLogs, "server-logs")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition-colors cursor-pointer"
                  title="Copy full server logs"
                >
                  {copiedId === "server-logs" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Log</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-zinc-500 font-mono">logs/user_activity.log</span>
              </div>
            </div>
            {/* Log Stream Content */}
            <pre className="p-5 overflow-x-auto whitespace-pre-wrap max-h-[550px] overflow-y-auto leading-relaxed text-zinc-300 select-text font-mono text-[11px]">
              {serverLogs || "No server logs recorded yet."}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
