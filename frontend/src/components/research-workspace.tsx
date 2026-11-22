"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useResearch } from "@/lib/research-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useSpeechToText } from "@/lib/use-speech-to-text";
import { BrandMark } from "@/components/brand-mark";
import { ResearchSidebar } from "@/components/research-sidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ResearchProgress } from "@/components/research-progress";
import { ResearchLiveCockpit } from "@/components/research-live-cockpit";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceChip, WorkspaceIconButton, Composer, SegmentedControl, SuggestionCard } from "@/components/workspace-controls";
import { useTheme } from "@/lib/theme-context";
import {
  WorkflowStateData,
  StepOutputData,
  SourceCitation,
  SSEMessageEvent,
  streamWorkflowExecution,
  streamFollowUpExecution,
  apiDownloadWorkflow,
  apiGetWorkflow,
  apiListWorkflows,
  WorkflowListItem,
  getProxiedImageUrl,
} from "@/lib/api";
import { DISCOVER_TOPICS, RECOMMENDED_INQUIRIES } from "@/lib/discover-topics";
import { buildResearchViewModel } from "@/lib/research-view-model";
import { ResearchTopBar, ResearchTabType } from "@/components/research/ResearchTopBar";
import { QuestionCard } from "@/components/research/QuestionCard";
import { ResearchProgressRow } from "@/components/research/ResearchProgressRow";
import { LiveSourceChips } from "@/components/research/LiveSourceChips";
import { StepsChecklist } from "@/components/research/StepsChecklist";
import { AnswerSkeleton } from "@/components/research/AnswerSkeleton";
import { AnswerBody } from "@/components/research/AnswerBody";
import { ReportActionsPanel } from "@/components/research/ReportActionsPanel";
import { AnswerActions } from "@/components/research/AnswerActions";
import { RelatedQuestions } from "@/components/research/RelatedQuestions";
import { SourcesPanel } from "@/components/research/SourcesPanel";
import { SourcesTabContent } from "@/components/research/SourcesTabContent";
import { ImagesTabContent } from "@/components/research/ImagesTabContent";
import { StoppedState } from "@/components/research/StoppedState";
import { ConversationThread } from "@/components/research/ConversationThread";
import {
  Play,
  Plus,
  Sparkles,
  AlertCircle,
  Download,
  FileText,
  Globe,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Copy,
  Clock,
  ShoppingCart,
  Zap,
  ChevronDown,
  ArrowRight,
  RotateCcw,
  Cpu,
  Check,
  Square,
  Compass,
  Mic,
  MicOff,
  Send,
  MessageSquare,
  Search,
  CreditCard,
  ChevronRight,
  HelpCircle,
  Bell,
  Database,
  Moon,
  Bookmark,
  Trash2,
  X,
  TrendingUp,
  Menu,
  Share2,
  ArrowLeft,
} from "lucide-react";

export interface ResearchActivityItem {
  id: string;
  type: string;
  agent?: string;
  message: string;
  query?: string;
  platform?: string;
  domains?: string[];
  step_id?: string;
  timestamp: string;
}

export const AVAILABLE_MODELS = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    badge: "Recommended",
    provider: "Google",
    desc: "Default · Ultra-low latency deep research & synthesis",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    badge: "Next-Gen",
    provider: "Google",
    desc: "Next-generation high-speed cognitive intelligence",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    badge: "Cost Efficient",
    provider: "Google",
    desc: "Lightweight, low-token cost engine for rapid analysis",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    badge: "High Throughput",
    provider: "Google",
    desc: "Advanced high-throughput autonomous research model",
  },
];

export const ROTATING_SEARCH_SUGGESTIONS = [
  "What makes a phone camera feel great in everyday use?",
  "How do today's leading AI models compare for research?",
  "Where does solid-state battery technology stand today?",
  "Which engineering colleges in India might be right for me?",
  "When should I choose PostgreSQL over ScyllaDB?",
  "What should I know before choosing a vector database?",
  "How resilient are today's semiconductor supply chains?",
  "What are the most promising uses of CRISPR right now?",
];

export const BENCHMARK_STARTER_PILLS = [
  {
    id: "tech-schools",
    icon: "🎓",
    label: "Best Tech Schools in India",
    hint: "Academic Research (NIRF, Admissions & Placements)",
    prompt:
      "Research the best tech and engineering schools in India. Compare top IITs and NITs on NIRF rankings, JEE cutoffs, median placement CTC, faculty research, and official application portals.",
  },
  {
    id: "bm-01",
    icon: "🔋",
    label: "Solid-State Batteries 2026 (BM-01)",
    hint: "Energy density specs & active manufacturers",
    prompt:
      "Research current state of Solid-State Batteries in 2026. Identifies >=3 active manufacturers with energy density specs, commercialization roadmaps, and electrolyte architectures.",
  },
  {
    id: "bm-03",
    icon: "💻",
    label: "Apple M4 Max vs Intel Ultra 9 (BM-03)",
    hint: "Side-by-side IPC, thermal TDP & memory bandwidth",
    prompt:
      "Compare Apple M4 Max vs. Intel Core Ultra 9 architecture. Direct side-by-side IPC, thermal TDP, and memory bandwidth matrix with empirical benchmarks.",
  },
  {
    id: "bm-04",
    icon: "🗄️",
    label: "PostgreSQL vs ScyllaDB IoT (BM-04)",
    hint: "Read/write IOPS, scaling limits & ACID guarantees",
    prompt:
      "Compare PostgreSQL vs. ScyllaDB for time-series IoT workloads. Validates read/write IOPS, scaling limits, operational trade-offs, and ACID guarantees.",
  },
  {
    id: "bm-02",
    icon: "⚛️",
    label: "Quantum Computing Milestones (BM-02)",
    hint: "Qubit counts & physical error rate benchmarks",
    prompt:
      "Evaluate quantum computing commercialization milestones. Cites verified qubit counts, physical error rate benchmarks, and leading commercial players.",
  },
  {
    id: "bm-08",
    icon: "🚀",
    label: "K8s to Nomad Migration (BM-08)",
    hint: "Phased cutover, stateful storage & rollback plan",
    prompt:
      "Kubernetes to Nomad Migration Guide: Outlines phased cutover, stateful storage mapping, canary verification, and rollback disaster recovery plan.",
  },
  {
    id: "bm-11",
    icon: "🐍",
    label: "Fact-Check: Python GIL (BM-11)",
    hint: "Refutes 100% multithreaded speedup claims",
    prompt:
      "Fact-check the claim: 'Python 3.13 GIL removal yields 100% multithreaded speedup across all applications.' Verify against free-threaded benchmarks and C-extension bottlenecks.",
  },
  {
    id: "bm-05",
    icon: "🌐",
    label: "Semiconductor Supply Chains (BM-05)",
    hint: "Taiwan, US, and EU fab concentration risks",
    prompt:
      "Analyze geopolitical risks of global semiconductor supply chains. Highlights fab concentrations in Taiwan, US, and EU with verified trade and production data.",
  },
  {
    id: "bm-13",
    icon: "⚡",
    label: "Debunk: Water Boiling at 50°C (BM-13)",
    hint: "Atmospheric pressure thermodynamic refutation",
    prompt:
      "Fact-check: Explain why water boils at 50°C under normal atmospheric pressure. Refute claim using standard thermodynamic phase diagrams and vapor pressure curves.",
  },
];

export const RESEARCH_FOCUS_MODES = [
  {
    id: "deep",
    label: "Deep Research",
    icon: "⚡",
    depth: "deep",
    description: "5-agent autonomous synthesis loop",
    badge: "5 Agents",
  },
  {
    id: "compare",
    label: "Comparison Matrix",
    icon: "⚖️",
    depth: "deep",
    prefix: "Compare and contrast: ",
    description: "Side-by-side technical matrix",
    badge: "Matrix",
  },
  {
    id: "academic",
    label: "Academic & Tech",
    icon: "🎓",
    depth: "deep",
    prefix: "Research academic benchmarks and pedagogy of: ",
    description: "Rankings, cutoffs, placements & research",
    badge: "Colleges",
  },
  {
    id: "product",
    label: "Specs & Best Deals",
    icon: "🛒",
    depth: "standard",
    prefix: "Research specifications and best deal pricing for: ",
    description: "Empirical specs & lowest price links",
    badge: "Products",
  },
  {
    id: "quick",
    label: "Quick Synthesis",
    icon: "🚀",
    depth: "quick",
    description: "Rapid overview with citations",
    badge: "Fast",
  },
];

