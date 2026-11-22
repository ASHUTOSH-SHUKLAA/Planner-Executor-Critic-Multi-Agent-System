"""
Synthesizer Agent: Final Delivery Coordinator.
Combines all validated step deliverables and verified research citations into an exhaustive,
publication-ready long-form technical report with domain-specific architecture,
detailed comparison tables, verified product imagery (for retail goods), and verifiable source links.
"""

import re
from typing import Optional, List, Dict, Any
from rich.console import Console

from src.models.schemas import WorkflowState, WorkflowStatus
from src.llm.client import LLMGateway
from src.agents.domain_classifier import classify_task_domain

console = Console()


def build_synthesizer_system_prompt(domain_info: Dict[str, Any]) -> str:
    """
    Builds a specialized, domain-tailored system prompt for the Synthesizer Agent.
    Guarantees that academic, scientific, comparative, and engineering guides have
    their own authoritative structural architecture and never get contaminated with
    e-commerce purchase blocks or buy links.
    """
    domain = domain_info.get("domain", "GENERAL_RESEARCH")
    display_label = domain_info.get("display_label", domain)

    base = f"""You are an elite Principal Research Analyst and Technical Synthesizer.
Your role is to synthesize all deliverables, empirical findings, and verified external research into a definitive, exhaustive, publication-grade research report.

### GENERAL REPORT REQUIREMENTS:
1. **Long-Form & Deep Coverage**:
   - Produce an extensive, comprehensive report covering the subject in deep detail (typically 2,000+ words).
   - High data density: provide concrete figures, benchmark metrics, specifications, official rankings, or official URLs.
2. **Strict Heading Hierarchy**:
   - Top-level title: `# [Authoritative Document Title]`
   - Major sections: `## [Major Section Title]`
   - Option/contender/entity deep-dives: `### 1. [Entity Name]`, `### 2. [Entity Name]`, etc.
   - Subsections inside deep dives: Bold paragraph headings (e.g. `**Key Specifications:**`, `**Real-World Benchmarks:**`).
3. **Flawless Markdown Tables**:
   - All tables must follow strict GitHub-flavored Markdown with header row and separator: `| Header 1 | Header 2 |` followed by `| :--- | :--- |`.
   - Ensure all rows are properly closed with pipes.
4. **Mandatory Sources & Citations Section**:
   - Conclude the report with `## Sources & Citations`.
   - List verified external sources using clickable markdown links: `[Source Title - Domain](URL)` followed by a brief 1-line note of what was validated.
5. **Never Expose Pipeline Mechanics**:
   - Never say "In Step 1 the executor found...", "The Critic reviewed...", or leak internal agent mechanics.
6. **Absolute Prohibition on Self-Referential Roleplay or Conversational Preamble**:
   - NEVER open with 'As Synora...', 'As an AI...', 'As a Senior Analyst...', 'I have evaluated your inquiry...', or any similar self-referential introduction.
   - Start immediately with '# [Authoritative Document Title]' and direct substantive analysis without any preliminary conversational filler.

### SPECIALIZED ARCHITECTURE FOR DOMAIN: {display_label}
"""

    if domain == "ACADEMIC_INSTITUTION":
        is_new_age = domain_info.get("is_new_age_tech") is True
        if is_new_age:
            target_geo = domain_info.get("target_geography")
            region_name = target_geo["region"] if target_geo else "the target region"
            non_local_clause = f"\n- {target_geo['non_local_disqualification']}\n- STRICT GEOGRAPHIC ANCHORING: Every evaluated candidate section in '## Deep-Dive Institutional Breakdown for Each Institution' MUST be an academy with an active physical campus or formal program in {region_name}!\n" if target_geo else ""

            return base + f"""
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Briefing**: Authoritative overview of the academic landscape in {region_name}, evaluation methodology, and key institutional highlights.
- **## National & Global Rankings or Industry Accreditation**: Official accredited industry partnerships and degree frameworks (UGC, NAAC, international accreditations).
- **## Master Institutional Comparison Matrix**:
  - Comprehensive Markdown table comparing all evaluated new-age tech institutions in {region_name} (Institution Name, Category, Degree/Accreditation Awarded, Entrance Exam, Median/Average CTC, Mandatory Internship Duration).
- **## Deep-Dive Institutional Breakdown for Each Institution**:
  - Dedicate a numbered `### 1. [Full Institution Name]` section for EACH new-age academy in {region_name} individually.
  - STRICT REQUIREMENT: When evaluating New-Age Tech Schools in {region_name}, evaluated candidates in this section MUST EXCLUSIVELY be modern new-age tech schools / applied academies located in or operating in {region_name}!
{non_local_clause}
  - ABSOLUTE PROHIBITION ON TRADITIONAL COLLEGES IN CANDIDATE BREAKDOWN: NEVER list legacy universities or traditional degree colleges as numbered candidate entities!
  - STRICT RULE: NEVER combine multiple institutions into a single heading. Every single institution MUST have its own individual Level-3 heading!
  - STRICT RULE: NEVER use `### ` headings for non-entity topics (e.g. NEVER write `### Primary Entrance Exams Accepted` or `### Placement Statistics`). Analytical subtopics inside an institution must strictly use bold subheaders (`**...**`).
  - Inside each institution section, use bold subheaders:
    - `**Academic Pedagogy & Key Disciplines:**` (Course curriculum, faculty/tech leaders, hands-on software engineering, applied AI)
    - `**Admissions Process, Entrance Assessments & Eligibility:**` (Entrance exams, admissions framework, eligibility criteria)
    - `**Placement Metrics, Internships & ROI:**` (Median CTC, average domestic packages, top tech recruiters, mandatory paid corporate internships)
    - `**Accreditation, Degree Granting Body & Campus Infrastructure:**` (University partnerships, formal recognition, labs, campus footprint in {region_name})
    - `**Official Institutional Portals & Contact:**` (Direct official institutional link)
- **## Comparative Analysis: New-Age Tech Schools vs Traditional Engineering Colleges**: Clear side-by-side contrast on curriculum agility, degree vs skill focus, campus life, and long-term career trajectory.
- **## Strategic Selection Framework & Decision Guidance**: Actionable advice for students based on learning style, entrance test rank, risk tolerance, and career ambition.
- **## Sources & Citations**: Official institutional portals, verified placement reports, and accreditation links.

CRITICAL RESTRICTION:
- Colleges and tech schools are NOT commercial products!
- STRICTLY DO NOT include any e-commerce links (Amazon, Flipkart, Croma, etc.), shopping carts, or product purchase prompts.
"""
        else:
            return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Briefing**: Authoritative overview of the academic landscape, evaluation methodology, and key institutional highlights.
