from fastapi import FastAPI

app = FastAPI(title="Galaxy OS AI Core")


@app.get("/health")
async def health():
    return {"status": "AI Core Online"}
