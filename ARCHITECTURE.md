# AegisFlow: Multi-Agent Architecture & Engineering Reference

> **An Enterprise Planner–Executor–Critic Multi-Agent Orchestration Platform**  
> Production-grade, deterministic, and verifiable multi-agent framework built with FastAPI, Next.js 16, SQLite, and Google Gemini.

---

## 1. System Entry Points

When inspecting or running the AegisFlow application, start at the following explicit entry points:

| Layer | Entry File | Protocol / Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend API** | [`src/api/main.py`](file:///c:/Users/Ashuu/Documents/Sem%205/Projects/OJTProject/src/api/main.py) | HTTP / Port `8000` | FastAPI server entry point, CORS middleware, router registration, OpenAPI/Swagger docs (`http://localhost:8000/docs`). |
| **Frontend Web** | [`frontend/src/app/page.tsx`](file:///c:/Users/Ashuu/Documents/Sem%205/Projects/OJTProject/frontend/src/app/page.tsx) | HTTP / Port `3000` | Next.js 16 App Router interface: Seamless Home landing, search composer, and live research workspace canvas. |
| **Agent Orchestrator Engine** | [`src/orchestrator/engine.py`](file:///c:/Users/Ashuu/Documents/Sem%205/Projects/OJTProject/src/orchestrator/engine.py) | Python Engine | Core multi-agent state machine managing DAG execution, batching, critic evaluation, and bounded self-correction. |
| **Research History Console** | [`frontend/src/app/history/page.tsx`](file:///c:/Users/Ashuu/Documents/Sem%205/Projects/OJTProject/frontend/src/app/history/page.tsx) | Browser View | Interactive research thread archive with instant reload, thread deletion, and search filtering. |
| **Admin Governance Console** | [`frontend/src/app/admin/page.tsx`](file:///c:/Users/Ashuu/Documents/Sem%205/Projects/OJTProject/frontend/src/app/admin/page.tsx) | Browser View | Administrative dashboard for user registries, cross-company workflows, token expenditure telemetry, and live server audit logs. |
| **PDF Export Engine** | [`src/api/routes/workflows.py`](file:///c:/Users/Ashuu/Documents/Sem%205/Projects/OJTProject/src/api/routes/workflows.py) | HTTP Endpoint | `/api/export-pdf`: ReportLab-powered publication-grade PDF generator with citations and metadata. |
| **Benchmarking Suite** | [`benchmarks/run_benchmarks.py`](file:///c:/Users/Ashuu/Documents/Sem%205/Projects/OJTProject/benchmarks/run_benchmarks.py) | CLI Test Harness | Standardized 20-task benchmark suite measuring WSR, Recovery Rate, and Critic precision. |

---

## 2. Directory Layout & Architecture Map

```text
OJTProject/
├── ARCHITECTURE.md                  # Comprehensive architectural guide & engineering reference
├── Enterprise_MultiAgent_Orchestrator_PRD_v2.0.md # Product Requirements Document (PRD v2.0)
├── OJT_Project_Logbook_AegisFlow.md # Complete milestone logbook and evaluation report
├── README.md                        # Quickstart guide, installation, and deployment documentation
├── app.db                           # SQLite persistent database (Users, Workflows, OTP Codes)
├── requirements.txt                 # Python dependencies (FastAPI, SQLModel, ReportLab, etc.)
├── pytest.ini                       # Pytest execution configuration
│
├── benchmarks/                      # Empirical Performance Benchmarking
│   ├── run_benchmarks.py            # Automated runner for 20 standardized tasks
│   ├── tasks.json                   # Standardized 20-task dataset across 10 categories
│   └── results.md                   # Latency, token expenditure, and recovery metrics
│
├── logs/                            # Production server logs directory
│   ├── user_activity.log            # Human-readable timestamped server security audit trail
│   └── user_workflows.jsonl         # Machine-readable structured JSONL logs for analytics/SIEM
│
├── src/                             # Core Backend Python Source Code
│   ├── agents/                      # Specialized Multi-Agent Implementations
│   │   ├── planner.py               # Planner Agent: Decomposes goal into structured DAG
│   │   ├── executor.py              # Executor Agent: Runs steps, searches web, grounds evidence
│   │   ├── critic.py                # Critic Agent: Adversarial evaluation (correctness, completeness, relevance)
│   │   └── synthesizer.py           # Synthesizer Agent: Compiles verified step deliverables and citations
│   │
│   ├── orchestrator/                # Orchestration & Scheduling Engine
│   │   └── engine.py                # OrchestrationEngine: Coordinates Planner-Executor-Critic lifecycle & recovery loops
│   │
│   ├── tools/                       # Agent Execution Tools
│   │   └── search.py                # Live Web Search tool via DuckDuckGo with strict URL deduplication
│   │
│   ├── llm/                         # LLM Gateway & Provider Abstraction
│   │   └── gateway.py               # Google Gemini integration with fallback cascade and token budgeting
│   │
│   ├── models/                      # Pydantic Schemas & Data Contracts
│   │   └── schemas.py               # WorkflowState, Plan, Step, CriticReview, SourceCitation models
│   │
│   └── api/                         # FastAPI REST & SSE Streaming API
│       ├── main.py                  # API Entry point: Application bootstrap, CORS, routers
│       ├── auth.py                  # Passwordless OTP auth, email authenticity validation, JWT issuance
│       ├── database.py              # SQLite data access layer: Users, Workflows, OTP verification codes
│       ├── audit_logger.py          # Security audit logger writing to logs/
│       └── routes/                  # Modular API Route Handlers
│           ├── workflows.py         # POST /run-stream (SSE), GET /, GET /{id}/download, /api/export-pdf
│           └── admin.py             # GET /stats, GET /users, GET /workflows, GET /server-logs
│
├── frontend/                        # Next.js 16 + Tailwind CSS Frontend Application
│   ├── public/                      # Static web assets, brand icons, and favicons
│   ├── scripts/                     # Automated UI Invariant & Token Test Harness
│   │   ├── home-locked-tokens.json  # Locked CSS token baseline snapshot
│   │   ├── check-locked-tokens.mjs  # Token baseline comparator
│   │   ├── test-home-refinement.mjs # 64px rail, 820px layout, and contrast tests (7/7 PASS)
│   │   ├── test-pipeline-stage.mjs  # PRD Invariants & Multi-Scenario test suite (33/33 PASS)
│   │   ├── test-research-view-model.mjs # View-model & fixture regression suite (24/24 PASS)
│   │   └── test-typography.mjs      # Typography pairing and optical token tests (33/33 PASS)
│   │
│   ├── src/
│   │   ├── app/                     # Next.js App Router Pages
│   │   │   ├── page.tsx             # Unified Home & Live Research Canvas
│   │   │   ├── layout.tsx           # Global root layout with theme & auth providers
│   │   │   ├── globals.css          # Semantic tokens, typography resets, smooth sidebar transitions
│   │   │   ├── history/page.tsx     # Thread archive with instant reload and delete
│   │   │   ├── admin/page.tsx       # Admin console: User table, workflow telemetry, server audit logs
│   │   │   ├── login/page.tsx       # Passwordless OTP email login
│   │   │   └── signup/page.tsx      # Passwordless OTP email registration
│   │   │
│   │   ├── components/              # UI Components
│   │   │   ├── navbar.tsx           # Responsive header with user profile menu
│   │   │   ├── research-sidebar.tsx # Collapsible 64px icon rail with zero-jerk transitions
│   │   │   ├── research-workspace.tsx # Core research layout: Question, Progress, Report, Sources
│   │   │   ├── theme-toggle.tsx     # Dark/Light mode switcher
│   │   │   └── research/            # Modular Research Components
│   │   │       ├── QuestionCard.tsx        # Editable query card with inline stop controls
│   │   │       ├── ResearchProgressRow.tsx # Compact live status indicator
│   │   │       ├── StepsChecklist.tsx      # Expandable DAG step progress checklist
│   │   │       ├── AnswerBody.tsx          # Rendered report markdown with interactive citation tooltips
│   │   │       ├── SourcesPanel.tsx        # Sticky right-hand cited sources panel with favicons
│   │   │       ├── ConversationThread.tsx  # Interactive multi-turn follow-up question thread
│   │   │       └── ReportActionsPanel.tsx  # One-click Copy, Share, Save, and Export as PDF
│   │   │
│   │   └── lib/                     # Frontend Utilities & Contexts
│   │       ├── api.ts               # Typed API client, SSE stream consumer, download helpers
│   │       ├── auth-context.tsx     # React AuthContext: Token storage, user state, OTP actions
│   │       ├── research-view-model.ts # Reactive mapping from workflow state to UI view-model
│   │       └── typography-config.ts # Typography pairings and font stack definitions
│   │
│   ├── package.json                 # Frontend dependencies (Next.js 16, Lucide, Tailwind, React-Markdown)
│   └── tsconfig.json                # TypeScript compiler configuration
│
└── tests/                           # Pytest Test Suite
    ├── test_api.py                  # API endpoints, OTP auth flow, RBAC, ownership checks
    ├── test_planner.py              # Planner DAG decomposition & dependency ordering
    ├── test_executor.py             # Step execution, dependency context scoping
    ├── test_critic.py               # Critic thresholds, PASS/RETRY triggers, score boundaries
    ├── test_synthesizer.py          # Report synthesis & source citation formatting
    ├── test_parallel.py             # Topological batching & parallel execution speedup
    ├── test_recovery.py             # Bounded retry recovery & replanning loop limits
    ├── test_schemas.py              # Pydantic validation (acyclic DAG, step IDs, ratings)
    ├── test_pdf_export.py           # ReportLab PDF deliverable generation tests
    └── test_domain_classifier.py    # URL domain taxonomy and source verification
```

---

## 3. Core Architectural Decisions & Design Rationale

### A. Strict Role Separation: Researcher (`user`) vs. Platform Governance (`admin`)

| Aspect | Researcher (`user`) | Administrator (`admin`) |
| :--- | :--- | :--- |
| **Primary Domain** | Submitting research goals, analyzing domain questions, inspecting step findings, exporting reports. | Platform compliance, security auditing, resource quota tracking, user registry management. |
| **Can Run Research?** | **YES** — Primary actor of research workflows. | **NO (Forbidden)** — Enforced via HTTP 403 Forbidden in `POST /api/workflows/run-stream`. |
| **Can View Others' Workflows?** | **NO** — Strict resource ownership prevents viewing or downloading other users' tasks. | **YES** — Comprehensive visibility across all company workflows. |
| **Access to Audit Logs?** | **NO** | **YES** — Direct access to `logs/user_activity.log` and system analytics. |

#### Why Admins Do Not Run Research:
1. **Separation of Concerns:** In enterprise compliance frameworks (SOC 2, ISO 27001), administrative accounts are reserved for governance and audit. Commingling operational research runs with admin identities introduces privilege creep and contaminates audit trails.
2. **Accountability & Non-Repudiation:** When a research report is generated and cited, it must be attributable to a designated researcher identity, not a shared administrative superuser.
3. **Resource Isolation:** System administrators oversee global token quotas and budget thresholds; allowing admin accounts to generate heavy LLM workloads creates conflicts of interest in resource monitoring.

---

### B. Industry-Standard Passwordless Email OTP Authentication

AegisFlow implements a **Passwordless One-Time Password (OTP)** authentication flow:

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher / Admin
    participant Client as Frontend (Next.js)
    participant Auth as Auth API (/api/auth)
    participant DB as SQLite (app.db)
    participant Log as Server Audit Log

    User->>Client: Enters email (e.g. name@company.com)
    Client->>Auth: POST /api/auth/send-code { email }
    Auth->>Auth: validate_authentic_email() (Rejects temp/burner mail, checks DNS)
    Auth->>Auth: Generate 6-digit cryptographic OTP (secrets module)
    Auth->>DB: save_verification_code(email, code, expires_in=10m)
    Auth->>Log: log_user_event("OTP_CODE_DISPATCHED")
    Auth-->>Client: 200 OK { status: "success", dev_code: "123456" }
    Client-->>User: Prompts for 6-Digit Verification Code

    User->>Client: Inputs 6-digit code
    Client->>Auth: POST /api/auth/verify-code { email, code }
    Auth->>DB: verify_code_match(email, code)
    alt Code Valid & Unexpired
        Auth->>DB: Delete OTP (Prevent Replay Attacks)
        Auth->>DB: Provision or fetch user record
        Auth->>Log: log_user_event("USER_LOGIN" / "USER_REGISTRATION")
        Auth-->>Client: 200 OK { access_token: JWT, user: { role } }
        Client->>Client: Store JWT in localStorage
        Client-->>User: Redirect to / (User) or /admin (Admin)
    else Code Invalid / Expired / Max Attempts Exceeded
        Auth-->>Client: 400 Bad Request { detail: "Invalid verification code" }
    end
```

#### Security Controls:
- Cryptographically random 6-digit OTP generated via Python's `secrets` module.
- Strict 10-minute expiration window.
- Automatic 5-attempt rate-limiting lockout to prevent brute-forcing.
- Immediate deletion upon successful verification (replay protection).

---

## 4. Multi-Agent Finite State Machine Execution Flow

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Client Interaction"]
        GoalInput["Researcher submits Objective"] --> SSEStream["POST /api/workflows/run-stream (SSE)"]
    end

    subgraph PlannerAgent ["2. Planner Agent"]
        SSEStream --> StateReceived["State: TASK_RECEIVED"]
        StateReceived --> Planner["State: PLANNING (Decompose Goal into DAG)"]
        Planner --> DAGValidation{"State: PLAN_READY (Validate Acyclicity & Deps)"}
    end

    subgraph ExecutorAgent ["3. Executor Agent (Parallel / Sequential)"]
        DAGValidation --> BatchScheduler["State: EXECUTING (Topological Wave Scheduler)"]
        BatchScheduler --> StepExecution["Execute Step with Scoped Context"]
        StepExecution --> ToolExecution["Execute Tool: DuckDuckGo Live Search"]
        ToolExecution --> EvidenceGrounding["Extract Evidence Snippets & Deduplicate Citations"]
    end

    subgraph CriticAgent ["4. Critic Agent (Adversarial Audit)"]
        EvidenceGrounding --> CriticAudit["State: CRITIC_REVIEW (Score >= 0.70 Threshold)"]
        CriticAudit --> DecisionCheck{"Decision: PASS or REJECT?"}
        DecisionCheck -- "REJECT (retry < 2)" --> RetryState["State: RETRY (Injected Feedback)"]
        RetryState --> StepExecution
        DecisionCheck -- "REJECT (retry = 2)" --> Replanner["State: REPLANNING (Dynamic DAG Mutation)"]
        Replanner --> BatchScheduler
    end

    subgraph SynthesizerAgent ["5. Synthesizer Agent"]
        DecisionCheck -- "PASS" --> CheckAllDone{"All Steps STEP_PASSED?"}
        CheckAllDone -- "No" --> BatchScheduler
        CheckAllDone -- "Yes" --> FinalSynthesis["State: FINAL_SYNTHESIS (Compiles Verified Findings)"]
        FinalSynthesis --> CompletedState["State: COMPLETED"]
        CompletedState --> Deliverable["Publication-Ready Report + Sources + Telemetry"]
        Deliverable --> ExportOptions["Export as PDF (.pdf)"]
    end
```

---

## 5. Security & Persistence Architecture

### Database Schema (SQLite: `app.db`)

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL,  -- 'user' (Researcher) | 'admin' (Governance)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workflows History Table
CREATE TABLE IF NOT EXISTS workflows (
    workflow_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task TEXT NOT NULL,
    status TEXT NOT NULL,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0.0,
    state_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 3. Passwordless OTP Verification Codes Table
CREATE TABLE IF NOT EXISTS verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Server Audit Logging (`logs/`)
- **`logs/user_activity.log`**: Human-readable timestamped audit log detailing user logins, OTP code dispatches, workflow runs, and report downloads.
- **`logs/user_workflows.jsonl`**: Machine-readable JSONL stream recording workflow lifecycle events, token counts, and execution status for analytics ingestion.
- **Admin Access**: Administrators can view the live server audit trail directly inside the Admin Console (`/admin` -> Server Audit Trail tab) or via `GET /api/admin/server-logs`.

---

## 6. How to Run & Verify

### Running Backend Server
```bash
# Option A: From root directory using PowerShell
.\.venv\Scripts\Activate.ps1
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Running Frontend Application
```bash
# Option A: Run from root directory using --prefix
npm --prefix frontend run dev

# Option B: Run from inside the frontend directory
cd frontend
npm run dev
# Accessible at http://localhost:3000
```

### Running Full Automated Test Suites
```bash
# Backend Pytest Suite (25+ tests: schemas, domain classifier, PDF export)
pytest tests/ -v

# Frontend Automated Invariant Suites
npm --prefix frontend run test:home       # 7/7 PASS (64px rail, 820px layout, contrast)
npm --prefix frontend run test:pipeline   # 33/33 PASS (PRD FSM & Invariants)
npm --prefix frontend run test:viewmodel  # 24/24 PASS (Reactive view-model & fixtures)
npm --prefix frontend run check:tokens    # PASS (CSS token baseline check)
npm --prefix frontend run test:typography # 33/33 PASS (Self-hosted font pairings)
```
