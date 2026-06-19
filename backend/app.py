from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

class BugRequest(BaseModel):
    description: str


@app.post("/generate-bug-report")
def generate_bug_report(request: BugRequest):

    prompt = f"""
You are a Senior QA Lead.

Return ONLY a valid JSON object.

Do not use markdown.
Do not use ```json.
Do not add explanations.

{{
  "component":"",
  "issue":"",
  "severity":"",
  "priority":"",
  "bug_type":"",
  "short_summary":"",
  "root_cause":"",
  "test_cases":[]
}}

Bug Description:
{request.description}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    clean_text = response.text.strip()

    if clean_text.startswith("```json"):
        clean_text = clean_text.replace("```json", "").replace("```", "").strip()

    return json.loads(clean_text)