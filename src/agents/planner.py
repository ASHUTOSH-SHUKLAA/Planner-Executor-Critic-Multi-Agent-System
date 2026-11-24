"""
Planner Agent: Decomposes complex user tasks into a structured Directed Acyclic Graph (DAG) of steps.
Guarantees dependency validation, broad category research architecture, and schema compliance via Pydantic.
"""

from typing import Optional, Dict, Any
from rich.console import Console

from src.models.schemas import Plan, WorkflowState, WorkflowStatus
from src.llm.client import LLMGateway, LLMResponse
from src.agents.domain_classifier import classify_task_domain

console = Console()

BASE_PLANNER_SYSTEM_PROMPT = """You are an expert Chief Systems Architect and Strategic Task Decomposition Specialist.
Your job is to take a complex user objective and break it down into an optimal, highly-structured execution plan (a Directed Acyclic Graph - DAG) designed for exhaustive deep research.

### CORE DECOMPOSITION PRINCIPLES:
1. **Atomic & Actionable**: Every step must have a clear, concrete objective with a verifiable deliverable.
2. **Exhaustive Deep Coverage with Maximum Concurrency**:
   - Decompose research goals into **3 highly focused, actionable steps** (max 3 for fast, parallel execution).
   - Guarantee rigorous multi-axis coverage tailored to the specific domain.
3. **DAG Dependency & Concurrency Structure**:
   - Initial fact-gathering steps for distinct options, dimensions, or components should be independent (`dependencies: []`) so they run concurrently in parallel.
   - Downstream convergent steps (such as comparative evaluation, trade-off analysis, architectural synthesis, or recommendations) MUST declare dependencies on their preceding source steps (e.g. `dependencies: ["step_1", "step_2"]`).
   - In any comparative or analytical research plan, ensure downstream convergent steps explicitly depend on earlier steps to form a valid Directed Acyclic Graph (DAG).
   - Never create circular dependencies. Dependencies must strictly reference valid preceding `step_id`s.
5. **Identify External Research Needs**:
   - If a step requires current market data, official metrics, benchmarks, rankings, or real-world facts, set `requires_research: true`.
   - Provide a precise, targeted `search_query` for that step.
6. **No Redundant Final Summary / Synthesis Step**:
   - Do NOT create a separate step just to write an executive summary, comparative matrix, or summarize previous steps.
   - A dedicated Synthesizer Agent automatically builds the comprehensive report, comparison tables, and citations at the end.

### OUTPUT REQUIREMENT:
You must output a valid JSON object strictly complying with the provided Plan schema.
"""


