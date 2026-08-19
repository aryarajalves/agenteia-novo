import pytest
import io
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_upload_followup_media_endpoint():
    file_content = b"fake audio content"
    file_obj = io.BytesIO(file_content)
    
    response = client.post(
        "/webhooks/upload-media",
        files={"file": ("test_audio.mp3", file_obj, "audio/mpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["filename"] == "test_audio.mp3"
    assert "/uploads/media_followup_" in data["url"]
    assert data["url"].endswith(".mp3")
