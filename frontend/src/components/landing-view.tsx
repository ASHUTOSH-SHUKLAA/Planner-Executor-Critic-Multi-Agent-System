"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleHelp,
  FileText,
  GitBranch,
  Globe2,
  RotateCcw,
  ShieldCheck,
  Waypoints,
  HelpCircle,
  Compass,
  FileCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ChevronRight,
  Database,
  Cpu,
  CornerDownLeft,
} from "lucide-react";
import { Navbar } from "@/components/navbar";

/* =========================================================================================
   SECTION A DATA — The Research Process (4 Stages: Question → Plan → Investigate → Report)
   ========================================================================================= */
const PROCESS_STEPS = [
  {
    id: "question",
    number: "01",
    title: "Question",
    description: "Understand the objective.",
    icon: HelpCircle,
    accent: "var(--text-muted)",
  },
  {
    id: "plan",
    number: "02",
    title: "Plan",
    description: "Break it into tasks.",
    icon: GitBranch,
    accent: "var(--agent-planner)",
  },
  {
    id: "investigate",
    number: "03",
    title: "Investigate",
    description: "Gather and validate evidence.",
    icon: Globe2,
    accent: "var(--agent-executor)",
  },
  {
    id: "report",
    number: "04",
    title: "Report",
    description: "Synthesize findings.",
    icon: FileCheck,
    accent: "var(--agent-synthesizer)",
    isFinal: true,
  },
];

/* =========================================================================================
   SECTION B DATA — Multi-Agent Architecture
   ========================================================================================= */
interface AgentItem {
  id: string;
  name: string;
  role: string;
  accent: string;
  icon: typeof GitBranch;
  description: string;
}

const AGENTS: Record<string, AgentItem> = {
  planner: {
    id: "planner",
    name: "Planner",
    role: "Breaks into tasks",
    accent: "var(--agent-planner)",
    icon: GitBranch,
    description: "Planner — Understands the objective and breaks complex questions into a dependency-aware task graph.",
  },
  executor: {
    id: "executor",
    name: "Executor",
    role: "Gathers live sources",
    accent: "var(--agent-executor)",
    icon: Globe2,
    description: "Executor — Investigates each task across live sources, extracting empirical data and citations.",
  },
  critic: {
    id: "critic",
    name: "Critic",
    role: "Validates evidence",
    accent: "var(--agent-critic)",
    icon: ShieldCheck,
    description: "Critic — Evaluates research quality, completeness, and evidence with zero hallucination tolerance.",
  },
  replanner: {
    id: "replanner",
    name: "Dynamic Re-Planner",
    role: "Conditional recovery",
    accent: "var(--agent-recovery)",
    icon: RotateCcw,
    description: "Dynamic Re-Planner — Conditional recovery agent that revises insufficient research and mutates the task graph.",
  },
  synthesizer: {
    id: "synthesizer",
    name: "Synthesizer",
    role: "Compiles final report",
    accent: "var(--agent-synthesizer)",
    icon: FileText,
    description: "Synthesizer — Harmonizes approved findings and matrices into an authoritative, publication-ready report.",
  },
};

/* =========================================================================================
   SECTION C DATA — Research Lifecycle (3 Phases: Understand → Investigate → Deliver)
   ========================================================================================= */
const LIFECYCLE_STAGES = [
  {
    phase: "01",
    id: "understand",
    title: "Understand",
    description: "Define the question.",
    accent: "var(--agent-planner)",
    icon: GitBranch,
  },
  {
    phase: "02",
    id: "investigate",
    title: "Investigate",
    description: "Research and validate.",
    accent: "var(--agent-executor)",
    icon: Globe2,
    isCore: true,
  },
  {
    phase: "03",
    id: "deliver",
    title: "Deliver",
    description: "Synthesize findings.",
    accent: "var(--agent-synthesizer)",
    icon: FileCheck,
  },
];

const capabilities = [
  { icon: GitBranch, title: "Structured planning", detail: "The Planner builds a dependency-aware task graph.", tone: "planner" },
  { icon: Globe2, title: "Research execution", detail: "The Executor researches ready tasks and gathers sources.", tone: "executor" },
  { icon: ShieldCheck, title: "Intermediate evaluation", detail: "The Critic reviews each step before it moves forward.", tone: "critic" },
  { icon: RotateCcw, title: "Conditional recovery", detail: "Failed steps get bounded feedback retries before a limited re-plan.", tone: "replanner" },
  { icon: FileText, title: "Structured reporting", detail: "The Synthesizer organizes approved findings and sources.", tone: "synthesizer" },
];

