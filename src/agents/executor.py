"""
Executor Agent: Executes individual steps from the Plan.
Features scoped dependency injection (context filtering), real tool invocation (live web search & scraper),
structured StepOutput production with verified SourceCitations, deep analytical rigor, and critique-guided self-correction.
"""

from typing import Optional, Dict, List, Any, Callable
import time
from rich.console import Console

from src.models.schemas import (
    PlanStep,
    StepOutput,
    StepStatus,
    WorkflowState,
    SourceCitation,
)
from src.llm.client import LLMGateway, LLMResponse
from src.tools.registry import ToolRegistry, default_tool_registry
from src.agents.domain_classifier import classify_task_domain

console = Console()

EXECUTOR_SYSTEM_PROMPT = """You are an expert Autonomous Execution Specialist and Grounded Research Analyst.
Your role is to execute a specific atomic step from a broader project workflow with empirical depth, factual rigor, and exhaustive detail.

### EXECUTION GUIDELINES:
1. **Focus Strictly on the Objective with Exhaustive Depth**:
   - Provide a thorough, deeply researched deliverable (aim for rich, detailed markdown content with 500-1,000 words for this step).
   - Avoid generic or superficial answers. Include detailed markdown tables, explicit technical specifications, real metrics, and pricing.
2. **Utilize Live Evidence & Research**:
   - If live web evidence or search results are provided in the prompt, rely directly on those verified facts, prices, specifications, and data. Do NOT invent or hallucinate figures.
3. **Utilize Dependency Context**:
   - If outputs from preceding dependent steps are provided, incorporate their findings and build directly on top of them.
4. **Handle Critic Feedback**:
   - If feedback from a previous rejected attempt is provided, directly address and correct the identified issues.
5. **Structured Deliverable**:
   - Provide comprehensive, clear, and well-structured `content` with sub-headings, comparison tables, and bullet points.
   - Distill the most critical facts, numbers, or conclusions into explicit, standalone `key_findings`.
6. **Comprehensive Product Research (6 to 8 Contenders)**:
   - When researching or comparing products, hardware, devices, vehicles, or items, evaluate **6 to 8 leading market contenders** across budget, mid-range, and premium tiers (not just 2 or 3).
   - Clearly identify exact model names, variants, trims, and manufacturer designations so product visuals, specs, and pricing are factually grounded and exhaustive.

### OUTPUT REQUIREMENT:
You must output a valid JSON object strictly complying with the StepOutput schema.
"""


