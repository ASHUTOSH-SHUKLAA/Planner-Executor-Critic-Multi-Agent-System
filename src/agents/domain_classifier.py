"""
Domain & Intent Classifier for Multi-Agent Deep Research.
Distinguishes academic, technical, comparative, architectural, fact-checking,
and commercial product tasks so the platform responds with domain-appropriate
structure, research angles, and sources—never treating colleges or algorithms as e-commerce goods.
"""

import re
from typing import Dict, Any, Literal, Optional

ResearchDomain = Literal[
    "ACADEMIC_INSTITUTION",
    "TECHNICAL_RESEARCH",
    "HEAD_TO_HEAD_COMPARISON",
    "ENGINEERING_GUIDE",
    "FACT_CHECK_DEBUNK",
    "COMMERCIAL_PRODUCT",
    "GENERAL_RESEARCH",
]


def extract_target_geography(task: str) -> Optional[Dict[str, Any]]:
    """
    Extracts explicit city/regional geography from the research prompt
    so that institutional evaluations are strictly grounded in the user's requested region.
    """
    t = task.lower()
    regions = [
        (
            r"\b(delhi|ncr|gurugram|gurgaon|noida|greater noida|faridabad|ghaziabad|sonipat)\b",
            "Delhi / NCR",
            ["Delhi", "Delhi NCR", "Gurugram", "Noida", "Sonipat", "Faridabad"],
        ),
        (
            r"\b(bang[ao]?l[ao]?re|bengaluru|blr|karnataka)\b",
            "Bangalore",
            ["Bangalore", "Bengaluru", "Electronic City", "HSR Layout", "Koramangala"],
        ),
        (
            r"\b(pune|lohegaon|wakad|hinjawadi|pimpri|chinchwad|pcmc)\b",
            "Pune",
            ["Pune", "Lohegaon", "Wakad", "Hinjawadi", "Pimpri-Chinchwad", "ADYPU"],
        ),
        (
            r"\b(mumbai|bkc|bandra|powai|navi mumbai|thane|mmr)\b",
            "Mumbai",
            ["Mumbai", "BKC", "Bandra", "Powai", "Navi Mumbai", "Thane", "MMR"],
        ),
        (
            r"\b(maharashtra)\b",
            "Maharashtra",
            ["Maharashtra", "Pune", "Mumbai"],
        ),
        (
            r"\b(hyderabad|telangana)\b",
            "Hyderabad",
            ["Hyderabad", "HITEC City", "Gachibowli", "Telangana"],
        ),
    ]

    for pattern, region_name, keywords in regions:
        if re.search(pattern, t):
            return {
                "region": region_name,
                "city_keywords": keywords,
                "non_local_disqualification": (
                    f"STRICT GEOGRAPHIC BOUNDARY: The user specifically requested {region_name}! "
                    f"Evaluated candidate institutions MUST have active physical campuses, hubs, or cohorts in {region_name}. "
                    f"Strictly exclude institutions from other cities or regions that do not have physical operations in {region_name}."
                ),
            }
    return None


