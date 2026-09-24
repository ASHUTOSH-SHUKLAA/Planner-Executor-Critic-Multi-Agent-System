"""
Synthesizer Agent: Final Delivery Coordinator.
Combines all validated step deliverables and verified research citations into a coherent,
publication-ready executive report with comparison tables and verifiable source links.
"""

from typing import Optional, List
from rich.console import Console

from src.models.schemas import WorkflowState, WorkflowStatus
from src.llm.client import LLMGateway

console = Console()

SYNTHESIZER_SYSTEM_PROMPT = """You are an elite Principal Research Analyst and Technical Synthesizer.
Your role is to synthesize deliverables and verified external research into a definitive, publication-quality final report.

### SYNTHESIS RULES:
1. **Directly Address the User's Goal**: Focus entirely on answering the user's question with actionable conclusions, exact figures, and clear analysis.
2. **Do NOT Expose Internal Mechanics**: Do NOT say "The Executor executed step 1..." or "The Critic validated...". Write naturally: "Based on the research and market analysis, here is the comprehensive evaluation..."
3. **Structured Format & Comparison Tables**:
   - **Executive Summary**: Clear, definitive high-level takeaway and recommendation.
   - **Detailed Comparative Analysis**: Use Markdown tables where appropriate (e.g., comparing models, prices, range/mileage, maintenance, features).
   - **Key Trade-offs & Ownership Factors**: Practical considerations (e.g., charging infrastructure vs fuel costs, resale, maintenance).
   - **Definitive Recommendation**: Who should choose Option A vs Option B.
4. **Mandatory Citations & Sources Section**:
   - At the end of the report, you MUST provide an explicit `## Sources & Citations` section.
   - List every verified source provided to you with a direct clickable markdown link: `[Source Title - Domain](URL)`.
5. **Tone**: Objective, authoritative, precise, and professional. Output standard Markdown.
"""


class SynthesizerAgent:
    """
    Agent responsible for transforming raw multi-step outputs and citations into a cohesive final report.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        model: Optional[str] = None,
    ):
        self.gateway = gateway or LLMGateway()
        # Capable reasoning model for executive writing and architectural synthesis
        self.model = model or getattr(self.gateway, "default_model", "gemini-flash-lite-latest")

    def synthesize_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Synthesizes all completed step outputs and gathered citations into a final deliverable report.
        """
        if not state.step_outputs:
            console.print("[yellow]No step outputs available to synthesize.[/yellow]")
            state.final_result = "No step deliverables were produced during workflow execution."
            return state

        # Construct input context from all passed step outputs
        step_blocks = []
        for step_id, output in state.step_outputs.items():
            findings = "\n".join(f"- {f}" for f in output.key_findings) if output.key_findings else "None"
            step_blocks.append(
                f"### Deliverable for [{step_id}]\n"
                f"**Content:**\n{output.content}\n\n"
                f"**Key Findings:**\n{findings}\n"
            )

        all_steps_text = "\n---\n".join(step_blocks)

        # Build citations block from aggregated state sources
        sources_text = "No external web sources were recorded."
        if state.sources:
            sources_lines = []
            for idx, src in enumerate(state.sources, start=1):
                sources_lines.append(
                    f"[{idx}] {src.title} | Domain: {src.domain} | URL: {src.url}\n"
                    f"    Snippet: {src.snippet}"
                )
            sources_text = "\n\n".join(sources_lines)

        user_prompt = f"""### OVERALL OBJECTIVE:
{state.task}

### STEP DELIVERABLES TO SYNTHESIZE:
{all_steps_text}

### VERIFIED EXTERNAL SOURCES GATHERED DURING RESEARCH:
{sources_text}

Please produce the final publication-ready report in clean Markdown, including comparison tables and the mandatory '## Sources & Citations' section."""

        response = self.gateway.generate_text(
            system_prompt=SYNTHESIZER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            model=self.model,
            temperature=0.3,
            max_tokens=4000,
        )

        state.final_result = response.raw_content
        state.total_tokens += response.total_tokens
        state.estimated_cost_usd += response.estimated_cost_usd

        return state
