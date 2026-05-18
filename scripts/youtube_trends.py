#!/usr/bin/env python3
"""
Trendspotter — Daily YouTube Trends Pipeline
=============================================
Fetches the top 50 trending YouTube videos (US) and upserts them into Supabase.

Primary source : YouTube Data API v3
Fallback source: yt-dlp (no API key required)

Usage:
    python scripts/youtube_trends.py

Required environment variables:
    YOUTUBE_API_KEY          — YouTube Data API v3 key
    NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (bypasses RLS)
"""

import os
import sys
import json
import logging
import datetime
from typing import Optional

import requests
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("trendspotter")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
REGION_CODE = "US"
MAX_RESULTS = 50


# ---------------------------------------------------------------------------
# Trending Score
# ---------------------------------------------------------------------------
def calc_trending_score(view_count: int, like_count: int, comment_count: int) -> float:
    """(views * 0.5) + (likes * 2) + (comments * 5)"""
    return (view_count * 0.5) + (like_count * 2) + (comment_count * 5)


# ---------------------------------------------------------------------------
# Primary: YouTube Data API v3
# ---------------------------------------------------------------------------
def fetch_via_api(region_code: str = REGION_CODE, max_results: int = MAX_RESULTS) -> list[dict]:
    """Fetch trending videos using the YouTube Data API v3."""
    if not YOUTUBE_API_KEY:
        raise ValueError("YOUTUBE_API_KEY is not set")

    params = {
        "part": "snippet,statistics",
        "chart": "mostPopular",
        "regionCode": region_code,
        "maxResults": max_results,
        "key": YOUTUBE_API_KEY,
    }

    log.info("Fetching trending videos via YouTube Data API v3 (region=%s, max=%d)…", region_code, max_results)
    resp = requests.get(f"{YOUTUBE_API_BASE}/videos", params=params, timeout=30)
    resp.raise_for_status()

    items = resp.json().get("items", [])
    log.info("API returned %d videos", len(items))
    return [normalize_api_item(item) for item in items]


def normalize_api_item(item: dict) -> dict:
    stats = item.get("statistics", {})
    snippet = item.get("snippet", {})

    view_count = int(stats.get("viewCount", 0))
    like_count = int(stats.get("likeCount", 0))
    comment_count = int(stats.get("commentCount", 0))

    thumbnails = snippet.get("thumbnails", {})
    thumbnail_url = (
        thumbnails.get("high", {}).get("url")
        or thumbnails.get("medium", {}).get("url")
        or thumbnails.get("default", {}).get("url")
    )

    return {
        "video_id": item["id"],
        "title": snippet.get("title", ""),
        "channel_name": snippet.get("channelTitle", ""),
        "view_count": view_count,
        "like_count": like_count,
        "comment_count": comment_count,
        "published_at": snippet.get("publishedAt"),
        "thumbnail_url": thumbnail_url,
        "trending_score": calc_trending_score(view_count, like_count, comment_count),
        "has_sponsorship": False,
    }


