import os
import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

def _strip(val: str) -> str:
    return val.strip().strip('"').strip("'")

GEMINI_API_KEY = _strip(os.getenv("GEMINI_API_KEY", ""))
CHUB_API_KEY   = _strip(os.getenv("CHUB_API_KEY", ""))

GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

CHUB_URLS: dict[str, str] = {
    "mythomax": "https://mercury.chub.ai/mythomax/v1/chat/completions",
    "mixtral":  "https://mars.chub.ai/mixtral/v1/chat/completions",
    "asha":     "https://mars.chub.ai/chub/asha/v1/chat/completions",
    "gemma":    "https://mercury.chub.ai/gemma/v1/chat/completions",
}

VALID_GEMINI_MODELS = {
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
}

TIMEOUT = 60.0


class Message(BaseModel):
    role: str
    content: str


class GenerateRequest(BaseModel):
    messages: list[Message] = Field(default_factory=list)
    provider: str = "gemini"
    gemini_model: str = "gemini-2.5-flash"
    chub_model: str = "mythomax"


class GenerateResponse(BaseModel):
    text: str


app = FastAPI(title="Galaxy OS AI Core")


@app.get("/health")
async def health():
    return {"status": "AI Core Online"}


async def _call_gemini(messages: list[Message], model: str) -> str:
    if model not in VALID_GEMINI_MODELS:
        model = "gemini-2.5-flash"

    contents = []
    system_parts = []
    for m in messages:
        if m.role == "system":
            system_parts.append({"text": m.content})
        else:
            gemini_role = "model" if m.role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": m.content}]})

    body: dict = {"contents": contents}
    if system_parts:
        body["system_instruction"] = {"parts": system_parts}

    url = GEMINI_URL_TEMPLATE.format(model=model)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(url, params={"key": GEMINI_API_KEY}, json=body)

    if r.status_code != 200:
        raise RuntimeError(f"Gemini {r.status_code}: {r.text}")

    data = r.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Gemini response shape: {data}") from e


async def _call_chub(messages: list[Message], model: str) -> str:
    url = CHUB_URLS.get(model, CHUB_URLS["mythomax"])
    oai_messages = [{"role": m.role, "content": m.content} for m in messages]

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            url,
            headers={"Authorization": f"Bearer {CHUB_API_KEY}"},
            json={"model": model, "messages": oai_messages},
        )

    if r.status_code != 200:
        raise RuntimeError(f"Chub {r.status_code}: {r.text}")

    data = r.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Chub response shape: {data}") from e


@app.post("/api/generate", response_model=GenerateResponse)
async def generate(payload: GenerateRequest):
    provider = payload.provider.lower().strip()

    if provider == "gemini":
        if not GEMINI_API_KEY:
            return JSONResponse(status_code=502, content={"detail": "GEMINI_API_KEY not configured"})
        try:
            text = await _call_gemini(payload.messages, payload.gemini_model)
            return {"text": text}
        except Exception as e:
            return JSONResponse(status_code=502, content={"detail": str(e)})

    if provider == "chub":
        if not CHUB_API_KEY:
            return JSONResponse(status_code=502, content={"detail": "CHUB_API_KEY not configured"})
        try:
            text = await _call_chub(payload.messages, payload.chub_model)
            return {"text": text}
        except Exception as e:
            return JSONResponse(status_code=502, content={"detail": str(e)})

    return JSONResponse(status_code=400, content={"detail": f"Unknown provider: {provider!r}"})

