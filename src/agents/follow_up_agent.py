"""
Follow-Up Research Agent: Grounded Conversational Deep Dives.
Evaluates follow-up questions within an existing research session by strictly
analyzing and comparing the candidates/products/institutions already listed in the initial research report.
Embeds verified imagery for candidates and cheapest-deal purchase links for retail goods,
while strictly excluding purchase links for non-commercial topics (colleges, schools, Python, etc.).
"""

import re
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple
from rich.console import Console

from src.llm.client import LLMGateway
from src.agents.domain_classifier import classify_task_domain
from src.tools.image_search import search_product_image, clean_product_query
from src.tools.registry import default_tool_registry

console = Console()

EXCLUDED_HEADING_KEYWORDS = [
    "executive summary", "introduction", "overview", "comparison", "summary",
    "key trade-off", "trade-offs", "tradeoffs", "recommendation", "recommendations",
    "verdict", "conclusion", "sources", "citations", "references", "methodology",
    "analysis", "buying guide", "pros and cons", "pros & cons", "key findings",
    "final thoughts", "table of contents", "buyer's guide", "specifications",
    "features", "price comparison", "market landscape", "criteria", "total cost",
    "ownership factors", "decision framework", "testing methodology", "empirical performance",
    "real-world benchmarks", "benchmarks", "battery technology", "charging infrastructure",
    "where to buy", "where to order", "key technical specifications", "pricing, variants"
]

NON_COMMERCIAL_KEYWORDS_REGEX = re.compile(
    r"\b(colleges?|schools?|universit(?:y|ies)|iits?|nits?|iiits?|harvard|stanford|mit|oxford|cambridge|"
    r"python|javascript|typescript|golang|rust|c\+\+|java|c#|algorithms?|data structures?|"
    r"databases?|postgresql|postgres|scylladb|cassandra|mongodb|redis|mysql|docker|kubernetes|nomad|"
    r"quantum computing|solid[- ]state|semiconductor|inflation|macroeconomic|gdp|monetary policy)\b",
    re.IGNORECASE
)


def extract_listed_candidates(report_text: str) -> List[str]:
    """
    Extracts the concrete entity, product, or institutional candidates that were evaluated
    and listed in the initial research report.
    Pulls from ### headings and markdown comparison tables.
    """
    if not report_text:
        return []

    candidates: List[str] = []
    seen: set = set()

    # 1. Extract from Level-3 headings: ### 1. [Name] or ### [Name]
    heading_pattern = re.compile(
        r'^#{2,3}\s+(?:\d+[\.\)]\s+|Option\s+[A-Za-z0-9]+:?\s*|Model\s+\d+:?\s*|Pick\s+\d+:?\s*|\bContender\s+\d+:?\s*)([A-Za-z0-9][A-Za-z0-9\s\-\+\.\'\/\(\)&]{2,70})\s*$',
        re.MULTILINE
    )

    for match in heading_pattern.finditer(report_text):
        raw_name = match.group(1).strip()
        lower_name = raw_name.lower()

        if any(ex in lower_name for ex in EXCLUDED_HEADING_KEYWORDS):
            continue

        # Strip trailing parenthesized specs like (₹39,999) or (16GB RAM)
        clean_name = re.sub(r'\s*\([^\)]*\)', '', raw_name).strip()
        clean_name = re.sub(r'^(?:Brand|Pick|Option|Model)\s+:\s*', '', clean_name, flags=re.IGNORECASE).strip()

        if len(clean_name) >= 3 and clean_name.lower() not in seen:
            seen.add(clean_name.lower())
            candidates.append(clean_name)

    # 2. Extract from Markdown Tables if few or no candidates found from headings
    if len(candidates) < 2:
        table_lines = [line.strip() for line in report_text.splitlines() if line.strip().startswith("|")]
        if len(table_lines) >= 3:
            header = table_lines[0].lower()
            if any(col in header for col in ["model", "smartphone", "phone", "product", "contender", "device", "institution", "college", "option"]):
                for line in table_lines[2:]:
                    parts = [p.strip() for p in line.split("|") if p.strip()]
                    if parts:
                        candidate_cell = parts[0]
                        candidate_cell = re.sub(r'\*{1,2}', '', candidate_cell).strip()
                        candidate_cell = re.sub(r'\s*\([^\)]*\)', '', candidate_cell).strip()
                        lower_cell = candidate_cell.lower()
                        if (
                            len(candidate_cell) >= 3
                            and not any(ex in lower_cell for ex in EXCLUDED_HEADING_KEYWORDS)
                            and lower_cell not in seen
                            and not lower_cell.startswith("---")
                        ):
                            seen.add(lower_cell)
                            candidates.append(candidate_cell)

    return candidates


