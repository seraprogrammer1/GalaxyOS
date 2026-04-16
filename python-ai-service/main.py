import os
import json as _json
import re
import httpx
from contextlib import asynccontextmanager
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

# ---------------------------------------------------------------------------
# Character generation system prompts — loaded once at startup
# ---------------------------------------------------------------------------
_PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")

def _load_prompt(filename: str) -> str:
    path = os.path.join(_PROMPTS_DIR, filename)
    if not os.path.exists(path):
        raise RuntimeError(f"Missing required prompt file: {path}")
    with open(path, encoding="utf-8") as f:
        return f.read().strip()

PROMPT_SANITIZE        = _load_prompt("char_gen_sanitize.txt")
PROMPT_FILL            = _load_prompt("char_gen_fill.txt")
PROMPT_FILL_FALLBACK   = _load_prompt("char_gen_fill_fallback.txt")
PROMPT_LOREBOOK        = _load_prompt("lorebook_gen.txt")

# Tool Gemini exposes to Chub during sanitize loop
_GEMINI_TOOL_DECL: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "call_gemini",
            "description": (
                "Look up encyclopedic or factual background on a character, person, place, "
                "franchise, or concept. Use this when you need context you do not already know."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The knowledge query to send to Gemini.",
                    }
                },
                "required": ["prompt"],
            },
        },
    }
]


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


class CharGenRequest(BaseModel):
    description: str
    generate_lorebook: bool = False
    chub_model: str = "mythomax"
    gemini_model: str = "gemini-2.5-flash"


@asynccontextmanager
async def lifespan(app: FastAPI):
    from db import connect_db, close_db
    from models.plaid_item import PlaidItem
    from models.session import Session
    await connect_db([PlaidItem, Session])
    yield
    await close_db()


app = FastAPI(title="Galaxy OS AI Core", lifespan=lifespan)

from routes.plaid import router as plaid_router
app.include_router(plaid_router)


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

    # Gemini requires the first contents entry to have role 'user'.
    # Character greetings are 'assistant' turns that appear before any user
    # message, so insert a silent start marker when that happens.
    # Also covers the empty-history case (idx=0 variant regeneration).
    if not contents or contents[0]["role"] != "user":
        contents.insert(0, {"role": "user", "parts": [{"text": "[Start of story]"}]})

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

    # OpenAI-compat APIs reject consecutive same-role messages.
    # Merge them so the conversation always strictly alternates.
    merged: list[dict] = []
    for m in messages:
        if merged and merged[-1]["role"] == m.role:
            merged[-1]["content"] += "\n\n" + m.content
        else:
            merged.append({"role": m.role, "content": m.content})

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            url,
            headers={"Authorization": f"Bearer {CHUB_API_KEY}"},
            json={"model": model, "messages": merged},
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


# ---------------------------------------------------------------------------
# Helpers for character generation
# ---------------------------------------------------------------------------

