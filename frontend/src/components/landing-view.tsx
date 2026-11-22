"use client";

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
} from "lucide-react";
import { Navbar } from "@/components/navbar";

const lifecycle = [
  { number: "01", name: "Understand", icon: GitBranch, color: "planner", steps: ["Set the objective", "Generate the plan"] },
  { number: "02", name: "Investigate", icon: Globe2, color: "executor", steps: ["Execute research", "Evaluate findings", "Recover when needed"] },
  { number: "03", name: "Deliver", icon: FileText, color: "synthesizer", steps: ["Synthesize approved findings", "Generate the report"] },
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
    answer: "Synora is a research workspace that coordinates planning, web research, review, recovery, and report synthesis for complex questions.",
  },
  {
    question: "How do the agents work together?",
    answer: "The Planner creates research steps. Executors gather findings. The Critic reviews intermediate work, and the Synthesizer assembles accepted findings into the final report.",
  },
  {
    question: "When does re-planning happen?",
    answer: "It is a recovery path for failed or insufficient work, subject to the workflow's configured retry and re-plan limits. It is not a required step on every run.",
  },
  {
    question: "Does review guarantee every answer is correct?",
    answer: "No. Review and source links make the research process easier to inspect, but they do not guarantee that every finding is correct or complete.",
  },
  {
    question: "Can I save or export a report?",
    answer: "Yes. Signed-in users can save reports and revisit research history. Reports can be copied or exported from the workspace.",
  },
];

function ProductPreview() {
  return (
    <div className="agflow-preview" aria-label="Illustrative research workspace preview">
      <div className="agflow-preview-header">
        <div className="agflow-preview-brand"><span className="brand-status-dot" /><span>Synora workspace</span></div>
        <span className="agflow-preview-label">ILLUSTRATIVE RUN</span>
      </div>

      <div className="agflow-preview-query">
        <span>RESEARCH QUESTION</span>
        <strong>Which urban cooling strategies have the strongest evidence?</strong>
      </div>

      <div className="agflow-preview-progress">
        <div><span><i /> Executor is researching</span><strong>68%</strong></div>
        <div className="agflow-progress-track"><i /></div>
      </div>

      <div className="agflow-preview-work">
        <div className="agflow-preview-plan">
          <div className="agflow-preview-section-label"><GitBranch aria-hidden="true" /> Research plan <span>3 steps</span></div>
          <div className="agflow-plan-row"><i>01</i><span>Identify established strategies</span><Check aria-hidden="true" /></div>
          <div className="agflow-plan-row is-active"><i>02</i><span>Compare evidence and trade-offs</span><span className="agflow-live-dot" /></div>
          <div className="agflow-plan-row"><i>03</i><span>Synthesize findings and sources</span><span className="agflow-pending-dot" /></div>
        </div>

        <div className="agflow-preview-review">
          <div className="agflow-review-heading"><span className="agflow-review-mark"><ShieldCheck aria-hidden="true" /></span><span><small>INTERMEDIATE REVIEW</small><strong>Critic</strong></span></div>
          <p>Checks findings against the task and gathered evidence.</p>
          <div className="agflow-review-status"><span /> Review follows execution</div>
        </div>
      </div>

      <div className="agflow-preview-findings">
        <div><span>FINDINGS</span><strong>Tree canopy and reflective roofs show the clearest cooling effects.</strong></div>
        <span className="agflow-evidence-count"><Check aria-hidden="true" /> Sources attached</span>
      </div>

      <div className="agflow-preview-recovery"><span><RotateCcw aria-hidden="true" /> Re-plan only if a step needs recovery</span><i aria-hidden="true" /></div>
      <div className="agflow-preview-foot"><span><Waypoints aria-hidden="true" /> Coordinated research flow</span><span>Example data</span></div>
    </div>
  );
}

function AgentArchitecture() {
  return (
    <div className="agflow-architecture-map" role="group" aria-label="For each task, the Planner creates a dependency graph, the Executor researches ready steps, and the Critic reviews each result. Approved steps continue through the graph. Rejected steps first receive bounded Critic-feedback retries. If those fail and re-plan allowance remains, the Dynamic Re-planner revises the graph and execution resumes. The Synthesizer runs after all steps pass; exhausted limits end the workflow as failed.">
      <div className="agflow-architecture-spine">
        <div className="agflow-flow-node tone-neutral"><small>INPUT</small><strong>Research objective</strong></div>
        <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
        <div className="agflow-flow-node tone-planner"><GitBranch aria-hidden="true" /><strong>Planner</strong><small>Builds task DAG</small></div>
        <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
        <div className="agflow-flow-node tone-executor"><Globe2 aria-hidden="true" /><strong>Executor</strong><small>Runs ready steps</small></div>
        <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
        <div className="agflow-flow-node tone-critic"><ShieldCheck aria-hidden="true" /><strong>Critic</strong><small>Reviews each result</small></div>
        <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
        <div className="agflow-decision"><span aria-hidden="true" /><strong>Step passed?</strong></div>
      </div>

      <div className="agflow-architecture-branches" aria-label="Critic outcomes">
        <section className="agflow-architecture-branch is-accepted" aria-labelledby="agflow-accepted-title">
          <div className="agflow-branch-heading"><span className="agflow-branch-signal" /><strong id="agflow-accepted-title">Accepted</strong></div>
          <div className="agflow-branch-flow">
            <span className="agflow-route-step">Approve this step and continue the DAG</span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-condition">When all planned steps pass</span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-agent tone-synthesizer"><FileText aria-hidden="true" /><strong>Synthesizer</strong></span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-report">Structured research report</span>
          </div>
        </section>

        <section className="agflow-architecture-branch is-revision" aria-labelledby="agflow-revision-title">
          <div className="agflow-branch-heading"><span className="agflow-branch-signal" /><strong id="agflow-revision-title">Needs revision</strong></div>
          <div className="agflow-branch-flow">
            <span className="agflow-route-step">Retry with Critic feedback · bounded</span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-return">Executor ↔ Critic</span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-condition">If retries fail and re-plan allowance remains</span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-agent tone-replanner"><RotateCcw aria-hidden="true" /><strong>Dynamic Re-planner</strong></span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-step">Revised task graph</span>
            <span className="agflow-flow-connector is-vertical" aria-hidden="true" />
            <span className="agflow-route-return">Resume at Executor ↶</span>
          </div>
        </section>
      </div>

      <p className="agflow-architecture-limit">If retry or re-plan limits are exhausted, the workflow ends as failed.</p>
    </div>
  );
}

