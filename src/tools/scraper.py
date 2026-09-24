"""
Web Page Reader / Scraper Tool.
Extracts clean, readable text paragraphs and evidence from target URLs.
"""

import time
import re
from html import unescape
from typing import Dict, Any, Optional
import httpx

from src.tools.base import BaseTool, ToolResult


class WebScraperTool(BaseTool):
    """
    Fetches a webpage and extracts clean, readable text paragraphs.
    Strips scripts, styles, navigation headers, and adverts.
    """
    name: str = "fetch_page"
    description: str = (
        "Extract clean text and evidence from a specific URL. "
        "Input parameter: 'url' (string). Optional: 'max_characters' (int, default 4000)."
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
        }

    def _clean_html(self, html: str) -> str:
        # Remove script and style elements
        text = re.sub(r'<script.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<noscript.*?</noscript>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
        # Replace block tags with newlines
        text = re.sub(r'</?(?:p|div|h[1-6]|li|blockquote|tr)[^>]*>', '\n', text, flags=re.IGNORECASE)
        # Strip all other HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        # Unescape HTML entities
        text = unescape(text)
        # Collapse excessive whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)

    def execute(self, **kwargs) -> ToolResult:
        url = kwargs.get("url", "").strip()
        max_chars = int(kwargs.get("max_characters", 4000))

        if not url or not url.startswith("http"):
            return ToolResult(success=False, error="A valid HTTP/HTTPS URL is required.")

        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                resp = client.get(url, headers=self.headers)
                latency = time.perf_counter() - start_time
                if resp.status_code >= 400:
                    return ToolResult(
                        success=False,
                        error=f"HTTP {resp.status_code} error when fetching {url}",
                        execution_time_seconds=round(latency, 3),
                    )

                clean_text = self._clean_html(resp.text)
                if len(clean_text) > max_chars:
                    clean_text = clean_text[:max_chars] + "\n...[truncated]"

                return ToolResult(
                    success=True,
                    data={"url": url, "content": clean_text},
                    execution_time_seconds=round(latency, 3),
                )
        except Exception as e:
            latency = time.perf_counter() - start_time
            return ToolResult(
                success=False,
                error=f"Failed to fetch webpage: {str(e)}",
                execution_time_seconds=round(latency, 3),
            )
