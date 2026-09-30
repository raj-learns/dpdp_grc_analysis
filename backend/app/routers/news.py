"""
DPDP-related news, aggregated from Google News RSS search results (no API
key required). This is a convenience feed for staying current - not an
official government source, and not something the compliance calculations
anywhere else in this app depend on. Results are cached in-memory for
CACHE_TTL to avoid hammering Google on every page load; a stale/failed fetch
falls back to whatever was last cached rather than showing nothing.
"""
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

from fastapi import APIRouter, Depends
from ..auth import get_current_user

router = APIRouter(prefix="/api/news", tags=["News"], dependencies=[Depends(get_current_user)])

FEED_QUERIES = [
    '"DPDP Act" OR "Digital Personal Data Protection" OR "DPDP Rules" India',
    '"Data Protection Board of India"',
]

CACHE_TTL = timedelta(minutes=20)
_cache: dict = {"items": [], "fetched_at": None, "error": None}


def _fetch_feed(query: str) -> list[dict]:
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({
        "q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en",
    })
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; DPDP-GRC-tracker/1.0)"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = resp.read()
    root = ET.fromstring(data)

    items = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        if not title or not link:
            continue
        pub_date_raw = item.findtext("pubDate")
        try:
            pub_date = parsedate_to_datetime(pub_date_raw) if pub_date_raw else None
        except (TypeError, ValueError):
            pub_date = None
        source_el = item.find("source")
        source = source_el.text.strip() if source_el is not None and source_el.text else None
        items.append({
            "title": title,
            "link": link,
            "source": source,
            "published_at": pub_date.isoformat() if pub_date else None,
        })
    return items


def _refresh_cache() -> None:
    all_items: list[dict] = []
    seen: set[str] = set()
    error = None
    for query in FEED_QUERIES:
        try:
            for item in _fetch_feed(query):
                key = re.sub(r"\W+", "", item["title"].lower())[:80]
                if key in seen:
                    continue
                seen.add(key)
                all_items.append(item)
        except Exception as e:  # noqa: BLE001 - external network call, degrade gracefully
            error = f"Could not refresh news: {e}"

    all_items.sort(key=lambda i: i["published_at"] or "", reverse=True)
    if all_items or _cache["fetched_at"] is None:
        _cache["items"] = all_items[:40]
    _cache["fetched_at"] = datetime.utcnow()
    _cache["error"] = error if not all_items else None


@router.get("")
def get_news(force_refresh: bool = False):
    stale = _cache["fetched_at"] is None or (datetime.utcnow() - _cache["fetched_at"]) > CACHE_TTL
    if stale or force_refresh:
        _refresh_cache()
    return {
        "items": _cache["items"],
        "fetched_at": _cache["fetched_at"].isoformat() if _cache["fetched_at"] else None,
        "error": _cache["error"],
        "disclaimer": (
            "Aggregated from Google News search results for convenience - not an official "
            "government feed, and not used in any compliance calculation elsewhere in this app. "
            "Verify anything material against the primary source."
        ),
    }

@router.get("/refresh")
def refresh_news():
    """This api is designed for the refresh method of the news page. Use it with precautions"""
    _refresh_cache()
    return {
        "items": _cache["items"],
        "details": {
            "fetched_at" : datetime.utcnow().isoformat(),
            "error": _cache["error"],
            "status": "success",
        },
        "design_principles": "To be decided by the GRC team",
        "Responsible": "Sathvik dayanand Shetty, Raj Shrivastav, Anmol Chandra Mathur and other members of the DPDP GRC team",
        }