class PlannerAgent:
    """
    Agent responsible for analyzing tasks and generating structured execution plans.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        model: Optional[str] = None,
    ):
        self.gateway = gateway or LLMGateway()
        self.model = model or getattr(self.gateway, "default_model", "gemini-3.5-flash")

    def _build_domain_instructions(self, task: str) -> str:
        """Dynamically builds domain-specific planning guidance."""
        domain_info = classify_task_domain(task)
        domain = domain_info["domain"]
        focus_areas = domain_info.get("focus_areas", [])
        forbidden = domain_info.get("forbidden_elements", [])

        instructions = [
            f"\n### SPECIALIZED DOMAIN GUIDANCE: {domain_info.get('display_label', domain)}",
            f"Detected Domain Archetype: {domain}",
            "You MUST formulate execution steps that systematically investigate the following key axes:",
        ]
        for fa in focus_areas:
            instructions.append(f"  - {fa}")

        if forbidden:
            instructions.append("\nCRITICAL RESTRICTIONS (DO NOT DO THE FOLLOWING):")
            for fb in forbidden:
                instructions.append(f"  - DO NOT INCLUDE: {fb}")

        # Specific domain nuances
        if domain == "ACADEMIC_INSTITUTION":
            if domain_info.get("is_new_age_tech"):
                target_geo = domain_info.get("target_geography")
                region_name = target_geo["region"] if target_geo else "the target region"
                non_local_clause = f"- {target_geo['non_local_disqualification']}\n" if target_geo else ""

                instructions.append(
                    f"\nNEW-AGE TECH SCHOOLS REQUIREMENTS ({region_name.upper()}):\n"
                    f"- The user is specifically asking for modern, applied new-age tech schools and coding academies in {region_name}, NOT traditional degree-focused colleges!\n"
                    f"{non_local_clause}"
                    "- EXCLUSION OF TRADITIONAL / LEGACY COLLEGES: Candidates MUST EXCLUSIVELY be modern applied tech academies and institutions. Do not list legacy degree colleges as new-age tech school candidates.\n"
                    "- Do NOT anchor searches solely on legacy NIRF rankings or standard cutoffs, as new-age tech schools often utilize specialized entrance assessments, industry internships, and modern degree partnerships.\n"
                    "- Formulate EXACTLY 3 highly-concurrent parallel steps (all with dependencies: []) so research executes in a single fast wave:\n"
                    f"  (1) Identify & Profile Leading Tech Schools in {region_name}: Autonomously discover and evaluate prominent modern tech academies with active campuses in {region_name} covering campus models, degree granting partners, and accreditation. Dependencies: []\n"
                    f"  (2) Applied AI/Software Engineering Pedagogy, Mentorship & Admissions: Deep-dive into modern industry-led curricula, tech practitioner mentors, entrance exams, fee structures, and mandatory corporate internships. Dependencies: []\n"
                    f"  (3) Placement Outcomes, Verified CTC & Hiring Networks in {region_name}: Examine audited placement track records, median/highest placement CTC outcomes, top recruiters in {region_name}, and return on investment. Dependencies: []\n"
                    f"- GEOGRAPHIC ANCHORING: In each step, ensure `search_query` specifically searches for new age tech schools in {region_name} to ground search strictly in the requested city/region.\n"
                    "- NEVER create a 4th or 5th dependent step for final synthesis or comparison; the dedicated Synthesizer Agent does this at the end.\n"
                    "- NEVER treat colleges or tech schools as commercial products. No shopping links or buy boxes."
                )
            else:
                instructions.append(
                    "\nACADEMIC REQUIREMENTS:\n"
                    "- Decompose into 3 focused, deep pillars: (1) Official NIRF/QS Rankings & Accreditation, "
                    "(2) Academic Pedagogy, Research Output & Admissions Cutoffs, "
                    "(3) Placement Statistics, Recruiter Networks & Campus Infrastructure.\n"
                    "- NEVER treat colleges or universities as commercial products. No shopping links, no buy boxes."
                )
        elif domain == "TECHNICAL_RESEARCH":
            instructions.append(
                "\nTECHNICAL & SCIENTIFIC REQUIREMENTS:\n"
                "- Decompose into steps covering: (1) Scientific Principles & Architecture, "
                "(2) Current 2026 State-of-the-Art Milestones, (3) Active Manufacturers/Labs & Concrete Benchmarks, "
                "(4) Engineering Bottlenecks & Material Limitations, (5) Future 5-Year Outlook."
            )
        elif domain == "HEAD_TO_HEAD_COMPARISON":
            instructions.append(
                "\nCOMPARATIVE ARCHITECTURE REQUIREMENTS:\n"
                "- Decompose into steps covering: (1) Architecture Overview of Option A, "
                "(2) Architecture Overview of Option B, (3) Empirical Benchmarks (IPC, IOPS, Latency, TDP, Bandwidth), "
                "(4) Edge Cases, Failure Modes & Operational Gotchas, (5) Definitive Trade-off Matrix."
            )
        elif domain == "ENGINEERING_GUIDE":
            instructions.append(
                "\nENGINEERING IMPLEMENTATION REQUIREMENTS:\n"
                "- Decompose into steps covering: (1) Current vs Target Architecture Prerequisites, "
                "(2) Phased Migration & Cutover Blueprint, (3) Concrete Configuration & Deployment Topology, "
                "(4) Canary Validation & Health Checks, (5) Disaster Recovery, RPO/RTO & Rollback Plan."
            )
        elif domain == "FACT_CHECK_DEBUNK":
            instructions.append(
                "\nFACT-CHECKING REQUIREMENTS:\n"
                "- Decompose into steps covering: (1) Claim Scoping & Origin Analysis, "
                "(2) Scientific/Physical/Code Ground Truth Verification, "
                "(3) Empirical Evidence & Counter-Data Benchmarks, (4) Definitive Factual Verdict."
            )
        elif domain == "COMMERCIAL_PRODUCT":
            instructions.append(
                "\nCOMMERCIAL PRODUCT REQUIREMENTS:\n"
                "- Formulate EXACTLY 3 highly-concurrent parallel steps (all with dependencies: []) so research executes in a single fast wave:\n"
                "  (1) Identify & Profile Top 6 to 8 Concrete Market Contenders: Research leading models currently on the market matching the user's budget and criteria (e.g. flagship killers under ₹50,000 for student workflows), exact specifications, hardware internals, and retail pricing. Dependencies: []\n"
                "  (2) Real-World Benchmarks, Battery Life & Daily Performance: Deep-dive into empirical benchmark scores (AnTuTu, Geekbench), gaming/thermal endurance, display ergonomics, camera capabilities, and student productivity features. Dependencies: []\n"
                "  (3) Pricing, Best Deals, Total Cost of Ownership & Lowest Available Prices: Investigate current lowest online prices and discount deals (Amazon, Flipkart, student discount offers, bank offers), warranty terms, long-term software update support (OS updates), and price-to-performance ratio across all contenders. Dependencies: []\n"
                "- GEOGRAPHIC / CURRENCY ANCHORING: If the query mentions INR/Rupees (e.g. 'under 50 thousand', '₹50,000'), ground searches strictly in the Indian consumer retail market.\n"
                "- NEVER create a 4th or 5th dependent step for final synthesis; the dedicated Synthesizer Agent does this at the end."
            )

        return "\n".join(instructions)

    def create_plan(
        self,
        task: str,
        context: Optional[str] = None,
    ) -> LLMResponse[Plan]:
        """
        Takes a natural-language task and produces a fully validated Plan object.
        """
        domain_guidance = self._build_domain_instructions(task)
        system_prompt = f"{BASE_PLANNER_SYSTEM_PROMPT}\n{domain_guidance}"

        user_prompt = f"### USER TASK TO DECOMPOSE FOR DEEP RESEARCH:\n{task}\n"
        if context:
            user_prompt += f"\n### ADDITIONAL CONSTRAINTS & CONTEXT:\n{context}\n"

        user_prompt += (
            "\nGenerate an optimal, highly concurrent deep-research execution plan (3 to 4 focused steps, strictly within 3-7 steps bounds) "
            "with clear step_ids (e.g., 'step_1', 'step_2'), actionable titles, detailed descriptions, search queries for external research, "
            "and explicit dependencies. Maximize concurrency by having independent research axes run in parallel waves where possible."
        )

        response: LLMResponse[Plan] = self.gateway.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=Plan,
            model=self.model,
            temperature=0.1,  # Low temperature for deterministic, logical planning
            max_tokens=2500,
        )

        return response

    def plan_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Convenience method to execute planning directly on a WorkflowState object,
        transitioning its status and updating cost/token telemetry.
        """
        state.status = WorkflowStatus.PLANNING
        response = self.create_plan(task=state.task)

        # Update state with the validated plan and telemetry
        state.plan = response.parsed
        state.status = WorkflowStatus.PLAN_READY
        state.total_tokens += response.total_tokens
        state.estimated_cost_usd += response.estimated_cost_usd

        return state
