"""
Main FastAPI Application Entrypoint.
Configures CORS for Next.js frontend, mounts routers, and initializes SQLite database.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.database import init_db
from src.api.auth import router as auth_router
from src.api.routes.workflows import router as workflows_router
from src.llm.client import LLMGateway


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    init_db()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="TriadFlow | Multi-Agent Orchestration Platform",
    description="Enterprise-grade Planner-Executor-Critic autonomous multi-agent orchestration platform with dynamic re-planning, quality auditing, and concurrency.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",  # Permissive for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router)
app.include_router(workflows_router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Multi-Agent Orchestration Engine",
        "version": "1.0.0",
    }


@app.get("/api/info", tags=["System Info"])
def system_info():
    gateway = LLMGateway()
    return {
        "default_model": gateway.default_model,
        "supported_models": [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
        ],
        "features": [
            "Dynamic DAG Task Planning",
            "Scoped Context Execution",
            "3-Axis Critic Auditing",
            "Bounded Retries & Dynamic Re-planning",
            "Parallel Wave Execution",
            "Real-time SSE Streaming",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
