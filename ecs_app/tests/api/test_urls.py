import os
import uuid

import pytest
import requests

BASE_URL = os.getenv("FOODTOK_SMOKE_BASE_URL", "http://localhost:8080/api").rstrip("/")
DEFAULT_TIMEOUT = int(os.getenv("FOODTOK_SMOKE_REQUEST_TIMEOUT", "15"))


def test_healthcheck_url_is_available():
    _require_backend()
    response = requests.get(f"{BASE_URL}/helloECS", timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload, dict)
    assert "status" in payload


def test_auth_login_roundtrip():
    _require_backend()
    email = f"smoke+{uuid.uuid4().hex}@example.com"
    password = "Pass!123"

    signup_payload = {
        "email": email,
        "password": password,
        "firstName": "Smoke",
        "lastName": "Tester",
    }
    signup_response = requests.post(
        f"{BASE_URL}/auth/signup",
        json=signup_payload,
        timeout=DEFAULT_TIMEOUT,
    )
    assert signup_response.status_code == 201, signup_response.text

    login_payload = {"email": email, "password": password}
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_payload,
        timeout=DEFAULT_TIMEOUT,
    )
    assert login_response.status_code == 200, login_response.text
    body = login_response.json()
    assert isinstance(body, dict)
    assert "user" in body
    assert body["user"]["email"] == email


def _require_backend() -> None:
    try:
        requests.get("http://localhost:8080/api/helloECS", timeout=3)
    except requests.RequestException as exc:
        pytest.skip(f"Backend not reachable on localhost:8080 ({exc})")

