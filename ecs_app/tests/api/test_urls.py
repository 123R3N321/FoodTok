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


def test_auth_signup_creates_user():
    _require_backend()
    email = f"smoke-signup+{uuid.uuid4().hex}@example.com"
    payload = {
        "email": email,
        "password": "Pass!123",
        "firstName": "Signup",
        "lastName": "Tester",
    }
    response = requests.post(f"{BASE_URL}/auth/signup", json=payload, timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 201, response.text
    body = response.json()
    assert isinstance(body, dict)
    assert "user" in body
    assert body["user"]["email"] == email


def test_auth_preferences_updates_profile():
    _require_backend()
    email = f"smoke-pref+{uuid.uuid4().hex}@example.com"
    password = "Pass!123"
    signup_payload = {
        "email": email,
        "password": password,
        "firstName": "Pref",
        "lastName": "Tester",
    }
    signup_response = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload, timeout=DEFAULT_TIMEOUT)
    assert signup_response.status_code == 201, signup_response.text
    user_id = signup_response.json()["user"]["id"]

    update_payload = {
        "userId": user_id,
        "preferences": {
            "cuisines": ["Thai", "Italian"],
            "dietaryRestrictions": ["Vegetarian"],
            "priceRange": [2, 3],
        },
        "firstName": "Updated",
    }
    response = requests.patch(f"{BASE_URL}/auth/preferences", json=update_payload, timeout=DEFAULT_TIMEOUT)
    assert response.status_code == 200, response.text
    body = response.json()
    assert "user" in body
    assert body["user"]["id"] == user_id
    assert body["user"]["firstName"] == "Updated"
    prefs = body["user"].get("preferences", {})
    assert prefs.get("cuisines") == update_payload["preferences"]["cuisines"]

    profile_response = requests.get(
        f"{BASE_URL}/auth/profile/{user_id}",
        timeout=DEFAULT_TIMEOUT,
    )
    assert profile_response.status_code == 200, profile_response.text
    profile_body = profile_response.json()
    assert "user" in profile_body
    assert profile_body["user"]["id"] == user_id
    assert profile_body["user"]["firstName"] == "Updated"


def test_auth_change_password_roundtrip():
    _require_backend()
    email = f"smoke-changepw+{uuid.uuid4().hex}@example.com"
    original_password = "Pass!123"
    new_password = "Pass!456"

    signup_payload = {
        "email": email,
        "password": original_password,
        "firstName": "Changer",
        "lastName": "Tester",
    }
    signup_response = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload, timeout=DEFAULT_TIMEOUT)
    assert signup_response.status_code == 201, signup_response.text
    user_id = signup_response.json()["user"]["id"]

    change_payload = {
        "userId": user_id,
        "currentPassword": original_password,
        "newPassword": new_password,
    }
    change_response = requests.post(
        f"{BASE_URL}/auth/change-password",
        json=change_payload,
        timeout=DEFAULT_TIMEOUT,
    )
    assert change_response.status_code == 200, change_response.text

    # ensure login works with new password
    login_payload = {"email": email, "password": new_password}
    login_response = requests.post(f"{BASE_URL}/auth/login", json=login_payload, timeout=DEFAULT_TIMEOUT)
    assert login_response.status_code == 200, login_response.text

    # change password back to original for cleanliness
    revert_payload = {
        "userId": user_id,
        "currentPassword": new_password,
        "newPassword": original_password,
    }
    revert_response = requests.post(
        f"{BASE_URL}/auth/change-password",
        json=revert_payload,
        timeout=DEFAULT_TIMEOUT,
    )
    assert revert_response.status_code == 200, revert_response.text


def _require_backend() -> None:
    try:
        requests.get("http://localhost:8080/api/helloECS", timeout=3)
    except requests.RequestException as exc:
        pytest.skip(f"Backend not reachable on localhost:8080 ({exc})")

