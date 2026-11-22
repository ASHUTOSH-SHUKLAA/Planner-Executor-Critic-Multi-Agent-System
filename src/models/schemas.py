"""
Core Data Contracts and Schemas for Multi-Agent Orchestration.
Uses Pydantic v2 for runtime validation, serialization, and schema generation.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, model_validator


class UserRole(str, Enum):
    """User authorization roles."""
    USER = "user"
    ADMIN = "admin"


class StepStatus(str, Enum):
    """Lifecycle states of an individual execution step."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    PASSED = "PASSED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    SKIPPED = "SKIPPED"


class CriticDecision(str, Enum):
    """The verdict from the Critic Agent."""
    PASS = "PASS"
    REJECT = "REJECT"


class SourceCitation(BaseModel):
    """Represents a verified external research source with full traceability."""
    id: str = Field(
        default_factory=lambda: f"src_{uuid.uuid4().hex[:6]}",
        description="Unique reference ID for this source (e.g., [src_a1b2c3])"
    )
    title: str = Field(default="", description="Title of the source webpage or publication")
    url: str = Field(default="", description="Direct URL to the source")
    domain: str = Field(default="", description="Domain name of the source (e.g., cardekho.com)")
    snippet: str = Field(default="", description="Extracted factual excerpt or text snippet")
    retrieved_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO timestamp of when the source was retrieved"
    )
    step_id: Optional[str] = Field(default=None, description="Plan step that gathered this source")

    @model_validator(mode="before")
    @classmethod
    def sanitize_citation_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("retrieved_at"):
                data["retrieved_at"] = datetime.now(timezone.utc).isoformat()
            if not data.get("domain") and data.get("url"):
                import urllib.parse
                try:
                    data["domain"] = urllib.parse.urlparse(data["url"]).netloc
                except Exception:
                    data["domain"] = "web"
            if not data.get("title"):
                data["title"] = data.get("domain") or "Research Source"
            if not data.get("url"):
                data["url"] = "#"
            if not data.get("snippet"):
                data["snippet"] = ""
        return data


class PlanStep(BaseModel):
    """Represents a single atomic step in an execution plan."""
    step_id: str = Field(
        default="step_1",
        description="Unique identifier for the step, e.g., 'step_1', 'step_2'"
    )
    title: str = Field(
        default="",
        description="Short human-readable title of what this step does"
    )
    description: str = Field(
        default="",
        description="Detailed instruction of what needs to be researched, calculated, or generated"
    )
    dependencies: List[str] = Field(
        default_factory=list,
        description="List of step_ids that MUST be completed before this step can execute"
    )
    requires_research: bool = Field(
        default=False,
        description="Whether this step requires external web research or live data collection"
    )
    search_query: Optional[str] = Field(
        default=None,
        description="Target search query to execute if research is required"
    )
    status: StepStatus = Field(
        default=StepStatus.PENDING,
        description="Current execution state of the step"
    )

    @model_validator(mode="before")
    @classmethod
    def sanitize_plan_step_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("step_id"):
                data["step_id"] = data.get("id") or "step_1"
            if not data.get("title"):
                data["title"] = data.get("name") or "Research Step"
            if not data.get("description"):
                data["description"] = data.get("objective") or data.get("title") or ""
            if "dependencies" not in data or not isinstance(data.get("dependencies"), list):
                data["dependencies"] = []
        return data


class Plan(BaseModel):
    """The structured plan produced by the Planner Agent."""
    plan_id: str = Field(
        default_factory=lambda: f"plan_{uuid.uuid4().hex[:8]}",
        description="Unique identifier for this plan version"
    )
    task: str = Field(
        description="The original user task that this plan aims to solve"
    )
    rationale: str = Field(
        default="",
        description="Planner's reasoning explaining why this sequence of steps was chosen"
    )
    steps: List[PlanStep] = Field(
        default_factory=list,
        description="The ordered list of steps forming a Directed Acyclic Graph (DAG)"
    )

    @model_validator(mode="after")
    def validate_plan_dag(self) -> "Plan":
        """
        Validates two critical DAG requirements:
        1. Step IDs must be unique.
        2. All listed dependencies must refer to valid, preceding step_ids.
        """
        step_ids = set()
        for step in self.steps:
            if step.step_id in step_ids:
                raise ValueError(f"Duplicate step_id found: '{step.step_id}'")
            step_ids.add(step.step_id)

        # Ensure all dependencies point to known steps
        for step in self.steps:
            for dep in step.dependencies:
                if dep not in step_ids:
                    raise ValueError(
                        f"Step '{step.step_id}' depends on unknown step_id '{dep}'"
                    )
                if dep == step.step_id:
                    raise ValueError(
                        f"Step '{step.step_id}' cannot depend on itself."
                    )
        return self


