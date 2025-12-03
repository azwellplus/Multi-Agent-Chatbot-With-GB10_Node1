"""Web search MCP server backed by SerpAPI."""
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_community.utilities import SerpAPIWrapper
from mcp.server.fastmcp import FastMCP

# Load environment variables from .env file
load_dotenv()

mcp = FastMCP("web-search")


def _get_api_key() -> str:
    """Retrieve SerpAPI key from environment."""
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "SERPAPI_API_KEY environment variable is not set. "
            "Please provide a valid SerpAPI key before using the web search tool."
        )
    return api_key


SERPAPI_API_KEY = _get_api_key()


def _build_wrapper(num_results: int) -> SerpAPIWrapper:
    """Create a SerpAPI wrapper with per-request parameters."""
    params = {"engine": "google", "num": num_results}
    return SerpAPIWrapper(serpapi_api_key=SERPAPI_API_KEY, params=params)


def _format_results(raw_results: List[Dict[str, Any]]) -> str:
    """Convert SerpAPI search results to a readable string."""
    if not raw_results:
        return "No results found."

    lines = []
    for idx, item in enumerate(raw_results, start=1):
        title = item.get("title") or "Untitled result"
        link = item.get("link") or item.get("url") or "No URL available"
        snippet = item.get("snippet") or item.get("snippet_highlighted") or ""
        lines.append(f"{idx}. {title}\n   URL: {link}\n   Snippet: {snippet}".strip())

    return "\n\n".join(lines)


@mcp.tool()
def web_search(query: str, *, num_results: int = 5) -> str:
    """Execute a web search using SerpAPI (Google engine).

    Args:
        query: Search keywords.
        num_results: Maximum number of organic results to return (default: 5).

    Returns:
        A formatted string containing search results and snippets.
    """
    print(f"[web_search] Received query: {query}, num_results: {num_results}")

    if not query or not query.strip():
        raise ValueError("Query must be a non-empty string.")

    if num_results <= 0:
        raise ValueError("num_results must be greater than zero.")

    try:
        print(f"[web_search] Building SerpAPI wrapper...")
        wrapper = _build_wrapper(num_results)
        print(f"[web_search] Executing search query: {query}")
        raw = wrapper.results(query)
        print(f"[web_search] Raw results type: {type(raw)}")
        organic_results = raw.get("organic_results", []) if isinstance(raw, dict) else raw
        print(f"[web_search] Found {len(organic_results)} organic results")
        formatted = _format_results(organic_results[:num_results])
        print(f"[web_search] Formatted result length: {len(formatted)}")
        return formatted
    except Exception as error:
        print(f"[web_search] ERROR: {error}")
        import traceback
        traceback.print_exc()
        raise RuntimeError(f"SerpAPI search failed: {error}") from error


if __name__ == "__main__":
    print(f"Starting {mcp.name} MCP server...")
    mcp.run(transport="stdio")
