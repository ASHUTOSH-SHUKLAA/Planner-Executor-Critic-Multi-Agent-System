"""
Synthesizer Agent: Final Delivery Coordinator.
Combines all validated step deliverables into a coherent, publication-ready executive report.
Eliminates redundancies, synthesizes cross-step insights, and produces a structured final document.
"""

from typing import Optional
from rich.console import Console

from src.models.schemas import WorkflowState, WorkflowStatus
from src.llm.client import LLMGateway

console = Console()

SYNTHESIZER_SYSTEM_PROMPT = """You are an elite Technical Synthesizer and Principal Solutions Architect.
Your role is to examine the deliverables from multiple autonomous agent steps and synthesize them into a single, cohesive, publication-quality final technical report.

### SYNTHESIS RULES:
1. **Executive Cohesion**: Do NOT simply concatenate the steps. Unify the narrative into a seamless, executive-level document.
2. **Eliminate Redundancy**: If different steps discussed overlapping definitions or background, merge them concisely.
3. **Preserve Technical Rigor**: Retain all critical algorithms, formulas, architectural trade-offs, and key numerical findings.
4. **Structured Format**:
   - **Executive Summary**: High-level problem overview and definitive conclusion.
   - **Architectural / Technical Breakdown**: Core mechanics and comparative trade-offs.
   - **Implementation & Operational Roadmap**: Concrete steps, algorithms, and code/configuration strategies.
   - **Failure Modes & Guardrails**: Edge cases, rate-limiting, and error-handling strategies.
5. **Tone**: Objective, authoritative, and clear. Output standard Markdown.
"""


class SynthesizerAgent:
    """
    Agent responsible for transforming raw multi-step outputs into a cohesive final synthesis.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        model: Optional[str] = None,
    ):
        self.gateway = gateway or LLMGateway()
        # High reasoning model for superior executive writing and architectural synthesis
        self.model = model or getattr(self.gateway, "default_model", "openai/gpt-oss-120b")

    def synthesize_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Synthesizes all completed step outputs into a final deliverable report.
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

        user_prompt = f"""### OVERALL OBJECTIVE:
{state.task}

### STEP DELIVERABLES TO SYNTHESIZE:
{all_steps_text}

Please produce the final unified executive technical report in clean Markdown."""

        response = self.gateway.generate_text(
            system_prompt=SYNTHESIZER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            model=self.model,
            temperature=0.3,
            max_tokens=3000,
        )

        state.final_result = response.raw_content
        state.total_tokens += response.total_tokens
        state.estimated_cost_usd += response.estimated_cost_usd

        return state
