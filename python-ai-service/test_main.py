from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_generate_returns_text_for_messages_payload() -> None:
    response = client.post(
        "/api/generate",
        json={
            "messages": [
                {"role": "system", "content": "You are helpful."},
                {"role": "user", "content": "Hello AI"},
            ]
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("text"), str)
    assert body["text"] == "Mock AI response: Hello AI"


def test_generate_rejects_invalid_payload_shape() -> None:
    response = client.post(
        "/api/generate",
        json={"messages": [{"role": "user"}]},
    )

    assert response.status_code == 422