- **## National & Global Rankings or Industry Accreditation**: Official ranking tables (NIRF, QS World) or accredited industry partnerships (UGC, NAAC, NBA, ABET).
- **## Master Institutional Comparison Matrix**:
  - Comprehensive Markdown table comparing all evaluated institutions (Institution Name, Category [Autonomous Engineering / Central University / Deemed University], Degree Awarded, Entrance Exam [JEE Advanced, JEE Main, GATE, BITSAT], Median/Average CTC, Mandatory Internship Duration).
- **## Deep-Dive Institutional Breakdown for Each Institution**:
  - Dedicate a numbered `### 1. [Full Institution Name]` section for EACH institution individually (e.g. `### 1. IIT Madras`, `### 2. IIT Bombay`, `### 3. BITS Pilani`, `### 4. IIIT Hyderabad`).
  - STRICT RULE: NEVER combine multiple institutions into a single heading. Every single institution MUST have its own individual Level-3 heading!
  - STRICT RULE: NEVER use `### ` headings for non-entity topics. Analytical subtopics inside an institution must strictly use bold subheaders (`**...**`).
  - Inside each institution section, use bold subheaders:
    - `**Academic Pedagogy & Key Disciplines:**` (Course curriculum, faculty research output, key engineering departments)
    - `**Admissions Process, Entrance Assessments & Eligibility:**` (Entrance exams such as JEE, GATE, BITSAT, cutoffs, eligibility)
    - `**Placement Metrics, Internships & ROI:**` (Median CTC, average domestic packages, top corporate recruiters)
    - `**Accreditation, Degree Granting Body & Campus Infrastructure:**` (UGC/AICTE recognition, research centers, campus footprint)
    - `**Official Institutional Portals & Contact:**` (Direct official institutional link)
