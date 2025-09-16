# search_tool.py
import os
import requests
from googleapiclient.discovery import build
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

def search_mit_ocw(query: str):
    """
    Uses Google Custom Search to search site:ocw.mit.edu.
    """
    try:
        if not GOOGLE_API_KEY or not SEARCH_ENGINE_ID:
            return []
        service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)
        res = service.cse().list(q=query, cx=SEARCH_ENGINE_ID, num=2).execute()
        results = []
        for item in res.get("items", []):
            results.append({
                "title": item.get("title"),
                "link": item.get("link")
            })
        return results
    except Exception as e:
        print("OCW search error:", e)
        return []

def search_youtube(query: str, max_results: int = 2):
    """
    Uses YouTube Data API to return title, link, and thumbnail.
    """
    try:
        if not YOUTUBE_API_KEY:
            return []
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "order": "viewCount",
            "maxResults": max_results,
            "key": YOUTUBE_API_KEY
        }
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        results = []
        for item in data.get("items", []):
            vid = item["id"].get("videoId")
            snippet = item.get("snippet", {})
            thumbnails = snippet.get("thumbnails", {})
            thumb_url = thumbnails.get("medium", thumbnails.get("default", {})).get("url")
            results.append({
                "title": snippet.get("title"),
                "link": f"https://www.youtube.com/watch?v={vid}" if vid else None,
                "thumbnail": thumb_url
            })
        return results
    except Exception as e:
        print("YouTube search error:", e)
        return []