const questions = [
  {
    question: "What is Synora?",
    answer: "Synora is an autonomous research platform powered by coordinated AI agents. Unlike standard chatbots that provide one-shot probabilistic answers, Synora breaks complex objectives into focused investigations, evaluates intermediate findings against grounded evidence, and synthesizes publication-grade reports.",
  },
  {
    question: "How do the agents work together?",
    answer: "The Planner creates an acyclic task DAG. The Executor gathers empirical findings from live sources. The Critic reviews each result with zero hallucination tolerance. If a step fails, the Dynamic Re-Planner conditionally revises the task graph. Once all steps pass, the Synthesizer compiles the final report.",
  },
  {
    question: "When does re-planning happen?",
    answer: "Re-planning is strictly a conditional recovery path. If a step fails after bounded feedback retries and re-plan allowance remains (maximum 2 events), the Dynamic Re-Planner mutates the graph while locking completed steps. It is not an obligatory step in normal runs.",
  },
  {
    question: "Does review guarantee every answer is correct?",
    answer: "Intermediate review and explicit source links make the entire research reasoning path transparent and auditable. While the Critic strictly verifies that claims match extracted sources, users can inspect every citation link directly.",
  },
  {
    question: "Can I save or export a report?",
    answer: "Yes. Signed-in researchers can view past workflow history, download structured markdown reports, inspect step-by-step logs, and export findings directly from the workspace cockpit.",
  },
];

/* =========================================================================================
   SUBCOMPONENT: ProductPreview (Hero Visual)
   ========================================================================================= */
function ProductPreview() {
  return (
    <div className="agflow-preview" aria-label="Illustrative research workspace preview">
      <div className="agflow-preview-header">
        <div className="agflow-preview-brand"><span className="brand-status-dot" /><span>Synora workspace</span></div>
        <span className="agflow-preview-label">LIVE WORKFLOW TRACE</span>
      </div>

      <div className="agflow-preview-query">
        <span>RESEARCH QUESTION</span>
        <strong>Which urban cooling strategies have the strongest empirical evidence?</strong>
      </div>

      <div className="agflow-preview-progress">
        <div><span><i /> Executor researching step 02</span><strong>68% complete</strong></div>
        <div className="agflow-progress-track"><i /></div>
      </div>

      <div className="agflow-preview-work">
        <div className="agflow-preview-plan">
          <div className="agflow-preview-section-label"><GitBranch aria-hidden="true" /> Research plan <span>3 steps</span></div>
          <div className="agflow-plan-row"><i>01</i><span>Identify established cooling strategies</span><Check aria-hidden="true" /></div>
          <div className="agflow-plan-row is-active"><i>02</i><span>Compare empirical efficacy & cost TDP</span><span className="agflow-live-dot" /></div>
          <div className="agflow-plan-row"><i>03</i><span>Synthesize findings & source citations</span><span className="agflow-pending-dot" /></div>
        </div>

        <div className="agflow-preview-review">
          <div className="agflow-review-heading">
            <span className="agflow-review-mark"><ShieldCheck aria-hidden="true" /></span>
            <span><small>INTERMEDIATE GATE</small><strong>Critic Review</strong></span>
          </div>
          <p>Audits claims against gathered sources before allowing workflow to advance.</p>
          <div className="agflow-review-status"><span /> Validated step S01</div>
        </div>
      </div>

      <div className="agflow-preview-findings">
        <div><span>VALIDATED FINDING</span><strong>Tree canopy (3.2°C ambient reduction) and reflective roofs show clearest empirical effects.</strong></div>
        <span className="agflow-evidence-count"><Check aria-hidden="true" /> 8 Sources</span>
      </div>

      <div className="agflow-preview-recovery"><span><RotateCcw aria-hidden="true" /> Conditional recovery: Re-plans only if step retries exhaust</span><i aria-hidden="true" /></div>
      <div className="agflow-preview-foot"><span><Waypoints aria-hidden="true" /> Coordinated multi-agent pipeline</span><span>Deterministic completion</span></div>
    </div>
  );
}

/* =========================================================================================
   SECTION A COMPONENT — The Research Process (4 Stages: Question → Plan → Investigate → Report)
   ========================================================================================= */