- **## Strategic Selection Framework & Decision Guidance**: Actionable advice for students based on learning style, entrance test rank, research interest, and career ambition.
- **## Sources & Citations**: Official institutional portals, verified placement reports, and accreditation links.

CRITICAL RESTRICTION:
- Colleges and universities are NOT commercial products!
- STRICTLY DO NOT include any e-commerce links (Amazon, Flipkart, Croma, etc.), shopping carts, or product purchase prompts.
"""

    elif domain == "TECHNICAL_RESEARCH":
        return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Scientific Briefing**: Foundational overview, core scientific paradigm, and executive summary of 2026 technological readiness.
- **## Foundational Scientific & Engineering Architecture**: Physical, chemical, or algorithmic mechanisms underpinning the technology.
- **## 2026 State-of-the-Art Milestones & Industry Progress**: Recent breakthroughs, pilot deployments, and verified laboratory milestones.
- **## Active Commercial Innovators, Research Labs & Quantitative Benchmark Matrix**:
  - Comprehensive Markdown table comparing active players/manufacturers (Entity/Company, Current Chemistry/Architecture, Energy Density / Qubit Count / Performance Metric, Operating Envelope, Commercialization Timeline).
- **## Critical Engineering Roadblocks, Material Science Bottlenecks & Mitigations**: Detailed analysis of thermal, degradation, manufacturing scale, or yield constraints.
- **## 5-Year Outlook & Strategic Industry Implications**: Projections through 2030, cost curve trajectory, and geopolitical/industrial impact.
- **## Sources & Citations**: Academic papers, laboratory whitepapers, and verified industry publications.

CRITICAL RESTRICTION:
- STRICTLY DO NOT include retail shopping links or consumer buy boxes.
"""

    elif domain == "HEAD_TO_HEAD_COMPARISON":
        if domain_info.get("is_commercial_product"):
            return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Head-to-Head Comparison Verdict**: High-level verdict, bottom-line winner, and strategic positioning.
- **## Master Side-by-Side Comparison Matrix**:
  - Detailed Markdown matrix comparing both models across Key Specifications, Display/Design, Processor & Benchmark Scores, Camera System, Battery & Fast Charging, Current Online Price, and Value Proposition.
- **## Deep-Dive Analysis for Each Contender**:
  - For EACH of the competing products, use a dedicated numbered Level-3 heading with brand and full model name:
    `### 1. [Full Brand Model Name]`
    `### 2. [Full Brand Model Name]`
  - Inside each product section, use bold subheaders:
    - `**Key Hardware Specifications:**`
    - `**Real-World Performance & Benchmarks:**`
    - `**Camera & Battery Endurance:**`
    - `**Critical Strengths & Trade-offs:**`
    - `**Pricing & Where to Buy:**`
- **## Dimension-by-Dimension Empirical Face-Off**:
  - Display & Build Quality
  - Real-World Performance & Gaming
  - Camera Performance & Computational Photography
  - Battery Life & Charging Speed
  - Software & Update Longevity
- **## Definitive Decision Framework (Which One Should You Buy?)**: Clear persona-based verdict (e.g. choose Contender A for performance/battery vs Contender B for camera/software).
- **## Sources & Citations**: Verified manufacturer data sheets, lab benchmarks, and trusted tech review sites.
"""
        return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Comparison Verdict**: High-level verdict, strategic positioning, and summary outcome.
- **## Architectural Overview & High-Level Positioning**: Structural design philosophies of the competing architectures or systems.
- **## Comprehensive Side-by-Side Comparison Matrix**:
  - Detailed Markdown matrix directly comparing core technical metrics (Architecture, Microarchitecture/Engine, IPC/IOPS, Latency, Thermal TDP / Power Efficiency, Memory Bandwidth, Scaling Limits, Fault Tolerance / ACID Guarantees).
- **## Deep-Dive Technical Dimension-by-Dimension Breakdown**:
  - Dimension 1: Throughput, Processing Power & Latency
  - Dimension 2: Memory Hierarchy, Cache & Storage Subsystem
  - Dimension 3: Thermal, Power Efficiency & Operational Footprint
  - Dimension 4: Software Ecosystem, Compatibility & Developer Experience
- **## Critical Trade-Offs, Failure Modes & Edge Cases**: Under what conditions each option fails, throttles, or encounters performance cliffs.
- **## Definitive Decision Framework (When to Choose A vs When to Choose B)**: Clear, unambiguous scenarios for selecting either option.
- **## Sources & Citations**: Empirical benchmark suites, architecture whitepapers, and developer documentation.
"""

    elif domain == "ENGINEERING_GUIDE":
        return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Implementation Blueprint**: Scope, objective, and executive architectural summary.
