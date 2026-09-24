/**
 * API client for interacting with the FastAPI Multi-Agent Orchestrator backend (TriadFlow).
 * Strict JWT bearer token authentication, live web search telemetry, and admin analytics.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at?: string;
  username?: string; // fallback alias for name
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SourceCitation {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

export interface CriticReviewData {
  correctness: number;
  completeness: number;
  relevance: number;
  action: "PASS" | "RETRY" | "FAIL";
  critique?: string;
  feedback?: string;
  suggested_fixes?: string[];
  genuine_mistake_detected?: boolean;
}

export interface StepOutputData {
  step_id: string;
  title: string;
  prompt?: string;
  output: string;
  status: "PENDING" | "EXECUTING" | "CRITIC_REVIEW" | "PASSED" | "RETRYING" | "FAILED" | "REPLANNED";
  depends_on?: string[];
  critic_review?: CriticReviewData;
  sources?: SourceCitation[];
  key_findings?: string[];
  retry_count?: number;
  latency?: number;
}

export interface PlanStepData {
  step_id: string;
  title: string;
  description: string;
  dependencies: string[];
  status: string;
  requires_research?: boolean;
  search_query?: string;
}

export interface WorkflowStateData {
  workflow_id?: string;
  id?: string;
  task: string;
  goal?: string;
  status: "INITIALIZING" | "PLANNING" | "EXECUTING" | "CRITIQUE" | "REPLANNING" | "SYNTHESIZING" | "COMPLETED" | "FAILED";
  plan?: {
    plan_id?: string;
    rationale?: string;
    steps: PlanStepData[];
  };
  step_outputs: Record<string, StepOutputData>;
  sources: SourceCitation[];
  final_result?: string;
  total_tokens: number;
  estimated_cost_usd: number;
  total_cost?: number;
  replan_count?: number;
  telemetry?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

export interface SSEMessageEvent {
  event: string;
  data: any;
}

export interface WorkflowListItem {
  workflow_id: string;
  task: string;
  status: string;
  total_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  running_tasks: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
  total_tasks: number;
}

export interface AdminWorkflow {
  workflow_id: string;
  user_id: number;
  user_email: string;
  user_name: string;
  task: string;
  status: string;
  total_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

/**
 * Register a new user
 */
export async function apiRegister(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }

  const data: AuthResponse = await res.json();
  if (data.user && !data.user.username) {
    data.user.username = data.user.name;
  }
  return data;
}

/**
 * Log in an existing user with email and password
 */
export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Invalid email or password" }));
    throw new Error(err.detail || "Login failed");
  }

  const data: AuthResponse = await res.json();
  if (data.user && !data.user.username) {
    data.user.username = data.user.name;
  }
  return data;
}

/**
 * Fetch current authenticated user profile
 */
export async function apiGetMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to verify user credentials");
  }

  const data: User = await res.json();
  if (!data.username) {
    data.username = data.name;
  }
  return data;
}

/**
 * Fetch real user workflow history from backend
 */
export async function apiListWorkflows(token: string): Promise<WorkflowListItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/workflows`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch workflow history");
  }

  return res.json();
}

/**
 * Fetch details of a specific workflow
 */
export async function apiGetWorkflow(workflowId: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Workflow not found or access denied");
  }

  return res.json();
}

/**
 * Download generated report for a completed workflow
 */
export async function apiDownloadWorkflow(
  workflowId: string,
  format: "md" | "txt",
  token: string
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}/download?format=${format}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Download failed" }));
    throw new Error(err.detail || "Download failed");
  }

  const blob = await res.blob();
  const filename = `triadflow_${workflowId}.${format}`;
  return { blob, filename };
}

/**
 * Admin APIs
 */
export async function apiGetAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Access denied" }));
    throw new Error(err.detail || "Failed to fetch admin stats");
  }
  return res.json();
}

export async function apiGetAdminUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch registered users");
  }
  return res.json();
}

export async function apiGetAdminWorkflows(token: string): Promise<AdminWorkflow[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/workflows`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch system workflows");
  }
  return res.json();
}

/**
 * Run a multi-agent workflow and stream real-time updates via Server-Sent Events (SSE).
 */
export async function streamWorkflowExecution(
  goal: string,
  mode: "sequential" | "parallel" = "parallel",
  token: string | null,
  onEvent: (event: SSEMessageEvent) => void,
  onError: (err: Error) => void,
  onComplete: () => void,
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/workflows/run-stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ task: goal, goal, mode }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.detail || errText;
      } catch {}
      throw new Error(`Execution request failed (${response.status}): ${msg}`);
    }

    if (!response.body) {
      throw new Error("No response stream body available");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";

      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        let eventName = "message";
        let dataStr = "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event:")) {
            eventName = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            dataStr = trimmed.slice(5).trim();
          }
        }

        if (dataStr) {
          try {
            const parsedData = JSON.parse(dataStr);
            onEvent({ event: eventName, data: parsedData });
          } catch (e) {
            console.warn("Failed to parse SSE payload:", dataStr, e);
          }
        }
      }
    }

    onComplete();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("Stream aborted by user");
      return;
    }
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}