def _strip_json_fences(text: str) -> str:
    """Strip markdown code fences from a string and return the inner content."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def _gemini_knowledge_lookup(prompt: str, model: str) -> str:
    """Lightweight Gemini call used as a tool by Chub. Never raises — returns error text on failure."""
    if not GEMINI_API_KEY:
        return "[Gemini unavailable: API key not configured]"
    try:
        if model not in VALID_GEMINI_MODELS:
            model = "gemini-2.5-flash"
        url = GEMINI_URL_TEMPLATE.format(model=model)
        body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, params={"key": GEMINI_API_KEY}, json=body)
        if r.status_code != 200:
            return f"[Gemini lookup failed: {r.status_code}]"
        data = r.json()
        # Check for safety block on output
        candidate = data.get("candidates", [{}])[0]
        if candidate.get("finishReason") == "SAFETY":
            return "[Gemini declined to answer this query]"
        return candidate["content"]["parts"][0]["text"]
    except Exception as exc:
        return f"[Gemini lookup error: {exc}]"


async def _chub_sanitize_loop(description: str, chub_model: str, gemini_model: str) -> str:
    """
    Run the Chub orchestration loop with Gemini as a callable tool.
    Returns the cleaned character context string.
    Raises RuntimeError with a stage label on fatal failure.
    """
    if not CHUB_API_KEY:
        raise _err("sanitize", "CHUB_API_KEY not configured")

    url = CHUB_URLS.get(chub_model, CHUB_URLS["mythomax"])
    messages: list[dict] = [
        {"role": "system", "content": PROMPT_SANITIZE},
        {"role": "user", "content": description},
    ]

    max_rounds = 5
    for round_num in range(max_rounds + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                url,
                headers={"Authorization": f"Bearer {CHUB_API_KEY}"},
                json={"model": chub_model, "messages": messages, "tools": _GEMINI_TOOL_DECL},
            )

        if r.status_code != 200:
            raise _err("sanitize", r.text, "chub", r.status_code)

        data = r.json()
        choice = data.get("choices", [{}])[0]
        msg = choice.get("message", {})
        finish_reason = choice.get("finish_reason", "")

        tool_calls = msg.get("tool_calls") or []

        if not tool_calls or finish_reason == "stop":
            # Chub returned final text
            content = msg.get("content") or ""
            if not content.strip():
                raise _err("sanitize", "Chub returned empty context", "chub")
            # Strip the END marker if present
            content = re.sub(r"\s*\bEND\b\s*$", "", content.strip())
            return content

        if round_num >= max_rounds:
            raise _err("sanitize-loop", "Chub tool-call loop exceeded 5 rounds", "chub")

        # Append assistant message with tool calls, then resolve each tool call
        messages.append({"role": "assistant", "content": msg.get("content"), "tool_calls": tool_calls})

        for tc in tool_calls:
            tc_id = tc.get("id", "")
            fn_name = tc.get("function", {}).get("name", "")
            try:
                args = _json.loads(tc.get("function", {}).get("arguments", "{}"))
            except _json.JSONDecodeError:
                args = {}

            if fn_name == "call_gemini":
                result = await _gemini_knowledge_lookup(args.get("prompt", ""), gemini_model)
            else:
                result = f"[Unknown tool: {fn_name}]"

            messages.append({"role": "tool", "tool_call_id": tc_id, "content": result})

    raise RuntimeError("sanitize-loop|Chub tool-call loop exceeded 5 rounds")


def _err(stage: str, detail: str, provider: str = "", upstream_status: int | str = "") -> RuntimeError:
    """Build a structured RuntimeError: stage|provider|upstream_status|detail"""
    return RuntimeError(f"{stage}|{provider}|{upstream_status}|{detail}")


def _parse_err(exc: RuntimeError) -> dict:
    """
    Parse a structured RuntimeError into a JSON-serialisable dict.
    Fields: stage, provider, upstream_status (int|None), detail, error (human label).
    """
    raw = str(exc)
    parts = raw.split("|", 3)
    stage  = parts[0] if len(parts) > 0 else "unknown"
    provider = parts[1] if len(parts) > 1 and parts[1] else None
    upstream_status_raw = parts[2] if len(parts) > 2 else ""
    detail = parts[3] if len(parts) > 3 else raw

    upstream_status: int | None = None
    if upstream_status_raw.isdigit():
        upstream_status = int(upstream_status_raw)

    out: dict = {"stage": stage, "detail": detail, "error": detail}
    if provider:
        out["provider"] = provider
    if upstream_status is not None:
        out["upstream_status"] = upstream_status
    return out


def _check_gemini_safety(data: dict) -> None:
    """Raise RuntimeError('safety') if Gemini blocked the response."""
    # Input blocked
    block_reason = data.get("promptFeedback", {}).get("blockReason")
    if block_reason:
        raise _err("safety", f"Gemini input blocked: {block_reason}", "gemini")
    # Output blocked
    candidates = data.get("candidates", [])
    if candidates and candidates[0].get("finishReason") == "SAFETY":
        raise _err("safety", "Gemini output blocked by safety filter", "gemini")


async def _gemini_json_pass(system_prompt: str, user_content: str, model: str) -> dict:
    """
    Call Gemini with a system prompt + user content; parse and return the JSON dict.
    Raises RuntimeError with stage prefix 'safety' or 'parse' on failure.
    """
    if model not in VALID_GEMINI_MODELS:
        model = "gemini-2.5-flash"
    url = GEMINI_URL_TEMPLATE.format(model=model)
    body = {
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "system_instruction": {"parts": [{"text": system_prompt}]},
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(url, params={"key": GEMINI_API_KEY}, json=body)

    if r.status_code in (429, 503):
        raise _err("fill-unavailable", r.text, "gemini", r.status_code)
    if r.status_code != 200:
        raise _err("fill", r.text, "gemini", r.status_code)

    data = r.json()
    _check_gemini_safety(data)

    try:
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise _err("fill", f"Unexpected Gemini response shape: {data}", "gemini") from exc

    try:
        return _json.loads(_strip_json_fences(raw_text))
    except _json.JSONDecodeError as exc:
        raise _err("fill-parse", f"JSON parse failed: {exc}\n\nRaw output:\n{raw_text}", "gemini") from exc


async def _chub_json_pass(system_prompt: str, user_content: str, chub_model: str) -> dict:
    """
    Fallback: call Chub with a system prompt + user content; parse and return the JSON dict.
    Raises RuntimeError with stage prefix on failure.
    """
    url = CHUB_URLS.get(chub_model, CHUB_URLS["mythomax"])
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            url,
            headers={"Authorization": f"Bearer {CHUB_API_KEY}"},
            json={"model": chub_model, "messages": messages},
        )
    if r.status_code != 200:
        raise _err("fill", r.text, "chub", r.status_code)
    data = r.json()
    try:
        raw_text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise _err("fill", f"Unexpected Chub response shape: {data}", "chub") from exc
    try:
        return _json.loads(_strip_json_fences(raw_text))
    except _json.JSONDecodeError as exc:
        raise _err("fill-parse", f"JSON parse failed: {exc}\n\nRaw output:\n{raw_text}", "chub") from exc


# ---------------------------------------------------------------------------
# POST /api/characters/generate
# ---------------------------------------------------------------------------

@app.post("/api/characters/generate")
async def generate_character(payload: CharGenRequest):
    if not payload.description.strip():
        return JSONResponse(status_code=400, content={"error": "description is required", "stage": "input"})

    # ── Step A: Chub orchestration loop ──────────────────────────────────────
    try:
        context = await _chub_sanitize_loop(
            payload.description, payload.chub_model, payload.gemini_model
        )
    except RuntimeError as exc:
        return JSONResponse(status_code=502, content=_parse_err(exc))

    # ── Step B: Gemini fill pass (Chub fallback if Gemini blocks) ────────────
    character_data: dict = {}
    fill_stage_error: str | None = None

    if GEMINI_API_KEY:
        try:
            character_data = await _gemini_json_pass(PROMPT_FILL, context, payload.gemini_model)
        except RuntimeError as exc:
            parsed = _parse_err(exc)
            if parsed["stage"] in ("safety", "fill-unavailable"):
                # Gemini blocked or temporarily unavailable — fall through to Chub fallback
                fill_stage_error = parsed["detail"]
            else:
                return JSONResponse(status_code=422, content=parsed)

    if not character_data:
        # Either Gemini blocked or no Gemini API key — try Chub fallback
        if not CHUB_API_KEY:
            return JSONResponse(
                status_code=502,
                content={
                    "stage": "fill",
                    "provider": "gemini",
                    "detail": fill_stage_error or "Gemini blocked output",
                    "error": "CHUB_API_KEY is not configured — cannot fall back",
                },
            )
        try:
            character_data = await _chub_json_pass(PROMPT_FILL_FALLBACK, context, payload.chub_model)
        except RuntimeError as exc:
            return JSONResponse(status_code=422, content=_parse_err(exc))

    # ── Step C: Optional lorebook (non-fatal) ────────────────────────────────
    lorebook: dict | None = None
    lorebook_skipped = False

    if payload.generate_lorebook:
        try:
            entries = await _gemini_json_pass(PROMPT_LOREBOOK, context, payload.gemini_model)
            if isinstance(entries, list):
                char_name = character_data.get("name") or "Character"
                lorebook = {"title": f"{char_name} Lorebook", "entries": entries}
            else:
                lorebook_skipped = True
        except RuntimeError:
            lorebook_skipped = True

    result: dict = {"character": character_data}
    if payload.generate_lorebook:
        result["lorebook"] = lorebook
        if lorebook_skipped:
            result["lorebook_skipped"] = True

    return result