export const CURATED_CATEGORIES = [
  "All",
  "Academics",
  "Tech & AI",
  "Gadgets & Deals",
  "Science",
] as const;

export type CuratedCategory = (typeof CURATED_CATEGORIES)[number];

export const MASTER_CURATED_INQUIRIES: {
  id: string;
  category: "Academics" | "Tech & AI" | "Gadgets & Deals" | "Science";
  badge: string;
  title: string;
  desc: string;
  query: string;
  metadata: string;
  tag: string;
  accent: "indigo" | "blue" | "emerald" | "amber" | "cyan" | "rose";
}[] = [
    // 1. Academics
    {
      id: "inq-acad-1",
      category: "Academics",
      badge: "ACADEMIC • NIRF",
      title: "Best Tech Schools in India (Top IITs, IIITs & BITS)",
      desc: "Comprehensive evaluation of NIRF rankings, campus research labs, faculty citations, and placement CTCs.",
      query: "Research the best tech schools in India. Compare top IITs, IIITs, and BITS Pilani on NIRF rankings, faculty research output, and median placement CTCs.",
      metadata: "NIRF Datasets • Placements",
      tag: "Higher Education",
      accent: "indigo",
    },
    {
      id: "inq-acad-2",
      category: "Academics",
      badge: "ADMISSIONS • CUTOFFS",
      title: "JEE Advanced Closing Cutoffs for Computer Science",
      desc: "Opening and closing rank trajectories across IIT Bombay, IIT Delhi, IIT Madras, and IIT Kanpur.",
      query: "Compare JEE Advanced closing rank cutoffs for Computer Science and Engineering across top IITs over the past 3 years.",
      metadata: "Admissions Data • Cutoffs",
      tag: "Engineering",
      accent: "blue",
    },
    {
      id: "inq-acad-3",
      category: "Academics",
      badge: "GLOBAL • CS",
      title: "Top 10 Global Computer Science PhD Programs",
      desc: "Research output, state-of-the-art lab funding, and professor citation indices across MIT, Stanford, and CMU.",
      query: "Compare top 10 global computer science graduate programs focusing on AI and systems research funding and acceptance criteria.",
      metadata: "Global Rankings • AI Labs",
      tag: "Graduate Research",
      accent: "indigo",
    },
    {
      id: "inq-acad-4",
      category: "Academics",
      badge: "MANAGEMENT • ROI",
      title: "Premier IIMs vs ISB Hyderabad",
      desc: "Detailed median package, international mobility, and curriculum audit of IIM Ahmedabad, Bangalore, and ISB.",
      query: "Compare IIM Ahmedabad, IIM Bangalore, and ISB Hyderabad on median placement CTC, faculty pedagogy, and ROI.",
      metadata: "NIRF Management • ROI",
      tag: "Business Education",
      accent: "amber",
    },

    // 2. Gadgets & Deals
    {
      id: "inq-prod-1",
      category: "Gadgets & Deals",
      badge: "SPECS & BEST DEALS",
      title: "Flagship Smartphones Under ₹50,000",
      desc: "Camera sensor benchmarks, battery longevity, chipset benchmarks, and verified lowest price store deals.",
      query: "Best flagship smartphones for students under 50000 INR with best camera and lowest price deals",
      metadata: "Live Where-to-Buy • Deals",
      tag: "Consumer Electronics",
      accent: "cyan",
    },
    {
      id: "inq-prod-2",
      category: "Gadgets & Deals",
      badge: "HOME • APPLIANCES",
      title: "Inverter Washing Machines Comparison",
      desc: "5-star BEE energy ratings, motor warranties, water consumption metrics, and lowest online pricing.",
      query: "Compare best energy-efficient front-load inverter washing machines in India with where to buy links and pricing",
      metadata: "BEE Energy Ratings • Best Price",
      tag: "Home Appliances",
      accent: "emerald",
    },
    {
      id: "inq-prod-3",
      category: "Gadgets & Deals",
      badge: "DISPLAYS • HARDWARE",
      title: "4K OLED Monitors for Developers & Creators",
      desc: "Color gamut accuracy (DCI-P3), refresh rates, burn-in warranties, and lowest discounted prices.",
      query: "Best 4K OLED monitors for coding and creative work with HDR specs and verified cheapest store links",
      metadata: "Color Gamut • Store Links",
      tag: "Hardware",
      accent: "blue",
    },
    {
      id: "inq-prod-4",
      category: "Gadgets & Deals",
      badge: "CLEAN • MOBILITY",
      title: "Electric Vehicles (EV) Under ₹20 Lakhs",
      desc: "ARAI certified real-world range, battery chemistries, fast charging speeds, and government subsidies.",
      query: "Compare best electric cars under 20 Lakhs in India with real-world driving range, warranty, and pricing",
      metadata: "ARAI Range • Battery Specs",
      tag: "Clean Mobility",
      accent: "emerald",
    },

    // 3. Tech & AI
    {
      id: "inq-tech-1",
      category: "Tech & AI",
      badge: "DATA-ARCH • BENCH",
      title: "PostgreSQL vs ScyllaDB for Time-Series IoT",
      desc: "Partitioning topologies, write throughput under load, and p99 query latency benchmarks.",
      query: "Compare PostgreSQL vs. ScyllaDB for time-series IoT workloads. Validates read/write IOPS, scaling limits, and ACID guarantees.",
      metadata: "4 data engines • 3 papers",
      tag: "Database Systems",
      accent: "blue",
    },
    {
      id: "inq-tech-2",
      category: "Tech & AI",
      badge: "CHIP-ARCH • COMP",
      title: "Apple M4 Max vs Intel Core Ultra 9 Architecture",
      desc: "Direct side-by-side IPC, thermal TDP, efficiency curves, and unified memory bandwidth matrix.",
      query: "Compare Apple M4 Max vs. Intel Core Ultra 9 architecture. Direct side-by-side IPC, thermal TDP, and memory bandwidth matrix.",
      metadata: "Silicon benchmarks • TDP maps",
      tag: "Hardware",
      accent: "indigo",
    },
    {
      id: "inq-tech-3",
      category: "Tech & AI",
      badge: "AGENT-ORCH • SYS",
      title: "Multi-Agent Orchestration in 2026 Enterprise",
      desc: "Evaluates Planner, Executor, Critic state recovery, dynamic re-planning, and parallel pipelines.",
      query: "Analyze the state of multi-agent orchestration frameworks (AutoGen, CrewAI, LangGraph) in 2026 enterprise deployments.",
      metadata: "Autonomous agents • Workflow trees",
      tag: "Agentic AI",
      accent: "cyan",
    },
    {
      id: "inq-tech-4",
      category: "Tech & AI",
      badge: "RUNTIME • SPEED",
      title: "Python 3.13 Free-Threaded (No-GIL) Scaling",
      desc: "Verify multi-threaded performance speedups across CPU-bound numerical tasks and C-extension bottlenecks.",
      query: "Fact-check the claim: 'Python 3.13 GIL removal yields 100% multithreaded speedup across all applications.' Verify against free-threaded benchmarks and C-extension bottlenecks.",
      metadata: "GIL Benchmark • C-Extensions",
      tag: "Software Engineering",
      accent: "amber",
    },

    // 4. Science
    {
      id: "inq-sci-1",
      category: "Science",
      badge: "ENERGY • R&D",
      title: "Solid-State Batteries State in 2026",
      desc: "Energy density benchmarks (Wh/kg), electrolyte chemistry, and commercial automotive roadmaps.",
      query: "Research current state of Solid-State Batteries in 2026. Identifies >=3 active manufacturers with energy density specs.",
      metadata: "3 manufacturers • Wh/kg specs",
      tag: "Clean Energy",
      accent: "emerald",
    },
    {
      id: "inq-sci-2",
      category: "Science",
      badge: "QUANTUM • BENCH",
      title: "Quantum Computing Commercial Milestones",
      desc: "Physical qubit counts, topological error rates, and quantum advantage timelines across major labs.",
      query: "Evaluate quantum computing commercialization milestones. Cites verified qubit counts and physical error rate benchmarks.",
      metadata: "Qubit telemetry • Error bounds",
      tag: "Quantum Systems",
      accent: "indigo",
    },
    {
      id: "inq-sci-3",
      category: "Science",
      badge: "BIOTECH • GENOMICS",
      title: "CRISPR & Prime Editing in Clinical Trials",
      desc: "In vivo delivery vectors, off-target indel rates, and FDA clinical phase progression.",
      query: "Research the current state of CRISPR and prime editing in 2026 clinical trials for genetic disorders.",
      metadata: "Clinical Phases • Delivery Vectors",
      tag: "Biotechnology",
      accent: "rose",
    },
    {
      id: "inq-sci-4",
      category: "Science",
      badge: "AEROSPACE • ECONOMICS",
      title: "Reusable Rockets & Orbital Launch Cost Curves",
      desc: "Dollars per kilogram to Low Earth Orbit ($/kg LEO) comparison between Starship, Falcon 9, and New Glenn.",
      query: "Analyze orbital launch economics: Starship vs Falcon 9 vs New Glenn cost-per-kilogram trajectories through 2027.",
      metadata: "Launch Economics • Payload $/kg",
      tag: "Aerospace",
      accent: "blue",
    },
  ];

