from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client= TestClient(app)

def test_health():
    response= client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_login_invalid_credentials():
    mock_supabase= MagicMock()
    mock_supabase.auth.sign_in_with_password.return_value= MagicMock(session=None)

    with patch("app.routers.auth.get_supabase", return_value=mock_supabase):
        response= client.post("/auth/login",
                              json={"email": "nobody@example.com", "password": "wrongpassword"}
                              )
        
    assert response.status_code == 401