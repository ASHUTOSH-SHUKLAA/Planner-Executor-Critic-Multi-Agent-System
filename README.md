# Planner-Executor-Critic Multi-Agent Orchestration & Self-Correction System

A reliable, observable, and scalable multi-agent orchestration architecture designed to solve complex, multi-step tasks using specialized **Planner**, **Executor**, and **Critic** agents.

Built with Python, Pydantic v2, and Groq (Llama 3.3 70B & Llama 3.1 8B).

---

## 🎯 Architecture & Workflow

```
User Task ➔ Planning (DAG Generation) ➔ Execution ➔ Critic Validation (PASS/REJECT)
                                                ▲                  │
                                                │ (Re-try / Re-plan)│
                                                └──────────────────┘
                                                          │ (PASS)
                                                          ▼
                                      Parallel Execution ➔ Final Synthesis ➔ Verified Result
```

### Core Product Principles
* **Plan before execution:** Decompose complex tasks into a Directed Acyclic Graph (DAG) with explicit dependencies.
* **Validate before propagation:** The Critic agent audits every output for *Correctness, Completeness, and Relevance* before it reaches downstream steps.
* **Bounded Retries & Dynamic Re-planning:** Recover from failures through contextual feedback; re-plan strategy if repeated failures occur.
* **Strict Type Safety:** Pydantic v2 schemas enforce data contracts, prevent circular dependencies, and intercept hallucinated step IDs at runtime.
* **Observability & Cost Telemetry:** Real-time tracking of latency, token usage, and USD expenditure per step.

---

## 📁 Repository Structure

```
├── src/
│   ├── models/            # Module 1: Pydantic Data Contracts & Schemas
│   │   ├── __init__.py
│   │   └── schemas.py     # PlanStep, Plan (DAG validator), CriticReview, WorkflowState
│   ├── llm/               # Module 2: LLM Gateway & Telemetry
│   │   ├── __init__.py
│   │   └── client.py      # Unified Groq client with JSON enforcement & cost tracking
│   ├── agents/            # Specialized Agent Implementations (Planner, Executor, Critic)
│   └── orchestrator/      # State machine, dependency resolver & parallel engine
├── tests/
│   ├── test_schemas.py    # Schema & DAG validation unit tests
│   └── test_llm_gateway.py# Gateway initialization & cost calculation unit tests
├── .env.example           # Configuration template
├── requirements.txt       # Project dependencies
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.11+ (Python 3.13 recommended)
* A Groq API Key (get a free key at [console.groq.com](https://console.groq.com/keys))

### 2. Setup Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Open `.env` and set your key:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key
DEFAULT_MODEL=llama-3.3-70b-versatile
FAST_MODEL=llama-3.1-8b-instant
```

### 4. Run Unit Tests
Verify that all data contracts and LLM gateway calculations pass:
```powershell
pytest -v
```

---

## 📊 Modules & Progress
- [x] **Module 1: Data Contracts & Schemas** (Pydantic v2, DAG validation, bounded Critic scores)
- [x] **Module 2: LLM Gateway & Cost Telemetry** (Groq integration, structured outputs, dollar cost calculation)
- [ ] **Module 3: The Planner Agent** (DAG plan generation from natural language prompts)
- [ ] **Module 4: The Executor Agent** (Isolated step execution with dependency context)
- [ ] **Module 5: The Critic Agent** (Evaluation of Correctness, Completeness, Relevance & Mistake detection)
- [ ] **Module 6: Sequential Orchestration & State Flow** (Connecting agents into an end-to-end loop)
- [ ] **Module 7: Failure Recovery & Dynamic Re-planning** (Self-correction & bounded retries)
- [ ] **Module 8: Parallel Execution Engine** (Topological sorting & async concurrency)
- [ ] **Module 9: 20-Task Benchmark Suite** (Measuring reliability, latency, and success rates)
- [ ] **Module 10: Final Synthesis, Observability & Packaging**