function getDynamicRelatedPrompts(task: string): string[] {
  const t = task.toLowerCase();
  if (t.includes("new age") || t.includes("tech school") || t.includes("coding school") || t.includes("bootcamp") || t.includes("academy")) {
    return [
      "Which modern tech schools offer dedicated physical campuses with offline mentoring and industry immersion?",
      "How do UGC-recognized degree partnerships and global accreditation models compare across modern tech academies?",
      "Compare the 4-year tuition fee structure, living expenses, and audited placement CTC outcomes across institutes",
    ];
  }
  if (t.includes("school") || t.includes("college") || t.includes("iit") || t.includes("university")) {
    return [
      "What are the latest JEE Advanced closing cutoffs for Computer Science across the top 7 IITs?",
      "Compare campus infrastructure, state-of-the-art research labs, and startup incubation between IIT Bombay and IIT Delhi",
      "How do median placement CTC and top tech recruiter packages compare between premier NITs and newer IITs?",
    ];
  }
  if (t.includes("m4") || t.includes("intel") || t.includes("ultra 9") || t.includes("cpu") || t.includes("processor")) {
    return [
      "How does Apple M4 Max 546 GB/s unified memory bandwidth accelerate local 70B parameter LLM inference?",
      "Compare sustained thermal throttling curves and battery life between M4 Max MacBook Pro and Intel Core Ultra 9 laptops",
      "Detailed single-core IPC and multi-threaded rendering benchmark comparison in Cinebench 2024 and Geekbench 6",
    ];
  }
  if (t.includes("batter") || t.includes("solid-state") || t.includes("energy")) {
    return [
      "What are the current chemical dendrite suppression mechanisms in ceramic vs sulfide-based solid electrolytes?",
      "Compare commercial automotive delivery roadmaps between QuantumScape, Toyota, and CATL through 2027",
      "What is the projected levelized cost per kilowatt-hour ($/kWh) for commercial solid-state cells?",
    ];
  }
  if (t.includes("scylla") || t.includes("postgres") || t.includes("database") || t.includes("iot")) {
    return [
      "What are the optimal compaction strategies (STCS vs TWCS) for millions of IoT sensor writes in ScyllaDB?",
      "How does TimescaleDB hypertables compare to ScyllaDB for time-series range aggregations and disk footprints?",
      "Detailed disaster recovery, multi-datacenter cross-region replication, and operational TCO comparison",
    ];
  }
  if (t.includes("nomad") || t.includes("kubernetes") || t.includes("k8s") || t.includes("migration")) {
    return [
      "How to map Kubernetes Ingress controllers and cert-manager certificates to HashiCorp Nomad with Traefik",
      "Step-by-step CSI storage migration protocol from Kubernetes persistent volumes to Nomad CSI plugins",
      "Zero-downtime blue/green deployment and canary cutover strategies using Nomad and Consul service mesh",
    ];
  }
  if (t.includes("gil") || t.includes("python") || t.includes("thread")) {
    return [
      "How do numerical packages like NumPy, PyTorch, and Polars scale in Python 3.13 free-threaded builds?",
      "What memory overhead and single-thread execution latency penalties exist in no-GIL Python 3.13?",
      "Benchmarking Python 3.13 free-threaded concurrency against Go goroutines and Java virtual threads",
    ];
  }
  return [
    `Deep-dive into the technical trade-offs and operational failure modes of this topic`,
    `Compare current state-of-the-art implementations against emerging next-generation alternatives`,
    `Evaluate the total cost of ownership, regulatory landscape, and 5-year outlook`,
  ];
}

export interface FollowUpItem {
  id: string;
  query: string;
  answer: string;
  sources?: SourceCitation[];
  suggested_questions?: string[];
  timestamp: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
}

function MobileWorkspaceHomeHeader({
  onNewResearch,
  onOpenSavedReports,
  savedReportsCount,
}: {
  onNewResearch: () => void;
  onOpenSavedReports: () => void;
  savedReportsCount: number;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <header className="flex md:hidden items-center justify-between h-14 px-3.5 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md sticky top-0 z-30 shrink-0 transition-colors">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Open navigation menu"
          title="Open navigation menu"
          className="p-2 -ml-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <BrandMark className="h-6 w-6 shrink-0" />
          <span className="font-bold text-sm text-[var(--text)] tracking-tight">Synora</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onNewResearch}
          aria-label="Start new research"
          title="Start new research"
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          <Plus className="h-5 w-5" />
        </button>
        {savedReportsCount > 0 && (
          <button
            type="button"
            onClick={onOpenSavedReports}
            aria-label="Saved reports"
            title="Saved reports"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer relative"
          >
            <Bookmark className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--accent)]" />
          </button>
        )}
        <ThemeToggle className="h-9 w-9 rounded-xl border-0 bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] shadow-none transition-colors" />
      </div>
    </header>
  );
}