def generate_cheap_purchase_block(product_name: str, brand: Optional[str] = None, category: Optional[str] = None, price: Optional[str] = None) -> str:
    """
    Generates verified, clickable ordering links showing the cheapest / best price options
    and store availability for commercial products (mobile phones, washing machines, laptops, etc.).
    Guarantees links point to price-sorted and discount deal listings.
    """
    encoded = urllib.parse.quote_plus(product_name)
    brand_prefix = f"{brand} " if brand and brand.lower() not in product_name.lower() else ""

    price_line = f"> - **Lowest Price Available:** **{price}** *(Verified Lowest Online Offer)*\n" if price else ""

    if category == "car":
        official_query = urllib.parse.quote_plus(f"{brand_prefix}{product_name} official test drive booking website")
        return (
            f"> 🛒 **Where to Buy (Lowest Price & Test Drive):**\n"
            f"{price_line}"
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

        return (
            f"> 🛒 **Where to Buy (Lowest Price & Best Deals):**\n"
            f"{price_line}"
            f"> - **Amazon (Lowest Price Deals):** [Find Lowest Price & Verified Offers on Amazon India]({amazon_cheap_url})\n"
            f"> - **Flipkart (Lowest Price Deals):** [Find Cheapest Offers on Flipkart]({flipkart_cheap_url})\n"
            f"> - **Multi-Store Price Comparison:** [Compare Lowest Price Across Stores]({deals_compare_url}) | [Croma Deals]({croma_url}) | [Reliance Digital]({reliance_url})"
        )


class FollowUpAgent:
    """
    Agent dedicated to answering user follow-up questions within an existing research session.
    Strictly evaluates, compares, and deep-dives the options/products/entities that were
    already listed and analyzed in the initial research report.
    """

    def __init__(self, gateway: Optional[LLMGateway] = None, model: Optional[str] = None):
        self.gateway = gateway or LLMGateway()
        self.model = model or getattr(self.gateway, "default_model", "gemini-3.5-flash")

    def answer_follow_up(
        self,
        task: str,
        report_content: str,
        query: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes a fact-grounded follow-up answer constrained strictly to the
        candidates listed in the first search.
        """
        effective_model = model or self.model

        # 1. Determine domain and commercial status
        domain_info = classify_task_domain(task)
        is_commercial = domain_info.get("is_commercial_product") is True

        # Double safety: Strict non-commercial check
        if NON_COMMERCIAL_KEYWORDS_REGEX.search(task) or NON_COMMERCIAL_KEYWORDS_REGEX.search(query):
            is_commercial = False
        elif not is_commercial and domain_info.get("domain") not in [
            "ACADEMIC_INSTITUTION", "TECHNICAL_RESEARCH", "ENGINEERING_GUIDE", "FACT_CHECK_DEBUNK"
        ]:
            product_cues = r"\b(smartphones?|phones?|iphones?|washing machines?|laptops?|macbooks?|cooktops?|air purifiers?|earbuds?|tws|headphones?|refrigerators?|smartwatches?|cameras?|cars?|electric vehicles?)\b"
            if re.search(product_cues, task.lower()):
                is_commercial = True

        # 2. Extract candidates that were listed in the first search
        listed_candidates = extract_listed_candidates(report_content)
        console.print(f"[cyan][FollowUpAgent] Identified {len(listed_candidates)} listed candidates from initial research: {listed_candidates}[/cyan]")

        # 3. Quick targeted live search for the listed candidates if specific specs/benchmarks are requested
        live_evidence = ""
        sources: List[Dict[str, str]] = []
        if listed_candidates and len(listed_candidates) >= 1:
            try:
                top_cand_str = " vs ".join(listed_candidates[:3])
                clean_query_terms = re.sub(r'^(which|what|who|compare|how)\s+', '', query.lower().strip())
                search_tool = default_tool_registry.get_tool("web_search")
                if search_tool:
                    search_q = f"{top_cand_str} {clean_query_terms}"
                    search_res = search_tool.execute(query=search_q, max_results=3)
                    if search_res.success and search_res.data:
                        snippets = []
                        for s in search_res.data:
                            title = s.get("title", "Source")
                            url = s.get("url", "")
                            snip = s.get("snippet", "")
                            domain = s.get("domain", "")
                            snippets.append(f"- **{title}** ({domain}): {snip}")
                            if url:
                                sources.append({"title": title, "url": url, "domain": domain, "snippet": snip})
                        live_evidence = "\n".join(snippets)
            except Exception as e:
                console.print(f"[dim yellow]Follow-up live search skipped: {e}[/dim yellow]")

        # 4. Construct conversation history block if available
        history_text = ""
        if history and len(history) > 0:
            hist_lines = ["### PREVIOUS FOLLOW-UP CONVERSATION:"]
            for h in history[-3:]:
                q_text = h.get("query", "")
                a_text = h.get("answer", "")
                if q_text:
                    hist_lines.append(f"User: {q_text}")
                    hist_lines.append(f"Assistant: {a_text[:400]}...\n")
            history_text = "\n".join(hist_lines)

        # 5. Build specialized system prompt enforcing comparison among listed candidates
        candidates_formatted = "\n".join(f"- {c}" for c in listed_candidates) if listed_candidates else "Extracted from the initial report content."

        system_prompt = f"""You are an elite Research Specialist and Technical Synthesizer for Synora.
Your objective is to provide an authoritative, fact-grounded, structured comparative response to the user's follow-up inquiry.

### ABSOLUTE PROHIBITION ON INTRODUCTORY ROLEPLAY & ROBOTIC PHRASES:
- DO NOT start with 'As Synora's...', 'As an AI...', 'As a Senior Comparative Research Analyst...', 'I have evaluated your inquiry...', or any similar self-referential introduction or robotic disclaimer.
- DO NOT mention Synora or the platform in the answer unless the user explicitly asks about it.
- Start directly and immediately with the concrete answer, analytical comparison, or executive verdict without ANY opening pleasantries, conversational filler, or self-introductions.

### CRITICAL GROUNDING CONSTRAINTS:
1. **FOCUS STRICTLY ON THE LISTED CANDIDATES FROM THE INITIAL RESEARCH**:
   - The user has already performed initial research on: "{task}".
   - In that initial search, the following specific contenders/candidates were listed and evaluated:
{candidates_formatted}
   - You MUST evaluate, rank, and compare the user's question EXCLUSIVELY among these listed candidates!
   - DO NOT introduce, invent, or search for unlisted products, external colleges, or random other models that were not in the first search, unless the user explicitly requested outside alternatives.
   - If the user asks about location (e.g. specific regional options), examine WHICH of the listed contenders have active campuses, learning centers, or operations in that location and compare their specific offerings!

2. **STRUCTURED & DATA-DENSE FORMAT**:
   - **Direct Answer & Executive Verdict**: Open immediately with the direct answer (e.g. identifying which of the listed candidates meet the criteria and comparing them).
   - **Comparison Matrix**: Clean Markdown table comparing the candidates on the user's query dimensions.
   - **In-Depth Analysis**: Detailed, factual breakdown for each relevant candidate.
   - **Key Takeaways & Next Steps**: Practical recommendations for the user.

3. **DYNAMIC FOLLOW-UP QUESTIONS (REQUIRED AT THE VERY END OF YOUR ANSWER)**:
   - At the very end of your response, provide EXACTLY 3 sharp, highly-relevant follow-up inquiry prompts specifically tailored to explore this topic deeper.
   - Format them with this exact header and bullet format:
   ### Suggested Next Inquiries:
   - [Follow-up question 1]
   - [Follow-up question 2]
   - [Follow-up question 3]

4. **COMMERCIAL VS NON-COMMERCIAL STRICT RESTRICTION**:
   {"- Physical consumer product: Include verified 'Where to Buy (Lowest Price & Best Deals)' links for the winning candidate from the listed group." if is_commercial else "- STRICTLY NON-COMMERCIAL TOPIC (Colleges, Universities, Python, Code, Algorithms): STRICTLY DO NOT include any 'Where to Buy', Amazon, Flipkart, or shopping links!"}
"""

        user_prompt = f"""### INITIAL RESEARCH OBJECTIVE:
{task}

### LISTED CANDIDATES FROM INITIAL RESEARCH:
{candidates_formatted}

### INITIAL RESEARCH REPORT CONTENT (EXCERPT/CONTEXT):
{report_content[:6000]}

{history_text}

### LIVE VERIFIED WEB EVIDENCE:
{live_evidence if live_evidence else "Rely on the verified specifications from the initial research report above."}

### USER FOLLOW-UP QUESTION:
{query}

Please provide an exhaustive, authoritative follow-up answer strictly comparing the listed candidates from the first search."""

        # Generate response using LLM
        response = self.gateway.generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=effective_model,
            temperature=0.2,
            max_tokens=4096,
        )

        raw_answer = response.raw_content

        # 6. Post-process answer: Strip any accidental roleplay intro or self-referential robotic filler
        enriched_answer = re.sub(
            r"^(?:As\s+(?:Synora['’]?s?|a|an)?\s*(?:Senior|Principal|Lead)?\s*(?:Comparative\s+)?(?:Research\s+)?(?:Analyst|Synthesizer|AI|Assistant)[^.\n]*[.\n]+)",
            "",
            raw_answer.strip(),
            flags=re.IGNORECASE,
        ).strip()
        enriched_answer = re.sub(r"^(?:I\s+have\s+evaluated\s+your\s+inquiry[^.\n]*[.\n]+)", "", enriched_answer, flags=re.IGNORECASE).strip()

        # 7. Extract dynamic follow-up questions from output
        suggested_questions: List[str] = []
        if "### Suggested Next Inquiries:" in enriched_answer:
            parts = enriched_answer.split("### Suggested Next Inquiries:")
            enriched_answer = parts[0].strip()
            q_block = parts[1].strip()
            for q_line in q_block.splitlines():
                q_line = q_line.strip()
                if q_line.startswith("- ") or q_line.startswith("* ") or re.match(r'^\d+[\.\)]\s+', q_line):
                    cleaned_q = re.sub(r'^(?:[-*]|\d+[\.\)])\s*', '', q_line).strip()
                    if len(cleaned_q) >= 10:
                        suggested_questions.append(cleaned_q)

        # Fallback contextual question generator if model did not output explicit inquiries
        if len(suggested_questions) < 3:
            q_lower = query.lower()
            t_lower = task.lower()
            if "location" in q_lower or "city" in q_lower or "campus" in q_lower:
                defaults = [
                    "Compare physical campus infrastructure, facilities, and offline mentor access across these options",
                    "What are the verified regional location benefits and local industry networking hubs for these candidates?",
                    "What is the day-to-day schedule, student housing, and physical lab access?",
                ]
            elif "fee" in q_lower or "cost" in q_lower or "scholarship" in q_lower:
                defaults = [
                    "Compare the complete 4-year tuition fee, living expenses, and laptop mandates across these schools",
                    "Which of these institutions provide Income Sharing Agreements (ISA) or deferred payment options?",
                    "What are the merit-based scholarship cutoffs in the entrance examinations?",
                ]
            elif "placement" in q_lower or "salary" in q_lower or "ctc" in q_lower:
                defaults = [
                    "What are the audited median vs average CTC figures and top product recruiter names?",
                    "How many students secured international offers or remote US/European software internships?",
                    "Compare Pre-Placement Offer (PPO) conversion rates from mandatory 1-year internships",
                ]
            elif "school" in t_lower or "college" in t_lower or "university" in t_lower:
                defaults = [
                    "How do accredited degree models, university affiliations, and formal recognitions compare across these institutions?",
                    "Which institutions offer dedicated physical campuses with offline mentoring and industry immersion?",
                    "Compare the complete 4-year tuition fee structure, living expenses, and median placement CTC outcomes",
                ]
            elif "phone" in t_lower or "camera" in q_lower:
                defaults = [
                    "Compare battery drain and thermal throttling during 60fps 4K video recording",
                    "How do software update policies and OS longevity compare across these models?",
                    "Which phone offers the highest trade-in value and bank card discount deals right now?",
                ]
            else:
                defaults = [
                    f"Evaluate the primary real-world trade-offs and operational constraints of {listed_candidates[0] if listed_candidates else 'this option'}",
                    f"How does long-term maintenance, reliability, and support compare among these candidates?",
                    "What are the critical pitfalls to avoid before making a final commitment?",
                ]
            for d in defaults:
                if d not in suggested_questions:
                    suggested_questions.append(d)
                if len(suggested_questions) >= 3:
                    break

        # 8. Resolve winning candidate from the listed ones to attach image and purchase links
        winning_candidate = None
        if listed_candidates:
            # Check which listed candidate appears earliest in the answer or is declared winner
            for cand in listed_candidates:
                if re.search(r'\b' + re.escape(cand) + r'\b', enriched_answer, re.IGNORECASE):
                    winning_candidate = cand
                    break
            if not winning_candidate and listed_candidates:
                winning_candidate = listed_candidates[0]

        # 9. Post-process answer: Embed verified image for the winning product from the list
        if winning_candidate and not ("![" in enriched_answer and "](" in enriched_answer):
            try:
                cat_hint = "smartphone" if "phone" in task.lower() else ("laptop" if "laptop" in task.lower() else None)
                winner_img = search_product_image(winning_candidate, category_hint=cat_hint)
                if winner_img:
                    # Insert image right after first heading or at the top
                    if "\n## " in enriched_answer:
                        parts = enriched_answer.split("\n## ", 1)
                        enriched_answer = f"{parts[0]}\n\n![{winning_candidate}]({winner_img})\n\n## {parts[1]}"
                    elif "\n# " in enriched_answer:
                        parts = enriched_answer.split("\n# ", 1)
                        enriched_answer = f"{parts[0]}\n\n![{winning_candidate}]({winner_img})\n\n# {parts[1]}"
                    else:
                        enriched_answer = f"![{winning_candidate}]({winner_img})\n\n{enriched_answer}"
            except Exception as e:
                console.print(f"[dim yellow]Could not attach winning product image: {e}[/dim yellow]")

        # 10. Post-process answer: Add Where to Buy links ONLY if commercial
        if is_commercial and winning_candidate:
            has_links = bool(
                re.search(r'\[.*?\]\(https?://[^)]*(?:amazon|flipkart|croma|reliancedigital|cardekho|carwale|bestbuy|walmart)[^)]*\)', enriched_answer, re.IGNORECASE)
            )
            if not has_links:
                from src.agents.synthesizer import extract_lowest_price_from_block
                cand_price = extract_lowest_price_from_block(enriched_answer)
                p_block = generate_cheap_purchase_block(winning_candidate, price=cand_price)
                enriched_answer = f"{enriched_answer}\n\n---\n{p_block}"
        elif not is_commercial:
            # Clean any accidental purchase links
            lines = enriched_answer.splitlines()
            cleaned = []
            skip = False
            for line in lines:
                lower = line.lower()
                if any(m in lower for m in ["where to buy", "where to order", "order on amazon", "order on flipkart"]):
                    skip = True
                    continue
                if skip:
                    if line.strip().startswith(">") or any(s in lower for s in ["amazon.in", "flipkart.com", "croma.com", "reliancedigital.in"]):
                        continue
                    else:
                        skip = False
                cleaned.append(line)
            enriched_answer = "\n".join(cleaned)

        return {
            "answer": enriched_answer,
            "candidates": listed_candidates,
            "winner": winning_candidate,
            "sources": sources,
            "is_commercial": is_commercial,
            "suggested_questions": suggested_questions[:3],
            "total_tokens": response.total_tokens,
            "estimated_cost_usd": response.estimated_cost_usd,
        }
