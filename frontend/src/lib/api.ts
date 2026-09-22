/**
 * API client for interacting with the FastAPI Multi-Agent Orchestrator backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CriticReviewData {
  correctness: number;
  completeness: number;
  relevance: number;
  action: "PASS" | "RETRY";
  feedback?: string;
  genuine_mistake_detected?: boolean;
}

export interface StepOutputData {
  step_id: string;
  title: string;
  prompt: string;
  output: string;
  status: "PENDING" | "EXECUTING" | "CRITIC_REVIEW" | "PASSED" | "RETRYING" | "FAILED" | "REPLANNED";
  depends_on: string[];
  critic_review?: CriticReviewData;
  retry_count: number;
  wave_index?: number;
}

export interface WorkflowStateData {
  id?: string;
  goal: string;
  status: "PLANNING" | "EXECUTING" | "CRITIQUE" | "REPLANNING" | "COMPLETED" | "FAILED";
  plan?: {
    goal: string;
    steps: Array<{
      id: string;
      title: string;
      prompt: string;
      depends_on: string[];
    }>;
  };
  step_outputs: Record<string, StepOutputData>;
  current_step_id?: string;
  replan_count: number;
  total_tokens?: number;
  total_cost?: number;
  telemetry?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

export interface SSEEvent {
  event: "state_update" | "log" | "error" | "done";
  state?: WorkflowStateData;
  log?: {
    agent: string;
    message: string;
    level?: string;
    timestamp?: string;
  };
  error?: string;
}

/**
 * Register a new user
 */
export async function apiRegister(username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }

  return res.json();
}

/**
 * Log in an existing user
 */
export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
    throw new Error(err.detail || "Login failed");
  }

  return res.json();
}

/**
 * Fetch current authenticated user
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

  return res.json();
}

/**
 * Run a multi-agent workflow and stream real-time updates via Server-Sent Events (SSE).
 */
export async function streamWorkflowExecution(
  goal: string,
  mode: "sequential" | "parallel" = "parallel",
  token: string | null,
  onEvent: (event: SSEEvent) => void,
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
      body: JSON.stringify({ goal, mode }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Execution request failed (${response.status}): ${errText}`);
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
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Expect format: "data: {...}"
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const parsed: SSEEvent = JSON.parse(jsonStr);
            onEvent(parsed);
          } catch (e) {
            console.warn("Failed to parse SSE JSON payload:", jsonStr, e);
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
