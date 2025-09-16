# main.py
import os
import json
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from search_tool import search_mit_ocw, search_youtube

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment")
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="AI Tutor Backend")

# Allow React dev server origin
origins = [
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory cache for resources to save API calls (keyed by subtopic)
_resource_cache = {}

class TopicRequest(BaseModel):
    topics: str

def parse_subtopics_from_text(text: str, max_subtopics: int = 7):
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    subtopics = []
    for line in lines:
        # remove numbering/bullets like "1. ", "- ", "a) "
        cleaned = line
        if cleaned and (cleaned[0].isdigit() or cleaned[0] in "-•*"):
            # drop leading numbering/bullet tokens
            cleaned = cleaned.lstrip("-•*0123456789. )")
        # sometimes LLM outputs "Subtopic: name" -> try split
        if ":" in cleaned and len(cleaned.split(":")) <= 2:
            cleaned = cleaned.split(":", 1)[-1].strip()
        if cleaned:
            subtopics.append(cleaned)
        if len(subtopics) >= max_subtopics:
            break
    return subtopics

@app.post("/generate-learning-plan")
async def generate_learning_plan(payload: TopicRequest):
    topic = payload.topics.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="No topics provided")

    # Prompt: ask for 5-7 high-level subtopics only (keeps API usage bounded)
    prompt = (
        f"You are an expert tutor. Break down the topic '{topic}' into 5 to 7 "
        "high-level subtopics suitable for a beginner-to-intermediate learner. "
        "Return only the subtopic titles, one per line and as per the conventional sequence in which they are studied, and do not add any extra text."
    )
    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        resp = model.generate_content(prompt)
        text = resp.text or ""
        subtopics = parse_subtopics_from_text(text, max_subtopics=7)
        if not subtopics:
            raise Exception("LLM returned no subtopics")
        # return simple JSON with titles only (frontend will lazily fetch resources)
        return JSONResponse({"subtopics": [{"title": s} for s in subtopics]})
    except Exception as e:
        print("LLM error:", e)
        raise HTTPException(status_code=500, detail="Failed to generate subtopics")

@app.get("/resources")
def get_resources(subtopic: str = Query(..., min_length=1)):
    key = subtopic.strip().lower()
    if key in _resource_cache:
        return JSONResponse(_resource_cache[key])

    # fetch MIT OCW and YouTube (2 videos)
    try:
        ocw = search_mit_ocw(f"{subtopic} site:ocw.mit.edu")
        yt = search_youtube(f"learn {subtopic}", max_results=2)
        payload = {
            "subtopic": subtopic,
            "mit": ocw[0] if ocw else {"title": "No OCW result", "link": None},
            "mit_extra": ocw[1:] if len(ocw) > 1 else [],
            "youtube": yt
        }
        # cache it
        _resource_cache[key] = payload
        return JSONResponse(payload)
    except Exception as e:
        print("resource fetch error:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch resources")