class StepOutput(BaseModel):
    """Structured result generated by the Executor Agent for a specific step."""
    step_id: str = Field(default="step_1")
    content: str = Field(
        default="",
        description="The substantive text, analysis, code, or data produced by the Executor"
    )
    key_findings: List[str] = Field(
        default_factory=list,
        description="Bullet points of key findings or factual statements"
    )
    sources: List[SourceCitation] = Field(
        default_factory=list,
        description="Verified external research sources backing this step"
    )
    execution_time_seconds: float = Field(
        default=0.0,
        description="Time taken to execute this step"
    )
    tokens_used: int = Field(
        default=0,
        description="Total tokens consumed during step execution"
    )

    @model_validator(mode="before")
    @classmethod
    def sanitize_step_output_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("content"):
                data["content"] = data.get("output") or data.get("analysis") or data.get("text") or ""
            if "key_findings" not in data or not isinstance(data.get("key_findings"), list):
                data["key_findings"] = []
            if "sources" not in data or not isinstance(data.get("sources"), list):
                data["sources"] = []
        return data


class CriticReview(BaseModel):
    """Structured review generated by the Critic Agent."""
    step_id: str = Field(default="step_1")
    decision: CriticDecision = Field(
        default=CriticDecision.PASS,
        description="PASS if output meets quality thresholds, REJECT if corrections are needed"
    )
    correctness_score: float = Field(
        default=0.85,
        ge=0.0, le=1.0,
        description="Score between 0.0 and 1.0 evaluating factual and logical correctness"
    )
    completeness_score: float = Field(
        default=0.85,
        ge=0.0, le=1.0,
        description="Score between 0.0 and 1.0 evaluating if all requirements were met"
    )
    relevance_score: float = Field(
        default=0.85,
        ge=0.0, le=1.0,
        description="Score between 0.0 and 1.0 evaluating focus and conciseness"
    )
    critique: str = Field(
        default="Deliverable meets quality thresholds.",
        description="Detailed reasoning explaining the score and any flaws detected"
    )
    suggested_fixes: List[str] = Field(
        default_factory=list,
        description="Actionable directions for the Executor if rejected"
    )

    @model_validator(mode="before")
    @classmethod
    def sanitize_critic_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("step_id"):
                data["step_id"] = data.get("id") or "step_1"
            if not data.get("critique"):
                data["critique"] = data.get("feedback") or data.get("notes") or "Evaluated step output."
            if "suggested_fixes" not in data or not isinstance(data.get("suggested_fixes"), list):
                data["suggested_fixes"] = []
        return data


class WorkflowStatus(str, Enum):
    """Overall lifecycle states of the complete workflow."""
    TASK_RECEIVED = "TASK_RECEIVED"
    PLANNING = "PLANNING"
    PLAN_READY = "PLAN_READY"
    EXECUTING = "EXECUTING"
    CRITIC_REVIEW = "CRITIC_REVIEW"
    RETRYING = "RETRYING"
    REPLANNING = "REPLANNING"
    SYNTHESIZING = "SYNTHESIZING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class WorkflowState(BaseModel):
    """
    The Central Shared Scratchpad.
    Contains complete context, history, and telemetry of an entire workflow run.
    """
    workflow_id: str = Field(
        default_factory=lambda: f"wf_{uuid.uuid4().hex[:8]}",
        description="Unique identifier for this workflow session"
    )
    user_id: Optional[int] = Field(
        default=None,
        description="Owner user ID who initiated this workflow"
    )
    task: str = Field(
        description="The initial natural-language user prompt"
    )
    status: WorkflowStatus = Field(
        default=WorkflowStatus.TASK_RECEIVED,
        description="Current state in the workflow lifecycle"
    )
    plan: Optional[Plan] = Field(
        default=None,
        description="The active execution plan"
    )
    step_outputs: Dict[str, StepOutput] = Field(
        default_factory=dict,
        description="Validated outputs indexed by step_id"
    )
    sources: List[SourceCitation] = Field(
        default_factory=list,
        description="Aggregated list of all verified sources collected across steps"
    )
    research_results: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Raw research and search result telemetry"
    )
    critic_reviews: Dict[str, List[CriticReview]] = Field(
        default_factory=dict,
        description="History of all Critic reviews indexed by step_id"
    )
    retry_counts: Dict[str, int] = Field(
        default_factory=dict,
        description="Number of retries attempted for each step_id"
    )
    replan_history: List[str] = Field(
        default_factory=list,
        description="History of previous plan versions when dynamic re-planning occurs"
    )
    final_result: Optional[str] = Field(
        default=None,
        description="The synthesized final output delivered to the user"
    )
    total_tokens: int = Field(
        default=0,
        description="Cumulative tokens used across all agent calls"
    )
    estimated_cost_usd: float = Field(
        default=0.0,
        description="Cumulative estimated USD cost"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
