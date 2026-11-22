export interface DiscoverTopicItem {
  id: string;
  category: "Tech" | "AI & Science" | "Business" | "Education" | "Health";
  title: string;
  query: string;
  isTrending?: boolean;
}

export interface RecommendedInquiryItem {
  id: string;
  category: "Tech" | "AI & Science" | "Business" | "Education" | "Health";
  badge: string;
  title: string;
  desc: string;
  query: string;
  metadata: string;
  tag: string;
  accent: "blue" | "emerald" | "amber" | "rose" | "indigo";
}

export const RECOMMENDED_INQUIRIES: RecommendedInquiryItem[] = [
  // Tech
  {
    id: "rec-tech-1",
    category: "Tech",
    badge: "DB-BENCH • TEST",
    title: "Compare PostgreSQL & ScyllaDB for time-series IoT",
    desc: "Partitioning, write throughput, and p99 query latency benchmarks across distributed topologies.",
    query: "Compare PostgreSQL vs. ScyllaDB for time-series IoT workloads. Validates read/write IOPS, scaling limits, and ACID guarantees.",
    metadata: "4 data engines • 3 papers",
    tag: "Data Architecture",
    accent: "blue",
  },
  {
    id: "rec-tech-2",
    category: "Tech",
    badge: "CHIP-ARCH • COMP",
    title: "Apple M4 Max vs Intel Core Ultra 9 Architecture",
    desc: "Direct side-by-side IPC, thermal TDP, efficiency curves, and unified memory bandwidth matrix.",
    query: "Compare Apple M4 Max vs. Intel Core Ultra 9 architecture. Direct side-by-side IPC, thermal TDP, and memory bandwidth matrix.",
    metadata: "Silicon benchmarks • TDP maps",
    tag: "Hardware",
    accent: "indigo",
  },
  {
    id: "rec-tech-3",
    category: "Tech",
    badge: "SYS-RESIL • TRACK",
    title: "Cloud Disaster Recovery: Multi-Region vs Standby",
    desc: "Active-active multi-region vs warm standby RTO/RPO trade-offs with cross-datacenter sync.",
    query: "Analyze cloud disaster recovery architectures: Active-active multi-region vs warm standby RTO/RPO trade-offs with cross-datacenter sync.",
    metadata: "SLA matrices • Failure trees",
    tag: "Cloud Infrastructure",
    accent: "amber",
  },

  // AI & Science
  {
    id: "rec-ai-1",
    category: "AI & Science",
    badge: "ENERGY • R&D",
    title: "Solid-State Batteries State in 2026",
    desc: "Identifies >=3 active manufacturers with energy density specs (Wh/kg) and thermal runaway safety.",
    query: "Research current state of Solid-State Batteries in 2026. Identifies >=3 active manufacturers with energy density specs.",
    metadata: "Chemistry specs • 3 manufacturers",
    tag: "Clean Tech",
    accent: "emerald",
  },
  {
    id: "rec-ai-2",
    category: "AI & Science",
    badge: "QUANTUM • BENCH",
    title: "Quantum Computing Commercial Milestones",
    desc: "Cites verified physical qubit counts, topological error rates, and quantum advantage timelines.",
    query: "Evaluate quantum computing commercialization milestones. Cites verified qubit counts and physical error rate benchmarks.",
    metadata: "Qubit telemetry • Error bounds",
    tag: "Quantum Systems",
    accent: "indigo",
  },
  {
    id: "rec-ai-3",
    category: "AI & Science",
    badge: "AGENT-ORCH • SYS",
    title: "Multi-Agent Orchestration in 2026 Enterprise",
    desc: "Evaluates Planner, Executor, Critic state recovery, dynamic re-planning, and parallel pipelines.",
    query: "Analyze the state of multi-agent orchestration frameworks (AutoGen, CrewAI, LangGraph) in 2026 enterprise deployments.",
    metadata: "Autonomous agents • Workflow trees",
    tag: "Agentic AI",
    accent: "blue",
  },

  // Education
  {
    id: "rec-edu-1",
    category: "Education",
    badge: "TECH-INST • AUDIT",
    title: "Best Tech Schools in India (Top IITs, IIITs, BITS)",
    desc: "Comprehensive evaluation of NIRF rankings, faculty citations, research funding, and placement CTCs.",
    query: "Research the best tech schools in India. Compare top IITs, IIITs, and BITS Pilani on NIRF rankings, faculty research output, and median placement CTCs.",
    metadata: "NIRF datasets • Placement tables",
    tag: "Higher Education",
    accent: "emerald",
  },
  {
    id: "rec-edu-2",
    category: "Education",
    badge: "CURRICULUM • AI",
    title: "CS Curriculum Adaptations for Generative AI",
    desc: "Adapting core data structures, prompt systems, and autonomous agent engineering in university degrees.",
    query: "Comparative analysis of university Computer Science curricula adaptations for generative AI and LLM tools across top global institutions.",
    metadata: "12 universities • Syllabus audits",
    tag: "Pedagogy",
    accent: "blue",
  },
  {
    id: "rec-edu-3",
    category: "Education",
    badge: "DEGREE • ROI",
    title: "MS in Computer Science vs Direct Industry Entry",
    desc: "5-year cumulative opportunity cost, visa dynamics, compensation growth, and specialization ROI in 2026.",
    query: "Cost-to-ROI analysis of MS in Computer Science vs direct software engineering industry entry in 2026.",
    metadata: "Financial models • Career graphs",
    tag: "Career Strategy",
    accent: "amber",
  },

  // Business
  {
    id: "rec-biz-1",
    category: "Business",
    badge: "SUPPLY-CHAIN • RISK",
    title: "Geopolitical Semiconductor Supply Chain Risks",
    desc: "Fab concentrations in Taiwan, US, and EU, packaging choke points, and critical trade data.",
    query: "Analyze geopolitical risks of global semiconductor supply chains. Highlights fab concentrations in Taiwan, US, and EU with trade data.",
    metadata: "Trade volumes • Fab maps",
    tag: "Macro Strategy",
    accent: "rose",
  },
  {
    id: "rec-biz-2",
    category: "Business",
    badge: "NUCLEAR-SMR • LCOE",
    title: "Micro-Modular Nuclear Reactors (SMR) Viability",
    desc: "Levelized Cost of Energy (LCOE) financial models, deployment schedules, and safety licensing.",
    query: "Analyze economic viability of micro-modular nuclear reactors. Calculates Levelized Cost of Energy (LCOE) with cited ranges.",
    metadata: "LCOE calculations • CAPEX models",
    tag: "Energy Finance",
    accent: "amber",
  },
  {
    id: "rec-biz-3",
    category: "Business",
    badge: "SAAS-PRICING • NDR",
    title: "Enterprise SaaS: Seat-Based vs Consumption Pricing",
    desc: "Customer retention elasticity, Net Revenue Retention (NRR), and revenue stability in volatile markets.",
    query: "Evaluate seat-based vs consumption-based pricing models for B2B enterprise SaaS with Net Revenue Retention benchmarks.",
    metadata: "Pricing matrices • NDR data",
    tag: "Enterprise SaaS",
    accent: "blue",
  },

  // Health
  {
    id: "rec-health-1",
    category: "Health",
    badge: "CRISPR • CLINICAL",
    title: "CRISPR In-Vivo Therapeutics Delivery Pipelines",
    desc: "Clinical trial milestones for sickle cell, beta-thalassemia, and non-viral lipid nanoparticle delivery.",
    query: "Analyze clinical trial milestones and commercial delivery pipelines for CRISPR gene-editing therapies in 2026.",
    metadata: "Clinical phase data • Delivery vectors",
    tag: "Genomics",
    accent: "rose",
  },
  {
    id: "rec-health-2",
    category: "Health",
    badge: "METABOLIC • GLP1",
    title: "Long-Term Outcomes of GLP-1 Receptor Agonists",
    desc: "Cardiovascular risk reduction, renal protection, and lean mass preservation across clinical trials.",
    query: "Evaluate long-term cardiovascular and metabolic outcomes of GLP-1 receptor agonists based on peer-reviewed multicenter clinical trials.",
    metadata: "Trial meta-analyses • 6 cohorts",
    tag: "Pharmacology",
    accent: "emerald",
  },
  {
    id: "rec-health-3",
    category: "Health",
    badge: "SENOLYTICS • AGING",
    title: "Clinical Validity of Senolytics & Longevity Markers",
    desc: "Epigenetic clocks (Horvath vs GrimAge), cellular senescence clearance, and healthspan endpoints.",
    query: "Evaluate peer-reviewed clinical trials investigating senolytic molecules and NAD+ precursors for healthspan extension.",
    metadata: "Biomarker indices • Cohort studies",
    tag: "Longevity Science",
    accent: "indigo",
  },
];

