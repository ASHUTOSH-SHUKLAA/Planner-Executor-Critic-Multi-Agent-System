"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/brand-mark";
import {
  WorkflowListItem,
  apiListWorkflows,
  apiDeleteWorkflow,
} from "@/lib/api";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
  Trash2,
  House,
  LogOut,
  ShieldCheck,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export { DISCOVER_TOPICS, RECOMMENDED_INQUIRIES } from "@/lib/discover-topics";
export type { DiscoverTopicItem, RecommendedInquiryItem } from "@/lib/discover-topics";

interface ResearchSidebarProps {
  onNewResearch: () => void;
  onSelectWorkflow: (workflowId: string) => void;
  activeWorkflowId?: string | null;
  onOpenSavedReports?: () => void;
  savedReportsCount?: number;
  liveWorkflowItem?: WorkflowListItem | null;
}

export function ResearchSidebar({
  onNewResearch,
  onSelectWorkflow,
  activeWorkflowId,
  onOpenSavedReports,
  savedReportsCount = 0,
  liveWorkflowItem,
}: ResearchSidebarProps) {
  const router = useRouter();
  const { token, user, logout, updateProfile } = useAuth();
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isCollapsed = !isMobile && state === "collapsed";
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Collapse profile bar when clicking anywhere on the screen
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleDocumentClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [isProfileOpen]);

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const loadHistory = async () => {
    if (!token) {
      setWorkflows([]);
      return;
    }
    setLoadingWorkflows(true);
    try {
      const data = await apiListWorkflows(token);
      setWorkflows(data || []);
    } catch (error) {
      console.warn("Could not load history in sidebar:", error);
      setWorkflows([]);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadHistory();
    } else {
      setWorkflows([]);
    }
  }, [token, activeWorkflowId]);

  useEffect(() => {
    if (liveWorkflowItem?.status === "COMPLETED" && token) {
      loadHistory();
    }
  }, [liveWorkflowItem?.status, token]);

  useEffect(() => {
    if (!liveWorkflowItem) return;
    setWorkflows((previous) => {
      const existingIndex = previous.findIndex(
        (workflow) => workflow.workflow_id === liveWorkflowItem.workflow_id
      );
      if (existingIndex < 0) return [liveWorkflowItem, ...previous];
      const updated = [...previous];
      updated[existingIndex] = { ...updated[existingIndex], ...liveWorkflowItem };
      return updated;
    });
  }, [liveWorkflowItem]);

  const handleDeleteHistory = async (
    event: React.MouseEvent,
    workflowId: string
  ) => {
    event.stopPropagation();
    if (!token) return;
    const deleted = await apiDeleteWorkflow(workflowId, token);
    if (!deleted) return;
    setWorkflows((previous) =>
      previous.filter((workflow) => workflow.workflow_id !== workflowId)
    );
    if (activeWorkflowId === workflowId) onNewResearch();
  };

  const filteredHistory = workflows.slice(0, 30);
  const groupedHistory = filteredHistory.reduce<
    Record<string, WorkflowListItem[]>
  >((groups, workflow) => {
    const createdAt = new Date(workflow.created_at).getTime();
    const ageDays = Number.isFinite(createdAt)
      ? Math.floor((Date.now() - createdAt) / 86_400_000)
      : 8;
    const group =
      ageDays < 1
        ? "Today"
        : ageDays < 2
          ? "Yesterday"
          : ageDays < 7
            ? "Previous 7 days"
            : "Older";
    (groups[group] ||= []).push(workflow);
    return groups;
  }, {});

  return (
    <>
    <Sidebar
      data-workspace-sidebar="true"
      collapsible="icon"
      variant="sidebar"
      className={`workspace-sidebar ${!mounted ? "is-initial-load" : ""}`}
    >
      <SidebarHeader className={`workspace-sidebar-header ${isCollapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-brand-row">
          <button
            type="button"
            className="sidebar-brand cursor-pointer bg-transparent border-0 p-0 text-left"
            onClick={isCollapsed ? toggleSidebar : undefined}
            title={isCollapsed ? "Expand sidebar (⌘B)" : undefined}
          >
            <div className="sidebar-brand-icon-wrap flex items-center justify-center h-8 w-8 shrink-0">
              <BrandMark className="sidebar-expand-mark h-8 w-8 shrink-0" />
            </div>
            <span className="sidebar-brand-copy overflow-hidden whitespace-nowrap">
              <span className="sidebar-brand-name font-bold tracking-tight text-sm">Synora</span>
            </span>
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-collapse-button shrink-0"
            title="Collapse sidebar (⌘B)"
            aria-label="Collapse sidebar"
            tabIndex={isCollapsed ? -1 : 0}
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" strokeWidth={1.5} />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="workspace-sidebar-content">
        <SidebarGroup className="sidebar-navigation-group">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onNewResearch();
                    if (typeof window !== "undefined" && window.location.pathname !== "/") {
                      router.push("/");
                    }
                    closeMobile();
                  }}
                  className="workspace-nav-new cursor-pointer"
                  tooltip="New research (⌘K)"
                  size="default"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.2} />
                  <span>New research</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="sidebar-library-group">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onOpenSavedReports?.();
                    closeMobile();
                  }}
                  className="workspace-nav-saved cursor-pointer"
                  tooltip="Saved reports"
                  size="default"
                >
                  <Bookmark className="h-5 w-5" strokeWidth={1.75} />
                  <span>Saved Reports</span>
                </SidebarMenuButton>
                {savedReportsCount > 0 && (
                  <SidebarMenuBadge className={`sidebar-menu-count transition-opacity duration-200 ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                    {savedReportsCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className={`sidebar-recent-group ${isHistoryExpanded ? "is-expanded" : ""} transition-all duration-300`}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="relative">
                <SidebarMenuButton
                  onClick={() => {
                    router.push("/history");
                    closeMobile();
                  }}
                  className="workspace-nav-history cursor-pointer"
                  tooltip="Research history"
                  size="default"
                >
                  <History className="h-5 w-5" strokeWidth={1.75} />
                  <span>Research history</span>
                </SidebarMenuButton>
                <button
                  type="button"
                  className="sidebar-history-toggle-bar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHistoryExpanded((expanded) => !expanded);
                  }}
                  aria-controls="sidebar-research-history"
                  aria-expanded={isHistoryExpanded}
                  title={isHistoryExpanded ? "Collapse inline searches" : "Show all searches"}
                  tabIndex={isCollapsed ? -1 : 0}
                >
                  <span className="sidebar-count">{workflows.length}</span>
                  <ChevronDown className={`sidebar-history-chevron ${isHistoryExpanded ? "is-expanded" : ""}`} />
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>

          <div
            id="sidebar-research-history"
            className={`grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isHistoryExpanded && !isCollapsed
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0 pointer-events-none"
            }`}
          >
              <div className="overflow-hidden">
                <SidebarGroupContent className="sidebar-session-list">
                  {loadingWorkflows && workflows.length === 0 ? (
                    <div className="sidebar-empty-state">Loading sessions…</div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="sidebar-empty-state">Your research history will appear here.</div>
                  ) : (
                    Object.entries(groupedHistory).map(([group, items]) => (
                      <div className="history-group" key={group}>
                        <div className="history-group-label">{group}</div>
                        <SidebarMenu>
                          {items.map((workflow) => {
                            const selected =
                              activeWorkflowId === workflow.workflow_id;
                            const pending =
                              workflow.status === "RUNNING" ||
                              workflow.status === "PLANNING" ||
                              workflow.status === "EXECUTING";
                            const title = workflow.task || "Untitled Research";

                            return (
                              <SidebarMenuItem
                                key={workflow.workflow_id}
                                className="session-menu-item"
                              >
                                <SidebarMenuButton
                                  isActive={selected}
                                  onClick={() => {
                                    onSelectWorkflow(workflow.workflow_id);
                                    closeMobile();
                                  }}
                                  tooltip={title}
                                  className="session-item"
                                >
                                  <span className="session-copy">
                                    <span className="session-title">{title}</span>
                                    <span className="session-meta">
                                      {pending ? (
                                        <span className="session-running">
                                          <span /> Running
                                        </span>
                                      ) : (
                                        <span suppressHydrationWarning>
                                          <CheckCircle2 aria-hidden="true" />
                                          {mounted
                                            ? new Date(workflow.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                                            : ""}
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                </SidebarMenuButton>
                                <SidebarMenuAction
                                  showOnHover
                                  onClick={(event) =>
                                    handleDeleteHistory(event, workflow.workflow_id)
                                  }
                                  title="Delete session"
                                  aria-label={`Delete ${title}`}
                                  className="session-delete-action"
                                >
                                  <Trash2 />
                                </SidebarMenuAction>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </div>
                    ))
                  )}
                </SidebarGroupContent>
              </div>
            </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="workspace-sidebar-footer">
        <div className="sidebar-rail-divider" />
        <button
          type="button"
          className="sidebar-rail-toggle"
          onClick={toggleSidebar}
          aria-label="Expand sidebar (⌘B)"
          title="Expand sidebar (⌘B)"
          tabIndex={isCollapsed ? 0 : -1}
        >
          <PanelLeftOpen aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="sidebar-account" ref={profileMenuRef} data-profile-menu>
          {isProfileOpen && <button className="sidebar-account-dismiss" type="button" aria-label="Close account menu" onClick={() => setIsProfileOpen(false)} />}
          {isProfileOpen && <div className="sidebar-account-menu">
            <div className="sidebar-account-summary">
              {isEditingName ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!editNameValue.trim() || isSavingName) return;
                    setIsSavingName(true);
                    try {
                      await updateProfile(editNameValue.trim());
                      setIsEditingName(false);
                    } catch (err) {
                      console.error("Failed to update name:", err);
                    } finally {
                      setIsSavingName(false);
                    }
                  }}
                  className="flex items-center gap-1.5 my-1"
                >
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    placeholder="Enter display name"
                    autoFocus
                    className="w-full text-xs px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName}
                    title="Save name"
                    className="p-1 rounded-md bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    title="Cancel"
                    className="p-1 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <strong suppressHydrationWarning>{(mounted && user?.name) ? user.name : "Researcher"}</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameValue(user?.name || "");
                      setIsEditingName(true);
                    }}
                    title="Edit display name"
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-0.5 cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
              <span suppressHydrationWarning>{(mounted && user?.email) ? user.email : ""}</span>
              <small suppressHydrationWarning>{(mounted && user?.role === "admin") ? "Staff Admin" : "Researcher"}</small>
            </div>
            {isCollapsed && (
              <button
                type="button"
                className="sidebar-account-action"
                onClick={() => {
                  toggleSidebar();
                  setIsProfileOpen(false);
                }}
              >
                <PanelLeftOpen className="h-3.5 w-3.5" /> Expand sidebar
              </button>
            )}
            {user?.role === "admin" && <a href="/admin" className="sidebar-account-action"><ShieldCheck /> Admin console</a>}
            <button type="button" className="sidebar-account-action is-danger" onClick={logout}><LogOut /> Sign out</button>
          </div>}
          <button
            type="button"
            className="sidebar-profile-button cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsProfileOpen((open) => !open);
            }}
            aria-label="Account menu"
            title={mounted ? (user?.name || user?.email || "Account") : "Account"}
            aria-expanded={isProfileOpen}
          >
            <span className="sidebar-profile-avatar" suppressHydrationWarning>
              <span className="font-extrabold text-[13px] text-[var(--accent)]">
                {mounted && (user?.name || user?.email) ? (user.name || user.email)![0].toUpperCase() : "A"}
              </span>
            </span>
            <span className="sidebar-profile-copy">
              <strong suppressHydrationWarning>{mounted && user?.name ? user.name : "Researcher"}</strong>
              <small suppressHydrationWarning>{mounted && user?.email ? user.email : ""}</small>
            </span>
            <ChevronRight className={`sidebar-profile-chevron ${isProfileOpen ? "is-open" : ""}`} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
    {isMobile && (
      <nav className="workspace-bottom-nav" aria-label="Main navigation">
        <button type="button" onClick={onNewResearch} aria-label="New research" title="New research">
          <Plus aria-hidden="true" /><span>New</span>
        </button>
        <button type="button" onClick={onOpenSavedReports} aria-label="Saved reports" title="Saved reports">
          <Bookmark aria-hidden="true" /><span>Saved</span>
        </button>
        <button type="button" onClick={() => router.push("/history")} aria-label="Research history" title="Research history">
          <History aria-hidden="true" /><span>History</span>
        </button>
        <button type="button" onClick={() => router.push("/dashboard")} aria-label="Home" title="Home">
          <House aria-hidden="true" /><span>Home</span>
        </button>
      </nav>
    )}
    </>
  );
}