class ExecutorAgent:
    """
    Agent responsible for executing individual plan steps.
    Integrates with ToolRegistry to execute live web searches and capture traceable citations.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        tool_registry: Optional[ToolRegistry] = None,
        model: Optional[str] = None,
    ):
        self.gateway = gateway or LLMGateway()
        self.tool_registry = tool_registry or default_tool_registry
        self.model = model or getattr(self.gateway, "default_model", "gemini-3.5-flash")

    def build_dependency_context(
        self,
        step: PlanStep,
        state: WorkflowState,
    ) -> str:
        """
        Extracts ONLY the outputs of steps explicitly declared in step.dependencies.
        Prevents prompt bloat and context distraction by filtering out unrelated steps.
        """
        if not step.dependencies:
            return "No preceding dependencies required for this step. Execute independently."

        context_blocks: List[str] = []
        for dep_id in step.dependencies:
            dep_output = state.step_outputs.get(dep_id)
            if dep_output:
                step_title = dep_id
                if state.plan:
                    for s in state.plan.steps:
                        if s.step_id == dep_id:
                            step_title = s.title
                            break

                findings_str = ""
                if dep_output.key_findings:
                    findings_str = "\nKey Findings:\n" + "\n".join(
                        f"  - {f}" for f in dep_output.key_findings
                    )

                context_blocks.append(
                    f"--- OUTPUT FROM COMPLETED STEP: {dep_id} ({step_title}) ---\n"
                    f"{dep_output.content}\n"
                    f"{findings_str}"
                )
            else:
                context_blocks.append(
                    f"--- OUTPUT FROM COMPLETED STEP: {dep_id} ---\n[Output not available in state]"
                )

        return "\n\n".join(context_blocks)

    def _determine_search_query(self, step: PlanStep, task: str) -> Optional[str]:
        """Constructs an effective web search query if the step requires research."""
        if step.search_query and step.search_query.strip():
            return step.search_query.strip()

        title_lower = step.title.lower()
        desc_lower = step.description.lower()

        # Check for indicators that external research is required
        research_keywords = [
            "research", "search", "pricing", "price", "specs", "specification",
            "compare", "market", "model", "car", "diesel", "ev", "electric",
            "cost", "latest", "benchmark", "analysis", "review", "durability"
        ]

        needs_research = step.requires_research or any(k in title_lower or k in desc_lower for k in research_keywords)
        if needs_research:
            return f"{step.title} {task}".strip()[:100]

        return None

    def execute_step(
        self,
        step: PlanStep,
        state: WorkflowState,
        critic_feedback: Optional[str] = None,
        activity_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> LLMResponse[StepOutput]:
        """
        Executes a single plan step, optionally performing live web searches,
        extracting source evidence, notifying activity callbacks, and generating validated StepOutput.
        """
        # 1. Isolate relevant dependency context
        dependency_context = self.build_dependency_context(step, state)

        # 2. Check and perform live tool execution (web search)
        collected_sources: List[SourceCitation] = []
        evidence_text = ""

        search_query = self._determine_search_query(step, state.task)
        if search_query:
            console.print(f"[dim cyan]  [Tool] Executing web_search: '{search_query}'[/dim cyan]")
            if activity_callback:
                activity_callback("search_started", {
                    "step_id": step.step_id,
                    "platform": "DuckDuckGo Lite",
                    "query": search_query,
                    "message": f"Searching live web for \"{search_query}\"",
                })

            tool_res = self.tool_registry.execute("web_search", query=search_query, max_results=6)

            if tool_res.success and tool_res.data:
                evidence_blocks = []
                domains = []
                for idx, item in enumerate(tool_res.data, start=1):
                    citation = SourceCitation(
                        title=item.get("title", f"Source {idx}"),
                        url=item.get("url", ""),
                        domain=item.get("domain", ""),
                        snippet=item.get("snippet", ""),
                        retrieved_at=item.get("retrieved_at") or datetime.now(timezone.utc).isoformat(),
                        step_id=step.step_id,
                    )
                    collected_sources.append(citation)
                    if citation.domain and citation.domain not in domains:
                        domains.append(citation.domain)
                    evidence_blocks.append(
                        f"[{idx}] {citation.title} ({citation.domain})\n"
                        f"    URL: {citation.url}\n"
                        f"    Evidence Excerpt: {citation.snippet}"
                    )

                if activity_callback:
                    activity_callback("sources_retrieved", {
                        "step_id": step.step_id,
                        "count": len(collected_sources),
                        "domains": domains[:4],
                        "message": f"Retrieved {len(collected_sources)} verified sources from {', '.join(domains[:3]) or 'web'}",
                    })

                evidence_text = (
                    "### VERIFIED LIVE WEB EVIDENCE GATHERED VIA SEARCH:\n"
                    + "\n\n".join(evidence_blocks)
                    + "\n\nCRITICAL: Base your analysis on these real findings, exact figures, and verified sources.\n"
                )

        # 3. Construct targeted prompt
        user_prompt = (
            f"### OVERALL WORKFLOW OBJECTIVE:\n{state.task}\n\n"
            f"### CURRENT STEP TO EXECUTE:\n"
            f"Step ID: {step.step_id}\n"
            f"Title: {step.title}\n"
            f"Objective: {step.description}\n\n"
        )

        if evidence_text:
            user_prompt += f"{evidence_text}\n"

        user_prompt += f"### PRECEDING STEP CONTEXT (DEPENDENCIES):\n{dependency_context}\n"

        if critic_feedback:
            user_prompt += (
                f"\n### CRITIC FEEDBACK FROM PREVIOUS REJECTION (FIX THESE ISSUES):\n"
                f"{critic_feedback}\n"
            )

        user_prompt += (
            "\nExecute this step thoroughly and in deep detail. Produce rich, exhaustive markdown content "
            "with tables, real figures, and empirical data. Extract key actionable findings."
        )

        # Domain-specific constraints to eliminate hallucination or category contamination
        domain_info = classify_task_domain(state.task)
        if domain_info.get("is_new_age_tech"):
            target_geo = domain_info.get("target_geography")
            region_str = target_geo["region"] if target_geo else "the requested region"
            geo_mandate = f"- STRICT GEOGRAPHIC BOUNDARY: Candidate evaluations for this deliverable MUST be located in or operating physical campuses/cohorts in {region_str}. {target_geo['non_local_disqualification']}\n" if target_geo else ""

            user_prompt += (
                f"\n\n### CRITICAL MANDATE (TECH SCHOOLS IN {region_str.upper()} ONLY):\n"
                f"- Evaluated candidate entities in this deliverable MUST EXCLUSIVELY be modern applied tech schools and specialized technology academies.\n"
                f"{geo_mandate}"
                "- STRICT PROHIBITION: DO NOT list or evaluate traditional or legacy degree universities/colleges as applied tech school candidates! "
                "Any traditional institutions mentioned in raw web search snippets must be completely excluded and discarded.\n"
            )

        start_time = time.perf_counter()

        # 4. Call LLM with strict StepOutput schema (2500 max_tokens for ultra-low latency & deep tables)
        response: LLMResponse[StepOutput] = self.gateway.generate_structured(
            system_prompt=EXECUTOR_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=StepOutput,
            model=self.model,
            temperature=0.2,
            max_tokens=4096,
        )

        duration = time.perf_counter() - start_time

        # Ensure step_id, execution telemetry, and verified sources are populated
        if response.parsed:
            response.parsed.step_id = step.step_id
            response.parsed.execution_time_seconds = round(duration, 3)
            response.parsed.tokens_used = response.total_tokens
            response.parsed.sources = collected_sources

        return response

    def execute_workflow_step(
        self,
        step_id: str,
        state: WorkflowState,
        critic_feedback: Optional[str] = None,
    ) -> WorkflowState:
        """
        Executes a specific step in the workflow, updates state with outputs and gathered citations.
        """
        if not state.plan:
            raise ValueError("Cannot execute step: Workflow has no plan.")

        target_step = next((s for s in state.plan.steps if s.step_id == step_id), None)
        if not target_step:
            raise ValueError(f"Step '{step_id}' not found in the workflow plan.")

        target_step.status = StepStatus.IN_PROGRESS

        try:
            response = self.execute_step(
                step=target_step,
                state=state,
                critic_feedback=critic_feedback,
            )

            # Store the output in shared state
            state.step_outputs[step_id] = response.parsed
            target_step.status = StepStatus.IN_PROGRESS  # Awaits Critic review
            state.total_tokens += response.total_tokens
            state.estimated_cost_usd += response.estimated_cost_usd

            # Append new unique sources to the workflow state
            if response.parsed and response.parsed.sources:
                existing_urls = {s.url for s in state.sources}
                for src in response.parsed.sources:
                    if src.url not in existing_urls:
                        state.sources.append(src)
                        existing_urls.add(src.url)

        except Exception as e:
            target_step.status = StepStatus.FAILED
            raise e

        return state
