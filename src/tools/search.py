"""
Live Web Search Tool.
Queries search engines to collect real, verified online sources and evidence.
Supports multiple endpoints and fallbacks to ensure reliable results.
"""

import time
import re
import urllib.parse
from html import unescape
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx

from src.tools.base import BaseTool, ToolResult


class WebSearchTool(BaseTool):
    """
    Executes live web searches and extracts real page titles, target URLs,
    domains, and contextual text snippets.
    """
    name: str = "web_search"
    description: str = (
        "Search the live web for verified factual information, news, specifications, and data. "
        "Input parameter: 'query' (string). Optional: 'max_results' (int, default 5)."
    )

    def __init__(self, timeout: float = 12.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.7",
        }

    def _parse_ddg_html(self, html: str, max_results: int) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        blocks = re.findall(r'<div class="[^"]*result results_links[^"]*".*?</div>\s*</div>\s*</div>', html, re.DOTALL)
        if not blocks:
            blocks = re.findall(r'<div class="result__body">.*?</div>', html, re.DOTALL)

        now_iso = datetime.now(timezone.utc).isoformat()

        for b in blocks:
            url_match = re.search(r'<a class="result__url"[^>]*href="([^"]+)"', b)
            title_match = re.search(r'<a class="result__snippet[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', b)
            if not title_match:
                title_match = re.search(r'<a class="result__a"[^>]*>(.*?)</a>', b)
            snippet_match = re.search(r'<a class="result__snippet"[^>]*>(.*?)</a>', b)
            if not snippet_match:
                snippet_match = re.search(r'class="result__snippet"[^>]*>(.*?)</', b, re.DOTALL)

            raw_url = None
            if url_match:
                raw_url = url_match.group(1).strip()
            elif title_match:
                link_tag = re.search(r'href="([^"]+)"', b)
                if link_tag:
                    raw_url = link_tag.group(1).strip()

            if not raw_url:
                continue

            # Unquote DuckDuckGo redirect wrapper
            if "uddg=" in raw_url:
                parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                if "uddg" in parsed:
                    raw_url = parsed["uddg"][0]

            title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else ""
            title = unescape(title)
            snippet = re.sub(r'<[^>]+>', '', snippet_match.group(1)).strip() if snippet_match else ""
            snippet = unescape(snippet)

            if raw_url.startswith("http") and (title or snippet):
                domain = urllib.parse.urlparse(raw_url).netloc
                results.append({
                    "title": title or domain,
                    "url": raw_url,
                    "domain": domain,
                    "snippet": snippet,
                    "retrieved_at": now_iso,
                })
                if len(results) >= max_results:
                    break

        return results

    def _parse_ddg_lite(self, html: str, max_results: int) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # In DDG Lite: table layout with class="result-link" and class="result-snippet"
        links = re.findall(r'<a class="result-link"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
        snippets = re.findall(r'<td class="result-snippet">(.*?)</td>', html, re.DOTALL)

        for i, (raw_url, title_html) in enumerate(links[:max_results]):
            if "uddg=" in raw_url:
                parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                if "uddg" in parsed:
                    raw_url = parsed["uddg"][0]

            title = unescape(re.sub(r'<[^>]+>', '', title_html).strip())
            snippet = ""
            if i < len(snippets):
                snippet = unescape(re.sub(r'<[^>]+>', '', snippets[i]).strip())

            if raw_url.startswith("http"):
                domain = urllib.parse.urlparse(raw_url).netloc
                results.append({
                    "title": title or domain,
                    "url": raw_url,
                    "domain": domain,
                    "snippet": snippet,
                    "retrieved_at": now_iso,
                })
        return results

    def execute(self, **kwargs) -> ToolResult:
        query = " ".join(kwargs.get("query", "").split()).strip()
        max_results = int(kwargs.get("max_results", 5))

        if not query:
            return ToolResult(success=False, error="Search query cannot be empty.")

        start_time = time.perf_counter()

        # Try HTML POST endpoint
        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                resp = client.post(
                    "https://html.duckduckgo.com/html/",
                    data={"q": query},
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    results = self._parse_ddg_html(resp.text, max_results)
                    if results:
                        latency = time.perf_counter() - start_time
                        return ToolResult(success=True, data=results, execution_time_seconds=round(latency, 3))
        except Exception:
            pass

        # Try Lite POST endpoint fallback
        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                resp = client.post(
                    "https://lite.duckduckgo.com/lite/",
                    data={"q": query},
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    results = self._parse_ddg_lite(resp.text, max_results)
                    if results:
                        latency = time.perf_counter() - start_time
                        return ToolResult(success=True, data=results, execution_time_seconds=round(latency, 3))
        except Exception as e:
            latency = time.perf_counter() - start_time
            return ToolResult(success=False, error=f"Search request failed: {str(e)}", execution_time_seconds=round(latency, 3))

        latency = time.perf_counter() - start_time
        return ToolResult(
            success=False,
            error=f"No search results found for query: '{query}'",
            execution_time_seconds=round(latency, 3),
        )