def classify_task_domain(task: str) -> Dict[str, Any]:
    """
    Classifies the user query into a specialized research domain with tailored
    instructional guidance for the Planner and Synthesizer agents.
    """
    t = task.lower().strip()
    # Normalize hyphens, dashes, and whitespace variations (e.g. 'new - age', 'new–age', 'new—age' -> 'new-age')
    t_clean = re.sub(r"\s*[-–—]+\s*", "-", t)
    t_clean = re.sub(r"\s+", " ", t_clean)

    target_geo = extract_target_geography(task)

    # 1. Fact-Checking, Claim Verification & Adversarial Probes
    fact_check_patterns = [
        r"\bverify claim\b",
        r"\bfact[- ]check\b",
        r"\bvalidate efficacy claims\b",
        r"\bdebunk\b",
        r"\bexplain why .* (boils at 50|freezes at 50)\b",
        r"\bmisleading\b",
        r"\bis it true that\b",
        r"\b100% speedup\b",
        r"\bmyth\b",
    ]
    if any(re.search(p, t) or re.search(p, t_clean) for p in fact_check_patterns):
        return {
            "domain": "FACT_CHECK_DEBUNK",
            "is_commercial_product": False,
            "display_label": "Fact-Checking & Claim Verification",
            "focus_areas": [
                "Initial Verdict & Claim Truthfulness (TRUE / FALSE / MISLEADING / NUANCED)",
                "Scientific, Physical, or Software Ground Truth Principles",
                "Detailed Empirical Evidence & Source Cross-Examination",
                "Corrected Reality, Real-World Data & Technical Nuances",
            ],
            "forbidden_elements": [
                "E-commerce purchase links (Amazon, Flipkart, etc.)",
                "Product buy boxes",
                "Irrelevant shopping recommendations",
            ],
        }

    # 2. Academic & Institutional Research (Universities, Tech Schools, Colleges, Schools, New-Age Tech Academies)
    new_age_patterns = [
        r"\bnew\s*[-–—]?\s*age\b",
        r"\bnewage\b",
        r"\bnext\s*[-–—]?\s*gen(?:eration)?\b",
        r"\bmodern\s+tech\b",
        r"\bapplied\s+tech\b",
        r"\bwork\s*[-–—]?\s*integrated\b",
        r"\bindustry\s*[-–—]?\s*first\b",
        r"\btech\s+school\b",
        r"\bcoding\s+bootcamp\b",
        r"\btech\s+academy\b",
    ]
    is_new_age_tech = any(re.search(p, t, re.IGNORECASE) for p in new_age_patterns) or any(re.search(p, t_clean, re.IGNORECASE) for p in new_age_patterns)

    academic_patterns = [
        r"\b(schools?|boarding schools?|high schools?|tech schools?|engineering schools?|business schools?|medical schools?|law schools?)\b",
        r"\b(college|colleges|university|universities|institute of technology|institutes of technology|educational institution)\b",
        r"\b(iit|nits?|iiits?|bits pilani|stanford|mit|harvard|oxford|cambridge)\b",
        r"\b(nirf|qs ranking|times higher education|admission criteria|campus placement)\b",
        r"\b(b\.?tech|m\.?tech|mba|phd program|undergraduate program)\b",
    ]
    if (is_new_age_tech or any(re.search(p, t) or re.search(p, t_clean) for p in academic_patterns)) and not re.search(r"\b(buy|shopping|price of laptop|laptop for)\b", t):
        region_label = f" ({target_geo['region']})" if target_geo else ""

        focus_areas = [
            f"Autonomous identification of leading New-Age Tech Schools and Applied Academies in {target_geo['region'] if target_geo else 'the target region'}",
            "Applied Software Engineering & AI Curriculum, Industry Leadership Mentorship, and Hands-on Pedagogy",
            "Admissions Framework & Entrance Assessment Modalities",
            f"Placement Track Records, Mandatory Paid Internships, and Tech Industry Hiring Networks in {target_geo['region'] if target_geo else 'the target region'}",
            "Degree Recognition & Accredited University Partnerships vs Traditional Degrees",
            f"Comparative Contrast: Applied Tech Schools vs Traditional Engineering Colleges in {target_geo['region'] if target_geo else 'the region'} highlighting curriculum differences without listing traditional colleges as candidate entities",
        ] if is_new_age_tech else [
            "Official Rankings & Accreditation (NIRF, QS World, NAAC, NBA)",
            "Academic Rigor, Specializations, and Faculty Research Output",
            "Admissions Criteria, Entrance Exams (JEE, GATE, CAT), and Eligibility",
            "Placement Statistics (Median/Average CTC, Top Recruiters, ROI)",
            "Campus Infrastructure, Labs, Incubation Centers, and Alumni Network",
            "Official Institutional Portals & Application Links",
        ]

        forbidden = [
            "Listing traditional / legacy colleges as evaluated candidate schools when the user explicitly requested new-age tech schools",
            "Evaluating defunct or closed institutions as active programs",
            "E-commerce 'Where to Buy' links (Amazon, Flipkart, etc.)",
            "Retail purchase buttons",
            "Product inventory or cart prompts",
        ]
        if target_geo and is_new_age_tech:
            forbidden.append(target_geo["non_local_disqualification"])

        return {
            "domain": "ACADEMIC_INSTITUTION",
            "is_commercial_product": False,
            "is_new_age_tech": is_new_age_tech,
            "target_geography": target_geo,
            "display_label": f"New-Age Tech Schools & Applied Academies{region_label}" if is_new_age_tech else "Academic & Institutional Research",
            "focus_areas": focus_areas,
            "forbidden_elements": forbidden,
        }

    # Software, Programming Languages & System Architecture (Python, Rust, Databases, Frameworks)
    software_patterns = [
        r"\b(python|javascript|typescript|golang|rust|c\+\+|java|c#|php|ruby|swift|kotlin|scala)\b",
        r"\b(algorithm|algorithms|data structures?|concurrency|multithreading|gil|garbage collect(?:ion|or))\b",
        r"\b(docker|kubernetes|nomad|postgresql|postgres|scylladb|cassandra|mongodb|redis|mysql|sqlite)\b",
        r"\b(linux|kernel|operating system|api design|rest api|graphql|grpc)\b",
    ]
    if any(re.search(p, t) for p in software_patterns) and not re.search(r"\b(buy|shopping|laptop for|phone)\b", t):
        return {
            "domain": "TECHNICAL_RESEARCH",
            "is_commercial_product": False,
            "display_label": "Software & Computer Science Research",
            "focus_areas": [
                "Core Architecture, Language Specification & Internal Mechanics",
                "Performance Benchmarks, Concurrency & Memory Profiles",
                "Syntax, API Design & Developer Ergonomics",
                "Ecosystem, Package Tooling & Production Readiness",
                "Verified Engineering Documentation & Official RFCs",
            ],
            "forbidden_elements": [
                "E-commerce 'Where to Buy' links (Amazon, Flipkart, etc.)",
                "Product buy boxes",
                "Consumer shopping recommendations",
            ],
        }

    # Consumer Physical Product Patterns (Smartphones, Washing Machines, Gadgets, Appliances, Vehicles)
    consumer_product_patterns = [
        r"\b(smartphones?|phones?|iphones?|galaxy\s+s\d+|pixels?|oneplus|xiaomi|motorola|vivo|oppo|realme)\b",
        r"\b(washing machines?|dryers?|refrigerators?|fridges?|air conditioners?|\bac\b|dishwashers?)\b",
        r"\b(laptops?|macbooks?|notebooks?|ultrabooks?|thinkpad|gaming laptops?)\b",
        r"\b(cooktops?|induction cooktops?|induction|microwaves?|ovens?|chimneys?)\b",
        r"\b(air purifiers?|purifiers?|water purifiers?|vacuum cleaners?|vacuums?)\b",
        r"\b(earbuds?|headphones?|earphones?|tws|airpods|soundbars?|bluetooth speakers?)\b",
        r"\b(smartwatches?|smartwatch(?:es)?|fitness trackers?)\b",
        r"\b(cameras?|dslr|mirrorless|action cameras?|gopro)\b",
        r"\b(televisions?|tvs?|oled\s+tv|qled\s+tv)\b",
        r"\b(electric vehicles?|ev cars?|cars?|suvs?|sedans?|scooters?|electric scooters?)\b",
    ]
    is_consumer_product = any(re.search(p, t) for p in consumer_product_patterns)

    # Multi-product buying guide / recommendation cues
    commercial_buying_cues = [
        r"\bbuy\b",
        r"\bbuying guide\b",
        r"\bbest\b",
        r"\btop\b",
        r"\bunder\b",
        r"\bbudget\b",
        r"\bfind out\b",
        r"\brecommend\b",
        r"\boptions?\b",
        r"\bfor (students?|gamers?|professionals?|family|office|home|coding|editing|student use case|use case)\b",
    ]
    is_multi_product_buying_guide = is_consumer_product and any(re.search(p, t) for p in commercial_buying_cues)
    is_strict_pairwise = bool(re.search(r"\b(vs\.?|versus|which is better:?\s*|difference between)\b", t))

    # If it is a multi-product buying guide (e.g. "best smartphones under 50k for student use case"),
    # treat it as a COMMERCIAL_PRODUCT buying guide even if the prompt contains words like 'compare'.
    if is_multi_product_buying_guide and not is_strict_pairwise:
        return {
            "domain": "COMMERCIAL_PRODUCT",
            "is_commercial_product": True,
            "display_label": "Commercial Product Evaluation & Buying Guide",
            "focus_areas": [
                "Market Landscape & Price Tier Taxonomy (Budget, Mid-Range, Premium)",
                "Master Comparison Matrix of Top 6 to 8 Concrete Market Contenders",
                "Deep-Dive Technical Breakdown per Model (Key Specs, Real-World Benchmarks, Trade-offs)",
                "Total Cost of Ownership, Warranty, and Reliability Outlook",
                "Definitive Segmented Recommendations & Decision Framework",
                "Where to Order Online & Store Availability Links",
            ],
            "forbidden_elements": [],
        }

    # 3. Head-to-Head Comparisons (Hardware, Databases, Frameworks, Architecture, or Consumer Gadgets)
    comparison_patterns = [
        r"\bvs\.?\b",
        r"\bversus\b",
        r"\bcompare[s]?\b",
        r"\bcompar(?:ison|ative)\b",
        r"\bdifference between\b",
        r"\bwhich is better:?\s*",
    ]
    if any(re.search(p, t) for p in comparison_patterns):
        return {
            "domain": "HEAD_TO_HEAD_COMPARISON",
            "is_commercial_product": is_consumer_product,
            "display_label": "Comparative Product & Technical Evaluation" if is_consumer_product else "Comparative Technical Architecture",
            "focus_areas": [
                "Executive Verdict & High-Level Positioning",
                "Side-by-Side Comprehensive Specification & Architecture Matrix",
                "Empirical Benchmarks (IOPS, Latency, IPC, Throughput, Thermal/Power)" if not is_consumer_product else "Real-World Performance & Benchmark Comparisons",
                "Critical Trade-offs, Edge Cases, and Operational Gotchas",
                "Definitive Decision Framework (When to Choose A vs When to Choose B)",
            ],
            "forbidden_elements": [
                "Generic e-commerce product links unless comparing consumer retail gadgets",
            ] if not is_consumer_product else [],
        }

    # 4. Engineering, Implementation & Migration Guides
    guide_patterns = [
        r"\bmigration guide\b",
        r"\bhow to migrate\b",
        r"\bcutover\b",
        r"\bdisaster recovery plan\b",
        r"\brpo/rto\b",
        r"\bstep[- ]by[- ]step guide\b",
        r"\bdeployment strategy\b",
        r"\barchitecture blueprint\b",
    ]
    if any(re.search(p, t) for p in guide_patterns):
        return {
            "domain": "ENGINEERING_GUIDE",
            "is_commercial_product": False,
            "display_label": "Engineering & Architectural Guide",
            "focus_areas": [
                "Architectural Comparison & Cutover Prerequisites",
                "Phased Step-by-Step Implementation Roadmap",
                "Concrete Configuration Snippets, Infrastructure-as-Code & Network Topology",
                "Validation, Health Checks, and Canary Cutover Protocol",
                "Disaster Recovery, Failback Procedures, and Post-Mortem Observability",
            ],
            "forbidden_elements": [
                "Shopping or e-commerce links",
                "Unrelated consumer reviews",
            ],
        }

    # 5. Deep Technical, Scientific & Geopolitical Research
    technical_patterns = [
        r"\bsolid[- ]state\b",
        r"\bquantum computing\b",
        r"\bmicro[- ]modular nuclear\b",
        r"\bsemiconductor supply chain\b",
        r"\bsemiconductor\b",
        r"\bphotovoltaic\b",
        r"\bgeopolitical risks?\b",
        r"\bmacroeconomic\b",
        r"\bev charging protocol\b",
        r"\bvector database\b",
        r"\bcommercial solar\b",
        r"\bgpu pricing\b",
        r"\bstate of .* in 2026\b",
    ]
    if any(re.search(p, t) for p in technical_patterns):
        return {
            "domain": "TECHNICAL_RESEARCH",
            "is_commercial_product": False,
            "display_label": "Deep Scientific & Technical Research",
            "focus_areas": [
                "Fundamental Scientific & Engineering Principles",
                "Current 2026 State-of-the-Art Milestones and Breakthroughs",
                "Leading Key Innovators, Global Labs, and Commercial Players",
                "Quantitative Metrics, Levelized Costs, and Physical Benchmark Data",
                "Engineering Roadblocks, Material Science Bottlenecks, and 5-Year Outlook",
                "Verified Academic, Governmental, and Industrial Citations",
            ],
            "forbidden_elements": [
                "E-commerce purchase blocks (Amazon, Flipkart)",
                "Consumer product affiliate links",
            ],
        }

    # 6. Commercial Consumer Product Buying Guide (Physical appliances, gadgets, cars)
    commercial_patterns = [
        r"\bbuy\b",
        r"\bbuying guide\b",
        r"\bbest (induction cooktop|cooktop|air purifier|purifier|washing machine|refrigerator|tws|earbuds?|airdopes?|smartwatch|vacuum|camera|smartphone|phone|electric car|ev vehicle|electric vehicle|car|laptop)\b",
        r"\b(under|budget) (₹|\$|\d+k|\d+000)\b",
    ]
    if any(re.search(p, t) for p in commercial_patterns) or is_consumer_product:
        return {
            "domain": "COMMERCIAL_PRODUCT",
            "is_commercial_product": True,
            "display_label": "Commercial Product Evaluation & Buying Guide",
            "focus_areas": [
                "Market Landscape & Price Tier Taxonomy (Budget, Mid-Range, Premium)",
                "Master Comparison Matrix of Top 6 to 8 Concrete Market Contenders",
                "Deep-Dive Technical Breakdown per Model (Key Specs, Real-World Benchmarks, Trade-offs)",
                "Total Cost of Ownership, Warranty, and Reliability Outlook",
                "Definitive Segmented Recommendations & Decision Framework",
                "Where to Order Online & Store Availability Links",
            ],
            "forbidden_elements": [],
        }

    # 7. General Research (Default fallback)
    return {
        "domain": "GENERAL_RESEARCH",
        "is_commercial_product": False,
        "display_label": "In-Depth Research & Investigation",
        "focus_areas": [
            "Executive Overview & Core Definitions",
            "Comprehensive Multi-Faceted Exploration & Empirical Findings",
            "Structured Analytical Comparison / Data Matrix",
            "Strategic Implications, Risks, and Future Trajectory",
            "Verified Sources & Citations",
        ],
        "forbidden_elements": [
            "E-commerce 'Where to Buy' links unless specifically requested",
        ],
    }