# ---------------------------------------------------------------------------
# Fallback: yt-dlp
# ---------------------------------------------------------------------------
def fetch_via_ytdlp(region_code: str = REGION_CODE, max_results: int = MAX_RESULTS) -> list[dict]:
    """
    Fallback scraper using yt-dlp.
    Scrapes YouTube's trending page directly — no API key required.
    """
    try:
        import yt_dlp  # noqa: PLC0415
    except ImportError:
        raise ImportError("yt-dlp is not installed. Run: pip install yt-dlp")

    trending_url = f"https://www.youtube.com/feed/trending?gl={region_code}"
    log.info("Falling back to yt-dlp scraper (url=%s)…", trending_url)

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": "in_playlist",
        "playlistend": max_results,
        "skip_download": True,
    }

    videos = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(trending_url, download=False)
        entries = info.get("entries", []) if info else []

        for entry in entries[:max_results]:
            if not entry:
                continue
            video_id = entry.get("id") or entry.get("url", "").split("v=")[-1]
            if not video_id:
                continue

            view_count = int(entry.get("view_count") or 0)
            like_count = int(entry.get("like_count") or 0)
            comment_count = int(entry.get("comment_count") or 0)

            videos.append({
                "video_id": video_id,
                "title": entry.get("title", ""),
                "channel_name": entry.get("uploader") or entry.get("channel", ""),
                "view_count": view_count,
                "like_count": like_count,
                "comment_count": comment_count,
                "published_at": entry.get("upload_date"),  # YYYYMMDD string
                "thumbnail_url": entry.get("thumbnail"),
                "trending_score": calc_trending_score(view_count, like_count, comment_count),
                "has_sponsorship": False,
            })

    log.info("yt-dlp returned %d videos", len(videos))
    return videos


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------
def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upsert_trends(supabase: Client, videos: list[dict], date_fetched: str) -> int:
    """Upsert video records into the trends table. Returns number of rows upserted."""
    if not videos:
        log.warning("No videos to upsert")
        return 0

    rows = []
    for v in videos:
        rows.append({
            "video_id": v["video_id"],
            "title": v["title"],
            "channel_name": v["channel_name"],
            "view_count": v["view_count"],
            "like_count": v["like_count"],
            "comment_count": v["comment_count"],
            "trending_score": v["trending_score"],
            "published_at": v.get("published_at"),
            "thumbnail_url": v.get("thumbnail_url"),
            "date_fetched": date_fetched,
        })

    # Upsert on (video_id, date_fetched) to allow re-runs without duplicates
    result = (
        supabase.table("trends")
        .upsert(rows, on_conflict="video_id,date_fetched")
        .execute()
    )

    count = len(result.data) if result.data else len(rows)
    log.info("Upserted %d rows into trends table", count)
    return count


def log_error(supabase: Client, source: str, message: str, details: Optional[str] = None):
    """Log an error to the error_logs table in Supabase."""
    try:
        supabase.table("error_logs").insert({
            "source": source,
            "message": message[:500],
            "details": (details or "")[:2000],
            "created_at": datetime.datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        log.error("Failed to write to error_logs: %s", e)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
def run():
    log.info("=== Trendspotter Daily Pipeline Starting ===")
    date_fetched = datetime.date.today().isoformat()
    log.info("Date: %s", date_fetched)

    # Connect to Supabase
    try:
        supabase = get_supabase_client()
        log.info("Connected to Supabase")
    except Exception as e:
        log.critical("Cannot connect to Supabase: %s", e)
        sys.exit(1)

    videos = []
    source_used = "api"

    # --- Attempt 1: YouTube Data API v3 ---
    try:
        videos = fetch_via_api()
        source_used = "youtube_api_v3"
    except Exception as api_err:
        log.warning("YouTube API failed: %s", api_err)
        log_error(supabase, "youtube_api_v3", str(api_err))

        # --- Attempt 2: yt-dlp fallback ---
        log.info("Attempting yt-dlp fallback…")
        try:
            videos = fetch_via_ytdlp()
            source_used = "yt_dlp"
        except Exception as ytdlp_err:
            log.error("yt-dlp fallback also failed: %s", ytdlp_err)
            log_error(supabase, "yt_dlp", str(ytdlp_err))
            log.critical("Both data sources failed. Exiting.")
            sys.exit(1)

    log.info("Fetched %d videos via %s", len(videos), source_used)

    # --- Upsert to Supabase ---
    try:
        count = upsert_trends(supabase, videos, date_fetched)
        log.info("Pipeline complete. %d videos stored for %s.", count, date_fetched)
    except Exception as db_err:
        log.error("Database upsert failed: %s", db_err)
        log_error(supabase, "supabase_upsert", str(db_err), details=json.dumps({"date": date_fetched}))
        sys.exit(1)

    log.info("=== Pipeline Finished Successfully ===")


if __name__ == "__main__":
    run()
