import os

import pytest
import requests


def test_healthcheck_url_is_available():
    _require_backend()
    base_url = "http://localhost:8080/api"
    response = requests.get(f"{base_url}/helloECS", timeout=15)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload, dict)
    assert "status" in payload


def _require_backend() -> None:
    try:
        requests.get("http://localhost:8080/api/helloECS", timeout=3)
    except requests.RequestException as exc:
        pytest.skip(f"Backend not reachable on localhost:8080 ({exc})")