- **## Current vs Target Architecture Comparison & Prerequisites**: System state before vs after, dependency audit, network/storage requirements.
- **## Phased Step-by-Step Implementation Roadmap**:
  - Phase 1: Preparation & Parallel Environment Bring-up
  - Phase 2: Data Replication & Shadow Traffic
  - Phase 3: Canary Cutover & Production Verification
  - Phase 4: Full Cutover & Decommissioning
- **## Concrete Production Configuration Snippets & Deployment Topology**:
  - Validated code/config blocks (YAML, HCL, Shell) with clear inline comments.
- **## Health Checks, Verification & Canary Cutover Protocol**: Observability metrics, smoke tests, and threshold alerts.
- **## Disaster Recovery, Failback Procedures & Post-Cutover Monitoring**: Rollback steps, RPO/RTO tolerances, and post-migration validation.
- **## Sources & Citations**: Official software documentation, engineering case studies, and RFCs.
"""

    elif domain == "FACT_CHECK_DEBUNK":
        return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Initial Verdict Summary**:
  - State the definitive verdict prominently: **Verdict: [FALSE / MISLEADING / TRUE / NUANCED]**.
  - Brief executive summary summarizing the ground truth.
- **## Claim Analysis & Historical / Contextual Origin**: The specific claim being evaluated and where it originated.
- **## Scientific, Physical, or Software Ground Truth Principles**: The foundational scientific laws, code mechanisms, or empirical realities.
- **## Empirical Evidence, Source Cross-Examination & Benchmark Data**: Documented real-world experiments, measurements, or official source citations.
- **## Technical Breakdown of the Misconception / Distortion**: Exactly why the claim is flawed, what physical variables were neglected, or how terms were conflated.
- **## Conclusion & Definitive Factual Reality**: Summary of correct understanding and practical takeaways.
- **## Sources & Citations**: Peer-reviewed journals, official documentation, or verified technical benchmarks.
"""

    elif domain == "COMMERCIAL_PRODUCT":
        return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Briefing**: Authoritative title, executive verdict summary, and market overview table.
- **## Market Landscape & Price Tier Taxonomy**: Broad category breakdown, key competitors, and price bands (Budget, Mid-Range, Premium).
- **## Master Comparison Matrix (6 to 8 Concrete Contenders)**:
  - Markdown table comparing all 6 to 8 options (Model, Price, Core Processor/Motor, Performance/Capacity, Standout Feature, Best Suited For).
- **## Deep-Dive Analysis for Each Option / Product**:
  - For EACH of the 6 to 8 products, use a dedicated numbered Level-3 heading with brand, model, and explicit category noun:
    `### 1. [Brand] [Model] [Category Noun]`
  - Inside each product section, use bold subheaders:
    - `**Key Technical Specifications:**`
    - `**Real-World Performance & Benchmarks:**`
    - `**Critical Strengths & Trade-Offs:**`
    - `**Pricing, Variants & Warranty:**`
    - `**Where to Buy & Availability:**`
- **## Total Cost of Ownership (TCO) & Ownership Factors**: Reliability, warranty, power consumption, and maintenance.
- **## Definitive Segmented Recommendations & Decision Framework**: Clear recommendations for specific user budgets and personas.
- **## Sources & Citations**: Verified manufacturer data sheets, lab benchmarks, and trusted tech review sites.
"""

    else:
        return base + """