export function LandingView() {
  return (
    <div className="agflow-landing">
      <Navbar minimalLanding />
      <main>
        <section className="agflow-hero" id="product" aria-labelledby="agflow-title">
          <div className="agflow-hero-grid">
            <div className="agflow-hero-copy">
            <span className="agflow-eyebrow"><span /> Autonomous research workspace</span>
              <h1 id="agflow-title" className="agflow-hero-title">Research that thinks,<br /><span>verifies, and evolves.</span></h1>
              <p>Synora transforms complex questions into structured investigations through coordinated agents that plan, execute, evaluate, and synthesize findings.</p>
              <div className="agflow-hero-actions">
                <Link href="/signup" className="agflow-button agflow-button-primary">Start researching <ArrowRight aria-hidden="true" /></Link>
                <a href="#architecture" className="agflow-button agflow-button-secondary">Explore the architecture</a>
              </div>
              <div className="agflow-hero-note"><span>Plan</span><i /><span>Research</span><i /><span>Review</span><i /><span>Synthesize</span></div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="agflow-value" aria-labelledby="agflow-value-title">
          <div className="agflow-section-intro">
            <span className="agflow-eyebrow">A process for complex questions</span>
            <h2 id="agflow-value-title">A response is a start.<br />Research takes a process.</h2>
            <p>Multi-step questions benefit from a clear plan, intermediate review, and a way to recover when a step falls short.</p>
          </div>
          <div className="agflow-compare" aria-label="Compare a single response with a coordinated research workflow">
            <div className="agflow-compare-row agflow-compare-simple"><span className="agflow-compare-label">Single pass</span><strong>Question</strong><i /><strong>Response</strong></div>
            <div className="agflow-compare-row agflow-compare-coordinated"><span className="agflow-compare-label">Synora</span><strong>Question</strong><i /><strong>Plan</strong><i /><strong>Research</strong><i /><strong>Review</strong><i className="is-conditional" /><strong>Report</strong><small>Re-plan on failure</small></div>
          </div>
        </section>

        <section id="architecture" className="agflow-architecture" aria-labelledby="agflow-architecture-title">
          <div className="agflow-section-intro agflow-section-intro-wide">
            <span className="agflow-eyebrow">How the agents work together</span>
            <h2 id="agflow-architecture-title">A clear path through every step.</h2>
            <p>Each result is evaluated before the workflow advances. Recovery starts only after bounded retries fail.</p>
          </div>
          <AgentArchitecture />
        </section>

        <section id="workflow" className="agflow-lifecycle" aria-labelledby="agflow-lifecycle-title">
          <div className="agflow-section-intro">
            <span className="agflow-eyebrow">Research lifecycle</span>
            <h2 id="agflow-lifecycle-title">Three phases. One considered report.</h2>
          </div>
          <ol className="agflow-phase-list">
            {lifecycle.map(({ number, name, icon: Icon, color, steps }) => (
              <li className={`agflow-phase tone-${color}`} key={number}>
                <div className="agflow-phase-heading"><span>{number}</span><Icon aria-hidden="true" /><h3>{name}</h3></div>
                <ul>{steps.map((step) => <li key={step}>{step}</li>)}</ul>
              </li>
            ))}
          </ol>
        </section>

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

        <section className="agflow-final-cta" aria-labelledby="agflow-cta-title">
          <div className="agflow-final-cta-inner">
            <div><span className="agflow-eyebrow">Your next question is a good start</span><h2 id="agflow-cta-title">Have something worth investigating?</h2></div>
            <Link href="/signup" className="agflow-button agflow-button-primary">Launch workspace <ArrowRight aria-hidden="true" /></Link>
          </div>
        </section>
      </main>

      <footer className="agflow-footer">
        <div className="agflow-footer-inner">
          <div className="agflow-footer-brand"><div><strong>Synora</strong><span>Autonomous research powered by coordinated intelligence.</span></div></div>
          <nav aria-label="Footer navigation"><a href="#product">Product</a><a href="#architecture">Architecture</a><a href="#workflow">Workflow</a><a href="#features">Features</a></nav>
          <div className="agflow-footer-actions"><Link href="/login">Sign in</Link><Link href="/signup">Launch workspace <ArrowRight aria-hidden="true" /></Link></div>
          <small>Think. Investigate. Validate. Synthesize.</small>
        </div>
      </footer>
    </div>
  );
}