function ResearchProcessSection() {
  return (
    <section className="agflow-value" id="process" aria-labelledby="agflow-value-title">
      <div className="agflow-section-intro agflow-section-intro-wide">
        <span className="agflow-eyebrow">A process for complex questions</span>
        <h2 id="agflow-value-title">
          A response is a start.<br className="hidden sm:inline" />
          {" "}Research takes a process.
        </h2>
        <p>
          Move beyond one-shot answers. Synora breaks complex questions into focused investigations, evaluates findings, and brings validated evidence together.
        </p>
      </div>

      {/* Minimalist 4-Stage Horizontal Flow */}
      <div className="agflow-minimal-process" role="list" aria-label="Synora 4-stage research workflow">
        {PROCESS_STEPS.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="agflow-process-step-wrap">
              <div
                role="listitem"
                className={`agflow-process-node ${stage.isFinal ? "is-final" : ""}`}
                style={{ "--step-accent": stage.accent } as React.CSSProperties}
              >
                <div className="agflow-process-node-top">
                  <span className="agflow-process-num">{stage.number}</span>
                  <div className="agflow-process-icon" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="agflow-process-title">{stage.title}</h3>
                <p className="agflow-process-desc">{stage.description}</p>
              </div>

              {/* Directional Connector between stages */}
              {idx < PROCESS_STEPS.length - 1 && (
                <div className="agflow-process-connector" aria-hidden="true">
                  <span className="agflow-process-line" />
                  <span className="agflow-process-arrow">➔</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================================================
   SECTION B COMPONENT — Multi-Agent Architecture (Single Connected Minimal Diagram)
   ========================================================================================= */
function AgentArchitectureSection() {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  const activeDescription = hoveredAgent
    ? AGENTS[hoveredAgent]?.description
    : "Coordinated research loop with intermediate verification and conditional recovery.";

  return (
    <section id="architecture" className="agflow-architecture" aria-labelledby="agflow-architecture-title">
      <div className="agflow-section-intro agflow-section-intro-wide">
        <span className="agflow-eyebrow">Multi-agent orchestration architecture</span>
        <h2 id="agflow-architecture-title">A clear path through every step.</h2>
        <p>
          Each result is evaluated before the workflow advances. Recovery starts only after bounded retries fail.
        </p>
      </div>

      {/* Single Connected Minimal Architecture Canvas */}
      <div className="agflow-minimal-arch-canvas" role="region" aria-label="Synora agent orchestration diagram">
        {/* PRIMARY EXECUTION FLOW: PLANNER -> EXECUTOR -> CRITIC -> DECISION */}
        <div className="agflow-arch-primary-row">
          {/* Planner Node */}
          <div
            tabIndex={0}
            onMouseEnter={() => setHoveredAgent("planner")}
            onMouseLeave={() => setHoveredAgent(null)}
            onFocus={() => setHoveredAgent("planner")}
            onBlur={() => setHoveredAgent(null)}
            className="agflow-agent-node tone-planner"
            style={{ "--node-accent": AGENTS.planner.accent } as React.CSSProperties}
          >
            <div className="agflow-agent-node-icon">
              <GitBranch className="h-4 w-4" />
            </div>
            <div className="agflow-agent-node-text">
              <strong className="agflow-agent-node-name">Planner</strong>
              <span className="agflow-agent-node-role">Breaks into tasks</span>
            </div>
          </div>

          {/* Connector */}
          <div className="agflow-arch-line-conn" aria-hidden="true">
            <span className="agflow-arch-line" />
            <span className="agflow-arch-chevron">➔</span>
          </div>

          {/* Executor Node */}
          <div
            tabIndex={0}
            onMouseEnter={() => setHoveredAgent("executor")}
            onMouseLeave={() => setHoveredAgent(null)}
            onFocus={() => setHoveredAgent("executor")}
            onBlur={() => setHoveredAgent(null)}
            className="agflow-agent-node tone-executor"
            style={{ "--node-accent": AGENTS.executor.accent } as React.CSSProperties}
          >
            <div className="agflow-agent-node-icon">
              <Globe2 className="h-4 w-4" />
            </div>
            <div className="agflow-agent-node-text">
              <strong className="agflow-agent-node-name">Executor</strong>
              <span className="agflow-agent-node-role">Gathers evidence</span>
            </div>
          </div>

          {/* Connector */}
          <div className="agflow-arch-line-conn" aria-hidden="true">
            <span className="agflow-arch-line" />
            <span className="agflow-arch-chevron">➔</span>
          </div>

          {/* Critic Node */}
          <div
            tabIndex={0}
            onMouseEnter={() => setHoveredAgent("critic")}
            onMouseLeave={() => setHoveredAgent(null)}
            onFocus={() => setHoveredAgent("critic")}
            onBlur={() => setHoveredAgent(null)}
            className="agflow-agent-node tone-critic"
            style={{ "--node-accent": AGENTS.critic.accent } as React.CSSProperties}
          >
            <div className="agflow-agent-node-icon">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="agflow-agent-node-text">
              <strong className="agflow-agent-node-name">Critic</strong>
              <span className="agflow-agent-node-role">Evaluates quality</span>
            </div>
          </div>

          {/* Connector */}
          <div className="agflow-arch-line-conn" aria-hidden="true">
            <span className="agflow-arch-line" />
            <span className="agflow-arch-chevron">➔</span>
          </div>

          {/* Decision Node */}
          <div className="agflow-arch-decision">
            <div className="agflow-decision-diamond" aria-hidden="true" />
            <div className="agflow-decision-copy">
              <small>DECISION</small>
              <strong>Step passed?</strong>
            </div>
          </div>
        </div>

        {/* TWO BRANCH PATHS: APPROVED & REVISION */}
        <div className="agflow-arch-branches">
          {/* Path 1: Approved -> Synthesizer -> Report */}
          <div className="agflow-arch-branch is-approved">
            <div className="agflow-branch-label">
              <span className="agflow-branch-dot is-approved" />
              <span>Approved</span>
              <span className="agflow-branch-arrow">➔</span>
            </div>

            <div
              tabIndex={0}
              onMouseEnter={() => setHoveredAgent("synthesizer")}
              onMouseLeave={() => setHoveredAgent(null)}
              onFocus={() => setHoveredAgent("synthesizer")}
              onBlur={() => setHoveredAgent(null)}
              className="agflow-agent-node tone-synthesizer"
              style={{ "--node-accent": AGENTS.synthesizer.accent } as React.CSSProperties}
            >
              <div className="agflow-agent-node-icon">
                <FileText className="h-4 w-4" />
              </div>
              <div className="agflow-agent-node-text">
                <strong className="agflow-agent-node-name">Synthesizer</strong>
                <span className="agflow-agent-node-role">Synthesizes report</span>
              </div>
            </div>

            <div className="agflow-arch-line-conn" aria-hidden="true">
              <span className="agflow-arch-line" />
              <span className="agflow-arch-chevron">➔</span>
            </div>

            <div className="agflow-outcome-node">
              <FileCheck className="h-4 w-4 text-[#16776e]" />
              <strong>Report</strong>
            </div>
          </div>

          {/* Path 2: Needs Revision -> Dynamic Re-Planner -> Loop back to Executor */}
          <div className="agflow-arch-branch is-revision">
            <div className="agflow-branch-label">
              <span className="agflow-branch-dot is-revision" />
              <span>Needs Revision</span>
              <span className="agflow-branch-arrow">➔</span>
            </div>

            <div
              tabIndex={0}
              onMouseEnter={() => setHoveredAgent("replanner")}
              onMouseLeave={() => setHoveredAgent(null)}
              onFocus={() => setHoveredAgent("replanner")}
              onBlur={() => setHoveredAgent(null)}
              className="agflow-agent-node tone-replanner"
              style={{ "--node-accent": AGENTS.replanner.accent } as React.CSSProperties}
            >
              <div className="agflow-agent-node-icon">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="agflow-agent-node-text">
                <strong className="agflow-agent-node-name">Dynamic Re-Planner</strong>
                <span className="agflow-agent-node-role">Revises failed tasks</span>
              </div>
            </div>

            {/* Loop return line back to Executor */}
            <div className="agflow-recovery-return" aria-label="Revised tasks return to Executor">
              <CornerDownLeft className="h-4 w-4 text-[var(--agent-executor)]" />
              <span>Loops back to Executor ↶</span>
            </div>
          </div>
        </div>

        {/* Compact Shared Description Bar */}
        <div className="agflow-arch-description-bar" aria-live="polite">
          <span className="agflow-desc-dot" />
          <p className="agflow-desc-text">{activeDescription}</p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================================
   SECTION C COMPONENT — Research Lifecycle (Three Phases: Understand → Investigate → Deliver)
   ========================================================================================= */
function ResearchLifecycleSection() {
  return (
    <section id="workflow" className="agflow-lifecycle" aria-labelledby="agflow-lifecycle-title">
      <div className="agflow-section-intro agflow-section-intro-wide">
        <span className="agflow-eyebrow">Research lifecycle</span>
        <h2 id="agflow-lifecycle-title">Three phases. One considered report.</h2>
        <p>
          A continuous progression from raw inquiry to publication-ready deliverable.
        </p>
      </div>

      {/* Minimalist 3-Stage Horizontal Timeline */}
      <div className="agflow-minimal-lifecycle" role="list" aria-label="Synora 3-phase research lifecycle">
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="agflow-lifecycle-step-wrap">
              <div
                role="listitem"
                className={`agflow-lifecycle-stage ${stage.isCore ? "is-core" : ""}`}
                style={{ "--stage-accent": stage.accent } as React.CSSProperties}
              >
                <div className="agflow-lifecycle-header">
                  <span className="agflow-lifecycle-num">{stage.phase}</span>
                  <div className="agflow-lifecycle-icon" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="agflow-lifecycle-title">{stage.title}</h3>
                <p className="agflow-lifecycle-desc">{stage.description}</p>
              </div>

              {idx < LIFECYCLE_STAGES.length - 1 && (
                <div className="agflow-lifecycle-track-connector" aria-hidden="true">
                  <span className="agflow-lifecycle-track-line" />
                  <span className="agflow-lifecycle-track-chevron">➔</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================================================
   MAIN EXPORT: LandingView
   ========================================================================================= */
export function LandingView() {
  return (
    <div className="agflow-landing">
      <Navbar minimalLanding />
      <main>
        {/* HERO SECTION */}
        <section className="agflow-hero" id="product" aria-labelledby="agflow-title">
          <div className="agflow-hero-grid">
            <div className="agflow-hero-copy">
              <span className="agflow-eyebrow"><span /> Autonomous research platform</span>
              <h1 id="agflow-title" className="agflow-hero-title">
                Research that thinks,<br />
                <span>verifies, and evolves.</span>
              </h1>
              <p>
                Synora transforms complex questions into structured investigations through coordinated agents that plan, execute, evaluate, and synthesize findings.
              </p>
              <div className="agflow-hero-actions">
                <Link href="/signup" className="agflow-button agflow-button-primary">
                  Start researching <ArrowRight aria-hidden="true" />
                </Link>
                <a href="#architecture" className="agflow-button agflow-button-secondary">
                  Explore the architecture
                </a>
              </div>
              <div className="agflow-hero-note">
                <span>Plan</span><i />
                <span>Research</span><i />
                <span>Review</span><i />
                <span>Synthesize</span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* SECTION A — The research process: "A response is a start. Research takes a process." */}
        <ResearchProcessSection />

        {/* SECTION B — Agent architecture: "A clear path through every step." */}
        <AgentArchitectureSection />

        {/* SECTION C — Research lifecycle: "Three phases. One considered report." */}
        <ResearchLifecycleSection />

        {/* BUILT INTO THE WORKSPACE (Features) */}
        <section id="features" className="agflow-capabilities" aria-labelledby="agflow-capabilities-title">
          <div className="agflow-section-intro">
            <span className="agflow-eyebrow">Built into the workspace</span>
            <h2 id="agflow-capabilities-title">Tools for a traceable process.</h2>
          </div>
          <ul className="agflow-capability-list">
            {capabilities.map(({ icon: Icon, title, detail, tone }) => (
              <li className={`tone-${tone}`} key={title}>
                <span className="agflow-capability-icon"><Icon aria-hidden="true" /></span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ SECTION */}
        <section id="questions" className="agflow-faq" aria-labelledby="agflow-faq-title">
          <div className="agflow-section-intro">
            <span className="agflow-eyebrow"><CircleHelp aria-hidden="true" /> Common questions</span>
            <h2 id="agflow-faq-title">Understand the workflow.</h2>
          </div>
          <div className="agflow-faq-list">
            {questions.map((item) => (
              <details key={item.question}>
                <summary>{item.question}<span aria-hidden="true" /></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="agflow-final-cta" aria-labelledby="agflow-cta-title">
          <div className="agflow-final-cta-inner">
            <div>
              <span className="agflow-eyebrow">Your next question is a good start</span>
              <h2 id="agflow-cta-title">Have something worth investigating?</h2>
            </div>
            <Link href="/signup" className="agflow-button agflow-button-primary">
              Launch workspace <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="agflow-footer">
        <div className="agflow-footer-inner">
          <div className="agflow-footer-brand">
            <div>
              <strong>Synora</strong>
              <span>Autonomous research powered by coordinated intelligence.</span>
            </div>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#product">Product</a>
            <a href="#process">Process</a>
            <a href="#architecture">Architecture</a>
            <a href="#workflow">Workflow</a>
            <a href="#features">Features</a>
          </nav>
          <div className="agflow-footer-actions">
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Launch workspace <ArrowRight aria-hidden="true" /></Link>
          </div>
          <small>Think. Investigate. Validate. Synthesize.</small>
        </div>
      </footer>
    </div>
  );
}
