"""
Live Web Search Tool.
Queries search engines to collect real, verified online sources and evidence.
Features persistent connection pooling, sub-second parsing, and query caching for ultra-low latency.
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
    domains, and contextual text snippets with high speed and reliability.
    """
    name: str = "web_search"
    description: str = (
        "Search the live web for verified factual information, news, specifications, and data. "
        "Input parameter: 'query' (string). Optional: 'max_results' (int, default 5)."
    )

    def __init__(self, timeout: float = 5.0):
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
        # In-memory query cache for zero-latency repeats
        self._cache: Dict[str, ToolResult] = {}
        # Persistent client with connection pooling
        self._client: Optional[httpx.Client] = None

    def _get_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(
                timeout=self.timeout,
                follow_redirects=True,
                headers=self.headers,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            )
        return self._client

    def _parse_ddg_lite(self, html: str, max_results: int) -> List[Dict[str, Any]]:
        """Fast, robust extraction from DuckDuckGo Lite table layout."""
        results: List[Dict[str, Any]] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        # Matches result links regardless of attribute ordering or quotes
        links = re.findall(
            r'<a\s+[^>]*?href=[\'"]([^\'"]+)[\'"][^>]*?class=[\'"]result-link[\'"][^>]*>(.*?)</a>|'
            r'<a\s+[^>]*?class=[\'"]result-link[\'"][^>]*?href=[\'"]([^\'"]+)[\'"][^>]*>(.*?)</a>',
            html,
            re.DOTALL,
        )
        snippets = re.findall(r'<td[^>]+class=[\'"]result-snippet[\'"][^>]*>(.*?)</td>', html, re.DOTALL)

        for idx, match in enumerate(links[:max_results]):
            raw_url = match[0] or match[2]
            title_html = match[1] or match[3]
            if not raw_url:
                continue

            title = unescape(re.sub(r'<[^>]+>', '', title_html).strip())
            # Unquote DuckDuckGo redirect wrapper
            if "uddg=" in raw_url:
                parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                if "uddg" in parsed:
                    raw_url = parsed["uddg"][0]

            snippet = ""
            if idx < len(snippets):
                snippet = unescape(re.sub(r'<[^>]+>', '', snippets[idx]).strip())

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

    def _parse_ddg_html(self, html: str, max_results: int) -> List[Dict[str, Any]]:
        """Fallback parser for standard HTML layout."""
        results: List[Dict[str, Any]] = []
        now_iso = datetime.now(timezone.utc).isoformat()
        blocks = re.findall(r'<div class="[^"]*result results_links[^"]*".*?</div>\s*</div>\s*</div>', html, re.DOTALL)
        if not blocks:
            blocks = re.findall(r'<div class="result__body">.*?</div>', html, re.DOTALL)

        for b in blocks[:max_results]:
            url_match = re.search(r'<a class="result__url"[^>]*href="([^"]+)"', b)
            title_match = re.search(r'<a class="result__snippet[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', b)
            if not title_match:
                title_match = re.search(r'<a class="result__a"[^>]*>(.*?)</a>', b)
            snippet_match = re.search(r'<a class="result__snippet"[^>]*>(.*?)</a>', b)
            if not snippet_match:
                snippet_match = re.search(r'class="result__snippet"[^>]*>(.*?)</', b, re.DOTALL)

            raw_url = url_match.group(1).strip() if url_match else None
            if not raw_url and title_match:
                link_tag = re.search(r'href="([^"]+)"', b)
                if link_tag:
                    raw_url = link_tag.group(1).strip()

            if not raw_url:
                continue

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

        return results

    def execute(self, **kwargs) -> ToolResult:
        query = " ".join(kwargs.get("query", "").split()).strip()
        max_results = int(kwargs.get("max_results", 5))

        if not query:
            return ToolResult(success=False, error="Search query cannot be empty.")

        # Cache check for sub-millisecond retrieval
        cache_key = f"{query.lower()}:{max_results}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        start_time = time.perf_counter()
        client = self._get_client()

        # Primary: High-speed DuckDuckGo Lite endpoint (~1s latency)
        try:
            resp = client.post(
                "https://lite.duckduckgo.com/lite/",
                data={"q": query},
            )
            if resp.status_code == 200:
                results = self._parse_ddg_lite(resp.text, max_results)
                if results:
                    latency = time.perf_counter() - start_time
                    tool_res = ToolResult(success=True, data=results, execution_time_seconds=round(latency, 3))
                    self._cache[cache_key] = tool_res
                    return tool_res
        except Exception:
            pass

        # Fallback: Standard HTML endpoint
        try:
            resp = client.post(
                "https://html.duckduckgo.com/html/",
                data={"q": query},
            )
            if resp.status_code == 200:
                results = self._parse_ddg_html(resp.text, max_results)
                if results:
                    latency = time.perf_counter() - start_time
                    tool_res = ToolResult(success=True, data=results, execution_time_seconds=round(latency, 3))
                    self._cache[cache_key] = tool_res
                    return tool_res
        except Exception:
            pass

        latency = time.perf_counter() - start_time
        return ToolResult(
            success=False,
            error=f"No search results found for query: '{query}'",
            execution_time_seconds=round(latency, 3),
        )
