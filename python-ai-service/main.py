from fastapi import FastAPI
from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class GenerateRequest(BaseModel):
    messages: list[Message] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    text: str

app = FastAPI(title="Galaxy OS AI Core")


@app.get("/health")
async def health():
    return {"status": "AI Core Online"}


@app.post("/api/generate", response_model=GenerateResponse)
async def generate(payload: GenerateRequest):
    last_user_message = ""
    for message in reversed(payload.messages):
        if message.role == "user":
            last_user_message = message.content
            break

    if last_user_message:
        return {"text": f"Mock AI response: {last_user_message}"}

    return {"text": "Mock AI response: Ready to help."}