### MANDATORY SECTION ARCHITECTURE:
- **# Title & Executive Briefing**: Authoritative overview and core thesis.
- **## Comprehensive Investigation & Empirical Findings**: Multi-faceted exploration of the topic.
- **## Structured Analytical Comparison / Data Matrix**: Tabular comparison of key elements, dimensions, or stakeholders.
- **## Strategic Implications, Trade-offs & Future Outlook**: Forward-looking perspective and risk assessment.
- **## Sources & Citations**: Verified sources and references.
"""


def generate_product_purchase_block(clean_title: str, brand: Optional[str] = None, category: Optional[str] = None) -> str:
    """
    Generates verified, clickable ordering links showing the cheapest / best price options
    and store availability for commercial products (mobile phones, washing machines, laptops, etc.).
    Guarantees links point to price-sorted and discount deal listings.
    """
    import urllib.parse
    encoded = urllib.parse.quote_plus(clean_title)
    brand_prefix = f"{brand} " if brand and brand.lower() not in clean_title.lower() else ""

    if category == "car":
        official_query = urllib.parse.quote_plus(f"{brand_prefix}{clean_title} official test drive booking website")
        return (
            f"> **Where to Buy (Best Pricing & Test Drive):**\n"
            f"> - **Base / Lowest Price Model:** [Check Base Variant & On-Road Price on CarDekho](https://www.cardekho.com/search?q={encoded})\n"
            f"> - **Dealer Discounts & Quotes:** [Compare Best Dealer Offers on CarWale](https://www.carwale.com/search/?q={encoded})\n"
            f"> - **Official Portal:** [Book Test Drive & View Dealerships](https://www.google.com/search?q={official_query})"
        )
    else:
        amazon_cheap_url = f"https://www.amazon.in/s?k={encoded}&s=price-asc-rank"
        flipkart_cheap_url = f"https://www.flipkart.com/search?q={encoded}&sort=price_asc"
        deals_compare_url = f"https://www.google.com/search?q={encoded}+buy+online+cheapest+price+best+deals"
        croma_url = f"https://www.croma.com/searchB?q={encoded}"
        reliance_url = f"https://www.reliancedigital.in/search?q={encoded}"
        brand_store_url = f"https://www.google.com/search?q={encoded}+official+store+student+discount+pricing"

        return (
            f"> **Where to Buy (Lowest Price & Best Deals):**\n"
            f"> - **Amazon (Lowest Price Deals):** [Find Lowest Price & Verified Offers on Amazon India]({amazon_cheap_url})\n"
            f"> - **Flipkart (Lowest Price Deals):** [Find Cheapest Offers on Flipkart]({flipkart_cheap_url})\n"
            f"> - **Multi-Store Price Comparison:** [Compare Lowest Price Across Stores]({deals_compare_url}) | [Croma Deals]({croma_url}) | [Reliance Digital]({reliance_url})\n"
            f"> - **Student & Brand Offers:** [Check Official Brand Store & Student Discounts]({brand_store_url})"
        )


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
        self.model = model or getattr(self.gateway, "default_model", "gemini-3.5-flash")

    def synthesize_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Synthesizes all completed step outputs and gathered citations into a final deliverable report.
        """
        if not state.step_outputs:
            console.print("[yellow]No step outputs available to synthesize.[/yellow]")
            state.final_result = "No step deliverables were produced during workflow execution."
            return state

        # 1. Classify task domain to ensure domain-accurate structure and suppress e-commerce links
        domain_info = classify_task_domain(state.task)
        system_prompt = build_synthesizer_system_prompt(domain_info)

        # Construct input context from all passed step outputs with compact salient summaries
        step_blocks = []
        for step_id, output in state.step_outputs.items():
            findings = "\n".join(f"- {f}" for f in output.key_findings) if output.key_findings else "None"
            # Keep top 3500 chars per step to prevent prompt bloat while preserving all essential tables and metrics
            content_preview = output.content[:3500].strip() if output.content else ""
            step_blocks.append(
                f"### Deliverable for [{step_id}]\n"
                f"**Key Actionable Findings:**\n{findings}\n\n"
                f"**Core Data & Content:**\n{content_preview}\n"
            )

        all_steps_text = "\n---\n".join(step_blocks)

        # Build citations block from aggregated state sources (capped to top 15 sources for fast prompt evaluation)
        sources_text = "No external web sources were recorded."
        if state.sources:
            sources_lines = []
            for idx, src in enumerate(state.sources[:15], start=1):
                sources_lines.append(
                    f"[{idx}] {src.title} | Domain: {src.domain} | URL: {src.url}\n"
                    f"    Snippet: {src.snippet[:200]}"
                )
            sources_text = "\n\n".join(sources_lines)

        user_prompt = f"""### OVERALL OBJECTIVE:
{state.task}

### STEP DELIVERABLES TO SYNTHESIZE:
{all_steps_text}

### VERIFIED EXTERNAL SOURCES GATHERED DURING RESEARCH:
{sources_text}

Please produce an exhaustive, publication-ready deep research report in clean Markdown complying strictly with the {domain_info.get('display_label', 'Domain')} architecture guidelines and including the mandatory '## Sources & Citations' section."""

        response = self.gateway.generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=self.model,
            temperature=0.3,
            max_tokens=4096,
        )

        final_content = self.sanitize_report_content(response.raw_content, domain_info)

        # Determine whether this inquiry is for a physical commercial product that can be bought
        is_commercial = domain_info.get("is_commercial_product") is True

        # Strict non-commercial override: Colleges, Schools, Universities, Python, Coding, Algorithms, Databases
        non_commercial_cues = r"\b(colleges?|schools?|universit(?:y|ies)|iits?|nits?|iiits?|harvard|stanford|mit|oxford|cambridge|python|javascript|typescript|golang|rust|c\+\+|java|c#|algorithms?|databases?|postgresql|postgres|scylladb|docker|kubernetes|nomad|quantum computing|solid[- ]state)\b"
        if re.search(non_commercial_cues, state.task.lower()):
            is_commercial = False
        elif not is_commercial and domain_info.get("domain") not in ["ACADEMIC_INSTITUTION", "TECHNICAL_RESEARCH", "ENGINEERING_GUIDE", "FACT_CHECK_DEBUNK"]:
            product_cues = r"\b(smartphones?|phones?|iphones?|washing machines?|laptops?|macbooks?|cooktops?|air purifiers?|earbuds?|tws|headphones?|refrigerators?|smartwatches?|cameras?|cars?|electric vehicles?)\b"
            if re.search(product_cues, state.task.lower()):
                is_commercial = True

        # Keep images for all things that have an image, but ONLY include Where to Buy links if is_commercial is True
        state.final_result = self.enrich_report_with_product_images(final_content, state.task, is_commercial=is_commercial)

        # Strictly sanitize non-commercial reports to purge any accidental buy links
        if not is_commercial:
            clean_lines = []
            skip = False
            for line in state.final_result.splitlines():
                l_lower = line.lower()
                if any(m in l_lower for m in ["where to buy", "where to order", "order on amazon", "order on flipkart"]):
                    skip = True
                    continue
                if skip:
                    if line.strip().startswith(">") or any(s in l_lower for s in ["amazon.in", "flipkart.com", "croma.com", "reliancedigital.in"]):
                        continue
                    else:
                        skip = False
                clean_lines.append(line)
            state.final_result = "\n".join(clean_lines)

        state.total_tokens += response.total_tokens
        state.estimated_cost_usd += response.estimated_cost_usd

        return state

    def sanitize_report_content(self, content: str, domain_info: Dict[str, Any]) -> str:
        """
        Sanitizes raw LLM synthesis content by:
        1. Stripping robotic roleplay preambles ('As an analyst...').
        2. Renumbering candidate sections sequentially (### 1., ### 2., ...).
        """
        final_content = content
        final_content = re.sub(
            r"^(?:As\s+(?:Synora['’]?s?|a|an)?\s*(?:Senior|Principal|Lead)?\s*(?:Comparative\s+)?(?:Research\s+)?(?:Analyst|Synthesizer|AI|Assistant)[^.\n]*[.\n]+)",
            "",
            final_content.strip(),
            flags=re.IGNORECASE,
        ).strip()
        final_content = re.sub(r"^(?:I\s+have\s+evaluated\s+your\s+inquiry[^.\n]*[.\n]+)", "", final_content, flags=re.IGNORECASE).strip()

        # Renumber ### candidate sections sequentially (### 1., ### 2., ...)
        renumbered_lines = []
        candidate_counter = 1
        for line in final_content.splitlines():
            if re.match(r"^###\s*\d+[\.\)]\s+", line):
                line = re.sub(r"^###\s*\d+[\.\)]\s*", f"### {candidate_counter}. ", line)
                candidate_counter += 1
            renumbered_lines.append(line)

        return "\n".join(renumbered_lines)
    def enrich_report_with_product_images(self, report_text: str, task: str = "", is_commercial: bool = True) -> str:
        """
        Scans a markdown report for product sections and ensures every listed product
        has verified direct imagery and official ordering/purchase links (for commercial products)
        embedded beneath its title.
        """
        import re
        from src.tools.image_search import search_product_images, clean_product_query, CATEGORY_KEYWORDS

        if not report_text or not report_text.strip():
            return report_text

        # Infer overarching product category from task objective and report context
        detected_category = None
        context_lower = f"{task.lower()} {report_text[:1200].lower()}"
        for cat, patterns in CATEGORY_KEYWORDS.items():
            if any(re.search(pat, context_lower) for pat in patterns):
                detected_category = cat
                break

        if detected_category == "institution":
            is_commercial = False

        heading_pattern = re.compile(
            r'^(?:(?:###\s+)|(?:##\s+(?:\d+[\.\)]\s+|Option\s+[A-Za-z0-9]+:?\s*|Model\s+\d+:?\s*|Pick\s+\d+:?\s*)))(?:(?:\d+[\.\)]\s+|Option\s+[A-Za-z0-9]+:?\s*|Model\s+\d+:?\s*|Pick\s+\d+:?\s*))?([A-Za-z0-9][A-Za-z0-9\s\-\+\.\'\/\(\)&]{2,70})\s*$'
        )

        excluded_keywords = [
            "executive summary", "introduction", "overview", "comparison", "summary",
            "key trade-off", "trade-offs", "tradeoffs", "recommendation", "recommendations",
            "verdict", "conclusion", "sources", "citations", "references", "methodology",
            "analysis", "buying guide", "pros and cons", "pros & cons", "key findings",
            "final thoughts", "table of contents", "buyer's guide", "specifications",
            "features", "price comparison", "market landscape", "criteria", "total cost",
            "ownership factors", "decision framework", "testing methodology", "empirical performance",
            "real-world benchmarks", "benchmarks", "battery technology", "charging infrastructure",
            "breakdown", "deep-dive", "institutional breakdown", "contenders",
            "entrance exams", "primary entrance", "eligibility", "academic benchmarks", "admissions criteria",
            "admissions process", "direct admissions", "quota pathways", "faculty research", "specialized labs",
            "maker spaces", "placement statistics", "return on investment", "campus culture", "student life",
            "industry partnerships", "comparative analysis", "alumni network", "international recognition",
            "pedagogy", "curriculum", "scholarships", "fee structure", "tuition fees", "rankings", "accreditation",
            "specialized new-age", "elite autonomous", "new-age tech schools", "tech schools in"
        ]

        deep_dive_cues = [
            "technical specification", "specifications:", "key technical", "real-world performance",
            "benchmarks:", "critical strengths", "strengths & trade-offs", "pricing, variants",
            "where to buy", "filter lifespan", "cadr rating",
            "academic pedagogy", "academics", "admissions", "placement metrics", "placements",
            "campus", "research facilities", "research", "nirf", "cutoffs", "median ctc",
            "highest ctc", "faculty", "curriculum", "alumni", "infrastructure", "jee advanced",
            "bitsat", "gate", "key disciplines", "institutions"
        ]

        deep_dive_heading_patterns = [
            r"deep[- ]dive", r"contender", r"technical breakdown", r"product evaluation",
            r"options? breakdown", r"detailed breakdown", r"individual.*review",
            r"institutional breakdown", r"institution.*breakdown", r"colleges? breakdown",
            r"schools? breakdown", r"institution.*analysis", r"leading institutions",
            r"top institutions", r"comparative breakdown", r"in-depth analysis",
            r"profile", r"campus evaluations?"
        ]

        lines = report_text.splitlines()
        products_to_fetch = []
        product_entries = []
        seen_products = set()
        in_deep_dive_section = False

        for i, line in enumerate(lines):
            line_clean = line.strip()
            if not line_clean or "|" in line_clean:
                continue

            # Track section boundaries (e.g. ## Deep-Dive Analysis vs ## Comparison Matrix / Recommendations)
            if re.match(r"^#{1,3}\s+", line_clean):
                if any(re.search(pat, line_clean, re.IGNORECASE) for pat in deep_dive_heading_patterns):
                    in_deep_dive_section = True
                elif line_clean.startswith("## ") or line_clean.startswith("# "):
                    in_deep_dive_section = False

            match = heading_pattern.match(line_clean)
            if match:
                raw_title = match.group(1).strip()
                clean_title, tokens, brand, category = clean_product_query(raw_title, category_hint=detected_category)
                eff_category = category or detected_category

                is_inst = any(k in clean_title.lower() for k in [
                    "iit", "iiit", "bits", "nit", "iisc", "university", "institute", "college",
                    "school", "campus", "academy", "polytechnic"
                ])
                if is_inst and not eff_category:
                    eff_category = "institution"

                # Strictly require either a detected brand or detected category
                if not clean_title or (not brand and not eff_category):
                    continue

                lower_title = clean_title.lower()
                if any(ex in lower_title for ex in excluded_keywords):
                    continue

                # Must either be inside the deep-dive section or be a ### heading followed by deep-dive technical cues
                is_heading_level_3 = line_clean.startswith("### ")
                has_cues = False
                next_block = " ".join(lines[i+1 : min(i+9, len(lines))]).lower()
                if any(cue in next_block for cue in deep_dive_cues):
                    has_cues = True

                is_deep_dive = in_deep_dive_section or (is_heading_level_3 and has_cues) or (is_inst and (is_heading_level_3 or in_deep_dive_section))
                if not is_deep_dive:
                    continue

                if clean_title.lower() in seen_products:
                    continue
                seen_products.add(clean_title.lower())

                # Check next lines until next heading for existing image or purchase links
                has_image = False
                existing_img_line_idx = None
                has_purchase_links = False

                for j in range(i + 1, min(i + 14, len(lines))):
                    if lines[j].strip().startswith("#"):
                        break
                    if "![" in lines[j] and "](" in lines[j]:
                        has_image = True
                        existing_img_line_idx = j
                    if any(k in lines[j].lower() for k in ["where to buy", "order on amazon", "order on flipkart", "amazon.in", "flipkart.com"]):
                        has_purchase_links = True

                product_entries.append((
                    i, clean_title, brand, eff_category,
                    existing_img_line_idx, has_purchase_links
                ))

                if not has_image and len(clean_title) >= 3:
                    products_to_fetch.append(clean_title)

        if not product_entries:
            return report_text

        resolved_images = {}
        if products_to_fetch:
            console.print(f"[dim cyan]  [Synthesizer] Enriching {len(products_to_fetch)} verified products with images and purchase links (category: {detected_category or 'general'})...[/dim cyan]")
            resolved_images = search_product_images(products_to_fetch, category_hint=detected_category)

        insert_map = {}
        for idx, name, brand, category, existing_img_idx, has_purchase_links in product_entries:
            effective_is_comm = is_commercial and category != "institution"
            if existing_img_idx is None:
                # No image previously existed; insert resolved image and purchase links right after heading
                img_url = resolved_images.get(name)
                blocks = []
                if img_url:
                    blocks.append(f"\n![{name}]({img_url})\n")
                if effective_is_comm and not has_purchase_links:
                    p_block = generate_product_purchase_block(name, brand=brand, category=category)
                    if p_block:
                        blocks.append(f"\n{p_block}\n")
                if blocks:
                    insert_map[idx] = "".join(blocks)
            else:
                # Image already exists at existing_img_idx; insert purchase block right after existing image if commercial
                if effective_is_comm and not has_purchase_links:
                    p_block = generate_product_purchase_block(name, brand=brand, category=category)
                    if p_block:
                        insert_map[existing_img_idx] = f"\n{p_block}\n"

        new_lines = []
        for i, line in enumerate(lines):
            new_lines.append(line)
            if i in insert_map:
                new_lines.append(insert_map[i])

        return "\n".join(new_lines)