export const DISCOVER_TOPICS: DiscoverTopicItem[] = [
  // Tech
  {
    id: "dt-1",
    category: "Tech",
    title: "Apple M4 Max vs Intel Ultra 9",
    query: "Compare Apple M4 Max vs. Intel Core Ultra 9 architecture. Direct side-by-side IPC, thermal TDP, and memory bandwidth matrix.",
    isTrending: true,
  },
  {
    id: "dt-2",
    category: "Tech",
    title: "PostgreSQL vs ScyllaDB for IoT",
    query: "Compare PostgreSQL vs. ScyllaDB for time-series IoT workloads. Validates read/write IOPS, scaling limits, and ACID guarantees.",
  },
  {
    id: "dt-3",
    category: "Tech",
    title: "Kubernetes to Nomad Migration",
    query: "Kubernetes to Nomad Migration Guide. Outlines phased cutover, stateful storage mapping, and rollback plan.",
  },
  {
    id: "dt-4",
    category: "Tech",
    title: "Python 3.13 GIL Speedup Audit",
    query: "Fact-check the claim: 'Python 3.13 GIL removal yields 100% multithreaded speedup.' Verify against free-threaded benchmarks.",
    isTrending: true,
  },

  // AI & Science
  {
    id: "dt-5",
    category: "AI & Science",
    title: "Solid-State Batteries in 2026",
    query: "Research current state of Solid-State Batteries in 2026. Identifies >=3 active manufacturers with energy density specs.",
    isTrending: true,
  },
  {
    id: "dt-6",
    category: "AI & Science",
    title: "Quantum Computing Milestones",
    query: "Evaluate quantum computing commercialization milestones. Cites verified qubit counts and physical error rate benchmarks.",
  },
  {
    id: "dt-7",
    category: "AI & Science",
    title: "State of Autonomous AI Agents",
    query: "Analyze the state of multi-agent orchestration frameworks (AutoGen, CrewAI, LangGraph) in 2026 enterprise deployments.",
  },
  {
    id: "dt-8",
    category: "AI & Science",
    title: "CRISPR Therapeutics Progress",
    query: "Analyze clinical trial milestones and commercial delivery pipelines for CRISPR gene-editing therapies in 2026.",
  },

  // Education
  {
    id: "dt-9",
    category: "Education",
    title: "Best Tech Schools in India",
    query: "Research the best tech schools in India. Compare top IITs, IIITs, and BITS Pilani on NIRF rankings, JEE cutoffs, median placement CTC, and research labs.",
    isTrending: true,
  },
  {
    id: "dt-10",
    category: "Education",
    title: "Top AI Graduate Programs",
    query: "Compare top worldwide computer science graduate universities for Artificial Intelligence research output and faculty citation indexes.",
  },
  {
    id: "dt-11",
    category: "Education",
    title: "Online Computer Science Degrees",
    query: "Evaluate top accredited online masters in computer science programs (Georgia Tech OMSCS, UT Austin) on curriculum rigor and ROI.",
  },

  // Business
  {
    id: "dt-12",
    category: "Business",
    title: "Semiconductor Supply Chain Risks",
    query: "Analyze geopolitical risks of global semiconductor supply chains. Highlights fab concentrations in Taiwan, US, and EU with trade data.",
  },
  {
    id: "dt-13",
    category: "Business",
    title: "Venture Capital & Inflation Trends",
    query: "Analyze macroeconomic impact of inflation and interest rates on venture capital funding rounds and tech valuations.",
  },
  {
    id: "dt-14",
    category: "Business",
    title: "EV Charging Infrastructure Standards",
    query: "Evaluate EV charging infrastructure interoperability and standards. Cites CCS vs NACS adoption data and grid load impact.",
  },

  // Health
  {
    id: "dt-15",
    category: "Health",
    title: "Water Boiling at 50°C Debunk",
    query: "Fact-check: Explain why water boils at 50°C under normal atmospheric pressure. Refute claim using thermodynamic phase diagrams.",
  },
  {
    id: "dt-16",
    category: "Health",
    title: "Longevity & Cellular Senescence",
    query: "Evaluate peer-reviewed clinical trials investigating senolytic molecules and NAD+ precursors for healthspan extension.",
  },
];