function MobileResearchActiveHeader({
  activeTab,
  onChangeTab,
  sourcesCount,
  onBack,
  isRunning,
  onStop,
  isSaved,
  onToggleSave,
  onShare,
}: {
  activeTab: ResearchTabType;
  onChangeTab: (tab: ResearchTabType) => void;
  sourcesCount: number;
  onBack: () => void;
  isRunning?: boolean;
  onStop?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onShare?: () => void;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <header className="flex md:hidden items-center justify-between h-14 px-3 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md sticky top-0 z-30 shrink-0 transition-colors gap-2">
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to workspace"
          title="Back to workspace"
          className="p-2 -ml-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Center Tab Navigation */}
      <nav className="flex items-center gap-1 bg-[var(--surface-hover)] p-1 rounded-xl border border-[var(--border)]" aria-label="Research views">
        <button
          type="button"
          onClick={() => onChangeTab("answer")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "answer"
              ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Report
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("sources")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "sources"
              ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          <span>Sources</span>
          {sourcesCount > 0 && (
            <span className="font-mono text-[10px] px-1 py-0.2 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
              {sourcesCount}
            </span>
          )}
        </button>
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isRunning && onStop && (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold cursor-pointer"
            title="Stop research"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop</span>
          </button>
        )}
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSaved
                ? "text-[var(--accent)] bg-[var(--accent)]/10"
                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
            }`}
            title={isSaved ? "Saved in bookmarks" : "Save bookmark"}
            aria-label={isSaved ? "Saved in bookmarks" : "Save bookmark"}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        )}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            title="Share report"
            aria-label="Share report"
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}

export function ResearchWorkspace() {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const { user, token, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { success, error, info } = useToast();

  const {
    goal,
    setGoal,
    isRunning,
    activeWorkflowId,
    setActiveWorkflowId,
    workflowState,
    setWorkflowState,
    currentStage,
    activities,
    activeSearchQuery,
    activePlatform,
    elapsedSeconds,
    errorBanner,
    setErrorBanner,
    liveSidebarItem,
    selectedModel,
    setSelectedModel,
    researchDepth,
    setResearchDepth,
    activeFocusMode,
    setActiveFocusMode,
    followUps,
    isFollowUpRunning,
    followUpQuery,
    setFollowUpQuery,
    downloadingFormat,
    copied,
    isLoadingWorkflow,
    handleRun,
    handleStop,
    handleNewResearch: contextNewResearch,
    handleFollowUpSubmit,
    handleSelectWorkflow,
    handleDownloadReport,
    handleCopyReport,
  } = useResearch();

  const searchParams = useSearchParams();
  const urlWorkflowId = searchParams.get("workflow_id");
  const isClearingWorkflowRef = useRef(false);
  const workspaceScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isClearingWorkflowRef.current) return;
    if (urlWorkflowId && token && urlWorkflowId !== activeWorkflowId) {
      handleSelectWorkflow(urlWorkflowId);
    }
  }, [urlWorkflowId, token, activeWorkflowId, handleSelectWorkflow]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; size: string; content?: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv")
    ) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        setAttachedDoc({ name: file.name, size: fileSize, content: text });
      };
      reader.readAsText(file);
    } else {
      setAttachedDoc({ name: file.name, size: fileSize });
    }
    e.target.value = "";
  };

  const handleNewResearch = useCallback(() => {
    isClearingWorkflowRef.current = true;
    setIsStopped(false);
    setActiveTab("answer");
    setIsStepsExpanded(false);
    setHighlightedDomain(null);
    setAttachedDoc(null);
    contextNewResearch();

    // Clean URL query parameters in Next.js router
    try {
      router.replace("/", { scroll: false });
    } catch {}

    // Immediate instant scroll to top across window and scrollable containers
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    if (workspaceScrollRef.current) {
      workspaceScrollRef.current.scrollTop = 0;
    }
    if (leftColumnScrollRef.current) {
      leftColumnScrollRef.current.scrollTop = 0;
    }

    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      if (workspaceScrollRef.current) {
        workspaceScrollRef.current.scrollTop = 0;
      }
      inputRef.current?.focus({ preventScroll: true });
      setTimeout(() => {
        isClearingWorkflowRef.current = false;
      }, 250);
    }, 50);
  }, [contextNewResearch, router]);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPositionStyle, setDropdownPositionStyle] = useState<React.CSSProperties>({});
  const reportRef = useRef<HTMLDivElement | null>(null);
  const leftColumnScrollRef = useRef<HTMLDivElement | null>(null);
  const followUpContainerRef = useRef<HTMLDivElement | null>(null);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);
  const modelButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateModelDropdownPosition = useCallback(() => {
    if (!modelButtonRef.current) return;
    const rect = modelButtonRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip upwards if insufficient space below or to prevent carving into lower content
    const openUpwards = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    const rightOffset = window.innerWidth - rect.right;
    const dropdownWidth = 320;
    const isOffscreenLeft = rect.right - dropdownWidth < 16;

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 99999,
      width: `${dropdownWidth}px`,
      maxWidth: "calc(100vw - 32px)",
      maxHeight: openUpwards
        ? `min(340px, ${Math.max(160, spaceAbove - 24)}px)`
        : `min(340px, ${Math.max(160, spaceBelow - 24)}px)`,
    };

    if (openUpwards) {
      style.bottom = `${window.innerHeight - rect.top + 8}px`;
      style.top = "auto";
    } else {
      style.top = `${rect.bottom + 8}px`;
      style.bottom = "auto";
    }

    if (isOffscreenLeft) {
      style.left = "16px";
      style.right = "auto";
    } else {
      style.right = `${Math.max(16, rightOffset)}px`;
      style.left = "auto";
    }

    setDropdownPositionStyle(style);
  }, []);

  useEffect(() => {
    if (isModelDropdownOpen) {
      updateModelDropdownPosition();
      const handleResizeOrScroll = () => {
        updateModelDropdownPosition();
      };
      window.addEventListener("resize", handleResizeOrScroll);
      window.addEventListener("scroll", handleResizeOrScroll, true);
      return () => {
        window.removeEventListener("resize", handleResizeOrScroll);
        window.removeEventListener("scroll", handleResizeOrScroll, true);
      };
    }
  }, [isModelDropdownOpen, updateModelDropdownPosition]);

  const scrollToActiveFollowUp = useCallback(() => {
    requestAnimationFrame(() => {
      if (followUpContainerRef.current) {
        followUpContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (leftColumnScrollRef.current) {
        leftColumnScrollRef.current.scrollTo({
          top: leftColumnScrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  }, []);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [recentRuns, setRecentRuns] = useState<WorkflowListItem[]>([]);

  // Saved Reports State & Persistence
  const [savedReports, setSavedReports] = useState<
    { workflow_id: string; task: string; saved_at: string; sources_count?: number }[]
  >([]);
  const [isSavedReportsModalOpen, setIsSavedReportsModalOpen] = useState(false);

  useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      } else if (event.key === "Escape") {
        setIsCommandPaletteOpen(false);
      } else if (event.key === "/" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName || "")) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleCommandShortcut);
    return () => document.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  // User-scoped localStorage key for bookmarked/saved reports
  const userSavedReportsKey = useMemo(() => {
    if (user?.id) return `aegisflow_saved_reports_${user.id}`;
    if (user?.email) return `aegisflow_saved_reports_${encodeURIComponent(user.email)}`;
    return "aegisflow_saved_reports_guest";
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(userSavedReportsKey);
      if (raw) {
        setSavedReports(JSON.parse(raw));
      } else {
        // Migration: If user 69 has legacy un-scoped reports, migrate them
        if (user?.id === 69 || user?.email === "apps.ash.sites@gmail.com") {
          const legacy = localStorage.getItem("triad_flow_saved_reports");
          if (legacy) {
            setSavedReports(JSON.parse(legacy));
            localStorage.setItem(userSavedReportsKey, legacy);
            return;
          }
        }
        setSavedReports([]);
      }
    } catch (e) {
      console.warn("Could not load saved reports from localStorage:", e);
      setSavedReports([]);
    }
  }, [userSavedReportsKey, user?.id, user?.email]);

  const toggleSaveReport = (wfId: string, taskTitle: string, sourcesCount = 0) => {
    if (!wfId) return;
    setSavedReports((prev) => {
      const exists = prev.some((r) => r.workflow_id === wfId);
      let updated;
      if (exists) {
        updated = prev.filter((r) => r.workflow_id !== wfId);
        info("Report removed from Saved Reports.", "Saved Reports");
      } else {
        updated = [
          {
            workflow_id: wfId,
            task: taskTitle || "Research Report",
            saved_at: new Date().toISOString(),
            sources_count: sourcesCount,
          },
          ...prev,
        ];
        success("Report bookmarked in Saved Reports!", "Saved Reports");
      }
      try {
        localStorage.setItem(userSavedReportsKey, JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  const removeSavedReport = (wfId: string) => {
    setSavedReports((prev) => {
      const updated = prev.filter((r) => r.workflow_id !== wfId);
      try {
        localStorage.setItem(userSavedReportsKey, JSON.stringify(updated));
      } catch { }
      return updated;
    });
    info("Report removed from Saved Reports.", "Saved Reports");
  };

  const isCurrentReportSaved = Boolean(
    (workflowState?.workflow_id || activeWorkflowId) &&
    savedReports.some(
      (r) => r.workflow_id === (workflowState?.workflow_id || activeWorkflowId)
    )
  );

  // Clean, unified curated research inquiries state
  const [selectedCategory, setSelectedCategory] = useState<CuratedCategory>("All");
  const [showAllIdeas, setShowAllIdeas] = useState(false);

  const curatedInquiries = useMemo(() => {
    const filtered = selectedCategory === "All"
      ? MASTER_CURATED_INQUIRIES
      : MASTER_CURATED_INQUIRIES.filter((i) => i.category === selectedCategory);
    return showAllIdeas ? filtered : filtered.slice(0, 4);
  }, [selectedCategory, showAllIdeas]);

  // Rotate example questions gently so the prompt stays easy to read.
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSuggestionIdx((prev) => (prev + 1) % ROTATING_SEARCH_SUGGESTIONS.length);
    }, 5600);
    return () => clearInterval(timer);
  }, []);

  // Speech-to-Text Integration with Base Text Capture
  const speechBaseTextRef = useRef<string>("");

  const { isListening, toggleListening, isSupported: isSpeechSupported } = useSpeechToText({
    onTranscript: (spokenText) => {
      const base = speechBaseTextRef.current;
      const combined = base ? `${base.trim()} ${spokenText}` : spokenText;
      if (workflowState?.final_result) {
        setFollowUpQuery(combined);
      } else {
        setGoal(combined);
      }
    },
    onError: (err) => {
      error(err, "Voice Input");
    },
  });

  const handleToggleMic = () => {
    if (!isListening) {
      speechBaseTextRef.current = workflowState?.final_result ? followUpQuery : goal;
    }
    toggleListening();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideDropdown = modelDropdownRef.current && modelDropdownRef.current.contains(target);
      const isInsideButton = modelButtonRef.current && modelButtonRef.current.contains(target);
      if (!isInsideDropdown && !isInsideButton) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth safeguard
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/");
      } else if (isAdmin) {
        router.replace("/admin");
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadedWorkflowIdRef = useRef<string | null>(null);

  // When opening any research (e.g. from history), ensure the view starts from the starting report
  useEffect(() => {
    if (workflowState?.workflow_id && workflowState.workflow_id !== loadedWorkflowIdRef.current) {
      loadedWorkflowIdRef.current = workflowState.workflow_id;
      const timer = setTimeout(() => {
        if (leftColumnScrollRef.current) {
          leftColumnScrollRef.current.scrollTop = 0;
        }
        if (reportRef.current) {
          reportRef.current.scrollIntoView({ behavior: "instant", block: "start" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [workflowState?.workflow_id]);

  const prevFinalResultRef = useRef<string | null>(null);

  // Auto-scroll down to report as soon as synthesis completes in a live research session
  useEffect(() => {
    if (workflowState?.final_result && !prevFinalResultRef.current && isRunning) {
      prevFinalResultRef.current = workflowState.final_result;
      const timer = setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(timer);
    }
    prevFinalResultRef.current = workflowState?.final_result || null;
  }, [workflowState?.final_result, isRunning]);

  // Auto-scroll down to follow-up inquiry ONLY when follow-up research is actively running
  useEffect(() => {
    if (isFollowUpRunning) {
      const t1 = setTimeout(scrollToActiveFollowUp, 60);
      const t2 = setTimeout(scrollToActiveFollowUp, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isFollowUpRunning, scrollToActiveFollowUp]);

  const executeResearchWithAttachment = (promptOverride?: string) => {
    let p = (promptOverride || goal).trim();
    if (!p) return;
    if (attachedDoc) {
      if (attachedDoc.content) {
        p = `${p}\n\n[Attached Reference Document: ${attachedDoc.name}]\n${attachedDoc.content.slice(0, 3000)}`;
      } else {
        p = `${p} (Referencing attached document: ${attachedDoc.name})`;
      }
      setAttachedDoc(null);
    }
    handleRun(p);
  };

  // Keyboard shortcut (Enter to submit without shift, or Ctrl/Cmd+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isRunning && goal.trim() && token) {
        executeResearchWithAttachment();
      }
    }
  };

  // Unique domains searched across sources & activities
  const searchedDomains = React.useMemo(() => {
    const domainSet = new Set<string>();
    if (workflowState?.sources) {
      workflowState.sources.forEach((s) => {
        if (s.domain) domainSet.add(s.domain);
      });
    }
    activities.forEach((act) => {
      if (act.domains) {
        act.domains.forEach((d) => domainSet.add(d));
      }
    });
    return Array.from(domainSet);
  }, [workflowState?.sources, activities]);

  const selectedModelObj =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  // Dynamically derive related prompts: prefer latest follow-up's suggested questions if available
  const relatedPrompts = React.useMemo(() => {
    if (followUps && followUps.length > 0) {
      for (let i = followUps.length - 1; i >= 0; i--) {
        const item = followUps[i];
        if (item.status === "COMPLETED" && item.suggested_questions && item.suggested_questions.length > 0) {
          return item.suggested_questions;
        }
      }
    }
    return workflowState?.final_result ? getDynamicRelatedPrompts(workflowState.task) : [];
  }, [followUps, workflowState?.final_result, workflowState?.task]);

  const [isStopped, setIsStopped] = useState(false);
  const [activeTab, setActiveTab] = useState<ResearchTabType>("answer");
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [highlightedDomain, setHighlightedDomain] = useState<string | null>(null);

  const handleUserStop = useCallback(() => {
    setIsStopped(true);
    handleStop();
  }, [handleStop]);

  const handleResetToNewResearch = useCallback(() => {
    setIsStopped(false);
    setActiveTab("answer");
    setIsStepsExpanded(false);
    setHighlightedDomain(null);
    handleNewResearch();
  }, [handleNewResearch]);

  useEffect(() => {
    if (isRunning) {
      setIsStopped(false);
      setActiveTab("answer");
      setIsStepsExpanded(false);
    }
  }, [isRunning]);

  useEffect(() => {
    if (workflowState?.final_result) {
      setIsStopped(false);
    }
  }, [workflowState?.final_result]);

  const viewModel = useMemo(() => {
    return buildResearchViewModel({
      task: workflowState?.task || goal,
      currentStage,
      workflowState,
      activities,
      searchedDomains,
      activeSearchQuery,
      activePlatform,
      elapsedSeconds,
      selectedModelName: selectedModelObj.name,
      researchDepth,
      isRunning,
      isStopped,
      errorMessage: errorBanner,
    });
  }, [
    workflowState,
    goal,
    currentStage,
    activities,
    searchedDomains,
    activeSearchQuery,
    activePlatform,
    elapsedSeconds,
    selectedModelObj.name,
    researchDepth,
    isRunning,
    isStopped,
    errorBanner,
  ]);

  const isResearchActive =
    !isClearingWorkflowRef.current &&
    (isRunning ||
      Boolean(workflowState?.final_result) ||
      Boolean(workflowState?.workflow_id) ||
      Boolean(activeWorkflowId) ||
      Boolean(urlWorkflowId) ||
      isStopped);

  const hasSavedToken = typeof window !== "undefined" && Boolean(localStorage.getItem("pec_token"));
  if (authLoading && !hasSavedToken && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <BrandMark className="h-12 w-12 animate-pulse mb-4" />
        <div className="h-4 w-4 border-2 border-[#6259b5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{
        "--sidebar-width": "220px",
        "--sidebar-width-icon": "64px",
      } as React.CSSProperties}
      className="workspace-shell relative min-h-screen text-[#1b2235] dark:text-[#ffffff] selection:bg-[#6259b5] selection:text-white transition-colors duration-200 overflow-hidden"
    >
      {isCommandPaletteOpen && (
        <div className="command-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCommandPaletteOpen(false); }}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
            <div className="command-search-row">
              <Search aria-hidden="true" />
              <input
                autoFocus
                value={commandSearch}
                onChange={(event) => setCommandSearch(event.target.value)}
                placeholder="Search actions and pages..."
                aria-label="Search commands"
              />
              <kbd>ESC</kbd>
            </div>
            <div className="command-list" role="listbox" aria-labelledby="command-palette-title">
              <p id="command-palette-title" className="command-group-label">Workspace</p>
              {"new research".includes(commandSearch.toLowerCase()) && <button role="option" aria-selected="false" onClick={() => { setIsCommandPaletteOpen(false); setCommandSearch(""); handleNewResearch(); }}><Sparkles /><span><strong>Start new research</strong><small>Clear the workspace and ask a new question</small></span><kbd>↵</kbd></button>}
              {"research history history".includes(commandSearch.toLowerCase()) && <button role="option" aria-selected="false" onClick={() => { setIsCommandPaletteOpen(false); router.push("/history"); }}><Clock /><span><strong>Research history</strong><small>Browse all previous research runs</small></span><kbd>↵</kbd></button>}
              {"saved reports".includes(commandSearch.toLowerCase()) && <button role="option" aria-selected="false" onClick={() => { setIsCommandPaletteOpen(false); setIsSavedReportsModalOpen(true); }}><Bookmark /><span><strong>Saved reports</strong><small>Open your bookmarked reports</small></span><kbd>↵</kbd></button>}
              {"toggle theme dark light".includes(commandSearch.toLowerCase()) && <button role="option" aria-selected="false" onClick={() => { setIsCommandPaletteOpen(false); toggleTheme(); }}><Moon /><span><strong>Toggle appearance</strong><small>Switch between light and dark themes</small></span><kbd>↵</kbd></button>}
              {"focus ask question composer".includes(commandSearch.toLowerCase()) && <button role="option" aria-selected="false" onClick={() => { setIsCommandPaletteOpen(false); inputRef.current?.focus(); }}><ArrowRight /><span><strong>Focus research composer</strong><small>Jump to the question field</small></span><kbd>/</kbd></button>}
              {commandSearch && !["new research", "research history history", "saved reports", "toggle theme dark light", "focus ask question composer"].some((command) => command.includes(commandSearch.toLowerCase())) && <p className="command-empty">No matching actions</p>}
            </div>
            <div className="command-footer"><span>Navigate your workspace</span><span><kbd>Ctrl</kbd> <kbd>K</kbd> to open</span></div>
          </section>
        </div>
      )}

      {/* 1. Left Collapsible Sidebar */}
      <ResearchSidebar
        onNewResearch={handleResetToNewResearch}
        onSelectWorkflow={handleSelectWorkflow}
        activeWorkflowId={activeWorkflowId}
        onOpenSavedReports={() => setIsSavedReportsModalOpen(true)}
        savedReportsCount={savedReports.length}
        liveWorkflowItem={liveSidebarItem}
      />

      {/* 2. Main Central Workspace */}
      <div
        ref={workspaceScrollRef}
        className={`flex-1 flex flex-col min-w-0 h-screen max-h-screen ${isResearchActive ? "overflow-hidden overscroll-none" : "overflow-y-auto no-scrollbar"}`}
      >
        {!isResearchActive ? (
          <>
            <MobileWorkspaceHomeHeader
              onNewResearch={handleResetToNewResearch}
              onOpenSavedReports={() => setIsSavedReportsModalOpen(true)}
              savedReportsCount={savedReports.length}
            />
            <div className="workspace-theme-control hidden md:flex" aria-label="Appearance settings">
              <ThemeToggle className="h-10 w-10 rounded-xl border-0 bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] shadow-none transition-colors" />
            </div>
          </>
        ) : (
          <MobileResearchActiveHeader
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            sourcesCount={viewModel.sources.length}
            onBack={handleResetToNewResearch}
            isRunning={isRunning}
            onStop={handleUserStop}
            isSaved={isCurrentReportSaved}
            onToggleSave={() => {
              const targetId = workflowState?.workflow_id || activeWorkflowId;
              if (targetId) {
                toggleSaveReport(targetId, workflowState?.task || goal, viewModel.sources.length);
              }
            }}
            onShare={() => {
              if (typeof window !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                success("Report URL copied to clipboard!", "Share");
              }
            }}
          />
        )}
        {/* Main Content Area */}
        <main
          className={`workspace-main-content flex-1 w-full px-0 pt-0 ${isResearchActive
            ? "workspace-research-active pb-0 w-full max-w-none flex-1 min-h-0 overflow-hidden flex flex-col"
            : "mx-auto pb-8 sm:pb-10 space-y-6 max-w-5xl"
            }`}
        >
          {/* Error Notification */}
          {errorBanner && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-600 dark:text-red-300 flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{errorBanner}</span>
              </div>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* HOME COMPOSER */}
          {!isResearchActive && (
            <div className="workspace-home-layout w-full flex flex-col pt-0 animate-in fade-in duration-200">
              <div className="workspace-home-focus">
                {/* Hero Section (Only shown when not running) */}
                {!isRunning && (
                  <div className="workspace-home-hero flex flex-col items-center text-center">
                    <BrandMark className="workspace-home-brand-mark hidden sm:block h-10 w-10 shrink-0" />
                    <h1 className="workspace-hero-title">
                      Start with a <span className="text-gradient-brand">question</span>.
                    </h1>
                  </div>
                )}

                {/* Focused composer */}
                <Composer
                  variant="hero"
                  className={`research-composer workspace-composer-hero relative w-full ${isSearchFocused ? "is-focused" : ""
                    }`}
                >
                  {/* Input Area */}
                  <div className="workspace-composer-input-area relative">
                    {attachedDoc && (
                      <div className="flex items-center gap-2 px-2.5 py-1 mb-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text)] w-fit animate-in fade-in">
                        <FileText className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                        <span className="font-medium truncate max-w-[220px]">{attachedDoc.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">({attachedDoc.size})</span>
                        <button
                          type="button"
                          onClick={() => setAttachedDoc(null)}
                          className="p-0.5 rounded-full hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                          title="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <div className="relative flex items-start">
                      <textarea
                        ref={inputRef}
                        rows={2}
                        value={goal}
                        disabled={isAdmin}
                        onChange={(e) => {
                          setGoal(e.target.value);
                          e.currentTarget.style.height = "auto";
                          e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 280)}px`;
                        }}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder={ROTATING_SEARCH_SUGGESTIONS[suggestionIdx]}
                        className="w-full bg-transparent resize-none border-0 border-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-none text-base text-[var(--text)] placeholder-[var(--text-muted)] leading-relaxed font-sans pr-8"
                      />
                      {/* Clear Button */}
                      {goal.length > 0 && !isRunning && (
                        <button
                          type="button"
                          onClick={() => {
                            setGoal("");
                            inputRef.current?.focus();
                          }}
                          className="absolute right-0 top-0 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                          title="Clear search query"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {isListening && (
                      <div className="flex items-center gap-2.5 mt-2.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-600 dark:text-red-400 w-fit animate-in fade-in">
                        <div className="flex items-center gap-1 h-5">
                          <span className="sound-bar-1 w-1 bg-red-500 rounded-full" />
                          <span className="sound-bar-2 w-1 bg-red-500 rounded-full" />
                          <span className="sound-bar-3 w-1 bg-red-500 rounded-full" />
                          <span className="sound-bar-4 w-1 bg-red-500 rounded-full" />
                        </div>
                        <span>Listening... Speak into your microphone</span>
                      </div>
                    )}
                  </div>

                  {/* Integrated Composer Controls Bar */}
                  <div className="composer-controls-row">
                    {/* Research Depth Segmented Control: Row 1 on mobile, integrated into left controls on desktop */}
                    <div className="composer-depth-wrapper">
                      <SegmentedControl label="Research depth" className="composer-mode-control">
                        <button
                          type="button"
                          onClick={() => {
                            setResearchDepth("quick");
                            setActiveFocusMode("quick");
                          }}
                          aria-pressed={researchDepth === "quick"}
                          className={researchDepth === "quick" ? "is-active" : "is-inactive"}
                          title="Quick overview · ~15s · 1 agent"
                        >
                          Quick
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResearchDepth("standard");
                            setActiveFocusMode("product");
                          }}
                          aria-pressed={researchDepth === "standard"}
                          className={researchDepth === "standard" ? "is-active" : "is-inactive"}
                          title="Standard synthesis · ~45s · 3 agents"
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResearchDepth("deep");
                            setActiveFocusMode("deep");
                          }}
                          aria-pressed={researchDepth === "deep"}
                          className={researchDepth === "deep" ? "is-active" : "is-inactive"}
                          title="Deep multi-agent autonomous loop · ~2m · 5 agents"
                        >
                          {researchDepth === "deep" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />
                          )}
                          <span>Deep Research</span>
                        </button>
                      </SegmentedControl>
                    </div>

                    {/* Actions Toolbar: Row 2 on mobile, flattened via display: contents on desktop */}
                    <div className="composer-actions-bar">
                      {/* Left Actions: Attach File */}
                      <div className="composer-controls-left">
                        {/* Hidden file input for document attachment */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".pdf,.txt,.md,.json,.csv,.doc,.docx"
                          className="hidden"
                          aria-hidden="true"
                        />

                        {/* Attach button */}
                        <WorkspaceIconButton
                          label="Attach document"
                          type="button"
                          title="Attach document or dataset (.pdf, .txt, .md, .csv)"
                          className="composer-attach-button cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Plus className="h-5 w-5" strokeWidth={1.5} />
                        </WorkspaceIconButton>
                      </div>

                      {/* Right Controls */}
                      <div className="composer-controls-right flex items-center gap-2">
                        {/* Model Config Dropdown */}
                        <div className="relative inline-block text-left">
                          <button
                            ref={modelButtonRef}
                            type="button"
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className={`composer-model-button inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${isModelDropdownOpen ? "is-open" : ""
                              }`}
                            title={`Select reasoning model (currently: ${selectedModelObj.name})`}
                            aria-expanded={isModelDropdownOpen}
                            aria-haspopup="listbox"
                          >
                            <Cpu className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" strokeWidth={1.5} />
                            <span className="truncate max-w-[95px] xs:max-w-[125px] sm:max-w-none">{selectedModelObj.name}</span>
                            <ChevronDown className={`h-3 w-3 opacity-60 shrink-0 transition-transform duration-200 ${isModelDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                        {isModelDropdownOpen && mounted && typeof document !== "undefined" && createPortal(
                          <div
                            ref={modelDropdownRef}
                            role="listbox"
                            style={dropdownPositionStyle}
                            className="composer-model-dropdown overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/98 backdrop-blur-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <div className="px-2.5 py-2 border-b border-[var(--border)]">
                              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                Choose Reasoning Model
                              </p>
                            </div>
                            <div className="py-1 space-y-1">
                              {AVAILABLE_MODELS.map((model) => {
                                const isSelected = model.id === selectedModel;
                                return (
                                  <button
                                    key={model.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                      setSelectedModel(model.id);
                                      setIsModelDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start justify-between gap-2 transition-colors cursor-pointer ${isSelected
                                      ? "bg-[var(--surface-hover)] text-[var(--accent)] font-semibold"
                                      : "hover:bg-[var(--surface-hover)] text-[var(--text)]"
                                      }`}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold">{model.name}</span>
                                        <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--surface)] font-mono text-[var(--accent)]">
                                          {model.provider}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                                        {model.desc}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>

                      {/* Speech to Text Mic */}
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        disabled={!isSpeechSupported}
                        aria-label="Voice input"
                        className={`composer-mic-button ${isListening ? "is-listening" : ""}`}
                        title={
                          isListening
                            ? "Listening... Click to stop"
                            : isSpeechSupported
                              ? "Voice Input (Speech-to-Text)"
                              : "Voice input not supported in this browser"
                        }
                      >
                        <Mic className="h-4 w-4" strokeWidth={1.5} />
                      </button>

                      {/* Primary Send Button */}
                      <button
                        type="button"
                        onClick={() => executeResearchWithAttachment()}
                        disabled={!goal.trim() || isAdmin}
                        aria-label="Start Research"
                        title="Start research (⌘ + Enter)"
                        className={`composer-send-button ${goal.trim() && !isAdmin
                          ? "is-ready"
                          : "is-disabled"
                          }`}
                      >
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              </Composer>
              </div>

              {/* SUGGESTED INQUIRIES: Clean, single-tier, modern 4-card grid */}
              {!isRunning && (
                <div className="workspace-suggestion-section space-y-3">
                  {/* Category Filter & Section Header */}
                  <div className="workspace-suggestion-toolbar">
                    <div className="workspace-suggestion-title">
                      <span className="workspace-ideas-mark" aria-hidden="true">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="workspace-suggestion-heading">
                        <h2>Ideas to explore</h2>
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="workspace-suggestion-chips flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {CURATED_CATEGORIES.map((cat) => (
                        <WorkspaceChip
                          key={cat}
                          selected={selectedCategory === cat}
                          onClick={() => { setSelectedCategory(cat); setShowAllIdeas(false); }}
                          aria-label={`Filter ideas: ${cat}`}
                        >
                          {cat}
                        </WorkspaceChip>
                      ))}
                    </div>
                  </div>

                  {/* 4-Card Unified Responsive Grid */}
                  <div key={selectedCategory} className="workspace-suggestion-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(showAllIdeas ? curatedInquiries : curatedInquiries.slice(0, 4)).map((inquiry) => (
                      <SuggestionCard
                        key={inquiry.id}
                        category={inquiry.category}
                        title={inquiry.title}
                        onClick={(event) => {
                          setGoal(inquiry.query);
                          if (event.metaKey || event.ctrlKey) handleRun(inquiry.query);
                          else inputRef.current?.focus();
                        }}
                      />
                    ))}
                  </div>
                  {!showAllIdeas && (selectedCategory === "All" ? MASTER_CURATED_INQUIRIES.length : MASTER_CURATED_INQUIRIES.filter((item) => item.category === selectedCategory).length) > 4 && (
                    <button type="button" className="workspace-show-more" onClick={() => setShowAllIdeas(true)}>
                      Show more ideas
                    </button>
                  )}
                </div>
              )}
            </div>
          )}



          {/* RESEARCH RUNNING & REPORT VIEW */}
          {isResearchActive && (
            isLoadingWorkflow ? (
              <div className="w-full flex-1 min-h-[400px] flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
                <div className="h-10 w-10 relative mb-4">
                  <BrandMark className="h-10 w-10 animate-pulse" />
                </div>
                <div className="flex items-center gap-2.5 text-xs font-mono text-[var(--text-muted)]">
                  <div className="h-3.5 w-3.5 border-2 border-[#6259b5] border-t-transparent rounded-full animate-spin" />
                  <span>Loading research report…</span>
                </div>
              </div>
            ) : (
            <div className="w-full flex-1 min-h-0 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
              <div className="w-full flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                {/* Main 2-column Content Area: Report on Left, Sources on Far Right */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch justify-between gap-4 xl:gap-6 w-full pl-4 sm:pl-6 lg:pl-8 pr-2 sm:pr-3 lg:pr-3 pt-3 pb-2 overflow-hidden">
                  {/* Left Column: Full-space Report & Research Flow - ONLY this column scrolls vertically */}
                  <div
                    ref={leftColumnScrollRef}
                    className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar pr-1 sm:pr-2 space-y-4"
                  >
                    {activeTab === "sources" ? (
                      <div className="py-2 animate-in fade-in duration-150">
                        <SourcesTabContent sources={viewModel.sources} />
                      </div>
                    ) : (
                      <div className="space-y-4 pb-4">
                        {/* 1. Rounded Question Message Card with Stop research button */}
                        <QuestionCard
                          question={workflowState?.task || goal}
                          onEdit={(newQ) => {
                            setGoal(newQ);
                            executeResearchWithAttachment(newQ);
                          }}
                          onRerun={(q) => executeResearchWithAttachment(q)}
                          isReadOnly={isRunning}
                          isRunning={isRunning}
                          onStop={handleUserStop}
                        />

                        {/* 2. Progress Line: compact single row */}
                        <ResearchProgressRow
                          phase={viewModel.phase}
                          statusText={viewModel.statusText}
                          elapsedSeconds={viewModel.elapsedSeconds}
                          sourcesCount={viewModel.sources.length}
                          isExpanded={isStepsExpanded}
                          onToggleExpanded={() => setIsStepsExpanded(!isStepsExpanded)}
                          hasSteps={viewModel.steps.length > 0}
                        />

                        {/* "Show steps" expanded checklist view with smooth height transition */}
                        <div
                          className={`grid transition-[grid-template-rows,opacity,margin] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            isStepsExpanded && viewModel.steps.length > 0
                              ? "grid-rows-[1fr] opacity-100 mt-2"
                              : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                          }`}
                        >
                          <div className="overflow-hidden">
                            {viewModel.steps.length > 0 && (
                              <StepsChecklist
                                steps={viewModel.steps}
                              />
                            )}
                          </div>
                        </div>

                        {/* Stopped State Notification */}
                        {isStopped && (
                          <StoppedState
                            onEditQuestion={() => {
                              inputRef.current?.focus();
                            }}
                            onRerun={() => {
                              setIsStopped(false);
                              executeResearchWithAttachment(workflowState?.task || goal);
                            }}
                          />
                        )}

                        {/* 3. Subtle answer skeleton before answer is synthesized */}
                        {!workflowState?.final_result && !isStopped && (
                          <AnswerSkeleton />
                        )}

                        {/* Completed Answer Markdown Report */}
                        {workflowState?.final_result && (
                          <div
                            ref={reportRef}
                            id="research-report-section"
                            className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 md:p-8 shadow-xs space-y-6 w-full animate-in fade-in duration-200"
                          >
                            <AnswerBody
                              markdown={workflowState.final_result}
                              sources={viewModel.sources}
                              highlightedDomain={highlightedDomain}
                              onHoverDomain={setHighlightedDomain}
                            />
                          </div>
                        )}

                        {/* Threaded Follow-Up Conversations */}
                        {followUps.length > 0 && (
                          <div ref={followUpContainerRef} className="scroll-mt-4">
                            <ConversationThread
                              key={workflowState?.workflow_id || "conversation-thread"}
                              turns={followUps}
                              onSelectQuestion={(q) => {
                                handleFollowUpSubmit(q);
                                setTimeout(scrollToActiveFollowUp, 50);
                                setTimeout(scrollToActiveFollowUp, 200);
                              }}
                              disabled={isFollowUpRunning}
                            />
                          </div>
                        )}

                        {/* Related Questions (rows with ↳ icon) */}
                        {relatedPrompts.length > 0 && !isRunning && (
                          <RelatedQuestions
                            questions={relatedPrompts}
                            onSelectQuestion={(q) => {
                              handleFollowUpSubmit(q);
                              setTimeout(scrollToActiveFollowUp, 50);
                              setTimeout(scrollToActiveFollowUp, 200);
                            }}
                            disabled={isFollowUpRunning}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sources Panel on right: pinned to the far right, sticky in place with independent scrolling */}
                  <aside className="hidden lg:flex flex-col w-[320px] xl:w-[360px] shrink-0 h-full overflow-hidden self-stretch">
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar pr-1 pb-2">
                      <SourcesPanel
                        sources={viewModel.sources}
                        isRunning={isRunning}
                        highlightedDomain={highlightedDomain}
                        onHoverDomain={setHighlightedDomain}
                      />
                    </div>

                    {/* Report Action buttons placed directly below Sources and above follow-up bar */}
                    {workflowState?.final_result && (
                      <ReportActionsPanel
                        onCopy={handleCopyReport}
                        onShare={() => {
                          if (typeof window !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText(window.location.href);
                            success("Report URL copied to clipboard!", "Share");
                          }
                        }}
                        isSaved={isCurrentReportSaved}
                        onToggleSave={() => {
                          const targetId = workflowState?.workflow_id || activeWorkflowId;
                          if (targetId) {
                            toggleSaveReport(targetId, workflowState?.task || goal, viewModel.sources.length);
                          }
                        }}
                        onExportPDF={() => handleDownloadReport("pdf")}
                      />
                    )}
                  </aside>
                </div>

                {/* 4. Sticky Follow-up Bar: Full-width Horizontal Rectangular Bar with complete text visibility */}
                <div className="shrink-0 z-20 w-full pl-3 sm:pl-6 lg:pl-8 pr-3 sm:pr-3 lg:pr-3 pt-2 pb-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-[var(--bg)]/95 backdrop-blur-xs border-none">
                  <div className="w-full followup-composer-container">
                    <div className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-md hover:border-[var(--border-strong)] transition-all">
                      <MessageSquare className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[var(--text-muted)] shrink-0" strokeWidth={1.5} />
                      <input
                        type="text"
                        value={followUpQuery}
                        disabled={isFollowUpRunning}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && followUpQuery.trim() && !isRunning && !isFollowUpRunning) {
                            e.preventDefault();
                            handleFollowUpSubmit();
                            setTimeout(scrollToActiveFollowUp, 50);
                          }
                        }}
                        placeholder={
                          isFollowUpRunning
                            ? "Synthesizing follow-up exploration..."
                            : isRunning
                              ? "Research in progress..."
                              : "Ask a follow-up in this research thread…"
                        }
                        className="workspace-followup-input flex-1 min-w-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-none focus:shadow-none"
                        style={{ outline: "none", boxShadow: "none", border: "none" }}
                      />

                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {/* Mic for follow-up */}
                        <button
                          type="button"
                          onClick={handleToggleMic}
                          disabled={isRunning || isFollowUpRunning}
                          className={`p-1.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${isListening ? "text-red-500 bg-red-50 dark:bg-red-950/40" : ""
                            }`}
                          title="Voice input (Speech-to-Text)"
                          aria-label="Voice input"
                        >
                          <Mic className="h-4 w-4" strokeWidth={1.5} />
                        </button>

                        {/* Submit button (No stop button in follow-up bar) */}
                        <button
                          type="button"
                          disabled={!followUpQuery.trim() || isRunning || isFollowUpRunning}
                          onClick={() => {
                            handleFollowUpSubmit();
                            setTimeout(scrollToActiveFollowUp, 50);
                          }}
                          aria-label="Submit follow-up"
                          title="Submit follow-up (Enter)"
                          className={`h-9 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0 ${followUpQuery.trim() && !isRunning && !isFollowUpRunning
                            ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 shadow-xs cursor-pointer"
                            : "bg-[var(--surface-hover)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                            }`}
                        >
                          <span className="hidden sm:inline">Submit</span>
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )
          )}
        </main>
      </div>

      {/* 3. Saved Reports Modal Dialog */}
      {isSavedReportsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsSavedReportsModalOpen(false)}
        >
          <div
            className="saved-reports-dialog w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Saved Reports
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  {savedReports.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedReportsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {savedReports.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <Bookmark className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    No saved reports yet
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    When you run a research query, use the Save report action above the report to keep it here for quick access.
                  </p>
                </div>
              ) : (
                savedReports.map((report) => (
                  <div
                    key={report.workflow_id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-xs transition-all flex items-start justify-between gap-3 group"
                  >
                    <div
                      onClick={() => {
                        handleSelectWorkflow(report.workflow_id);
                        setIsSavedReportsModalOpen(false);
                      }}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {report.task}
                      </h4>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(report.saved_at).toLocaleDateString()}</span>
                        {typeof report.sources_count === "number" && report.sources_count > 0 && (
                          <>
                            <span>•</span>
                            <Globe className="h-3 w-3" />
                            <span>{report.sources_count} sources</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedReport(report.workflow_id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                      title="Remove from saved"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
