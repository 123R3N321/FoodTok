"""Shared pytest fixtures for hitting the running FoodTok API via HTTP."""

from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path
from typing import Iterator

import pytest
import requests

PROJECT_ROOT = Path(__file__).resolve().parents[3]

DEFAULT_BASE_URL = "http://localhost:8080/api"
BASE_URL = os.getenv("FOODTOK_SMOKE_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
MANAGE_STACK = os.getenv("FOODTOK_SMOKE_MANAGE_STACK", "1").lower() not in {"0", "false", "no"}
WAIT_TIMEOUT = int(os.getenv("FOODTOK_SMOKE_WAIT_SECONDS", "240"))
POLL_INTERVAL = int(os.getenv("FOODTOK_SMOKE_POLL_INTERVAL", "4"))
BUILD_BEFORE_UP = os.getenv("FOODTOK_SMOKE_BUILD_STACK", "1").lower() not in {"0", "false", "no"}

BUILD_TARGET = os.getenv("FOODTOK_SMOKE_BUILD_TARGET", "backend-build")
UP_TARGET = os.getenv("FOODTOK_SMOKE_UP_TARGET", "backend-up")
DOWN_TARGET = os.getenv("FOODTOK_SMOKE_DOWN_TARGET", "backend-down")

SAMPLE_USER_ID = os.getenv("FOODTOK_SMOKE_USER_ID", "11111111-1111-1111-1111-111111111111")
SAMPLE_RESTAURANT_ID = os.getenv("FOODTOK_SMOKE_RESTAURANT_ID", "22222222-2222-2222-2222-222222222222")
SAMPLE_RESERVATION_ID = os.getenv(
    "FOODTOK_SMOKE_RESERVATION_ID", "aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
)


def _run_make(target: str) -> None:
    subprocess.run(["make", target], cwd=PROJECT_ROOT, check=True)


def _wait_for_api(url: str) -> None:
    deadline = time.time() + WAIT_TIMEOUT
    last_error: str | None = None

    while time.time() < deadline:
        try:
            resp = requests.get(url, timeout=5)
            if 200 <= resp.status_code < 300:
                return
            last_error = f"{resp.status_code} {resp.text[:200]}"
        except requests.RequestException as exc:
            last_error = str(exc)
        time.sleep(POLL_INTERVAL)

    raise RuntimeError(f"Backend API never became healthy ({last_error}).")


def _wait_for_seed_data(url: str) -> None:
    deadline = time.time() + WAIT_TIMEOUT

    while time.time() < deadline:
        try:
            resp = requests.get(url, timeout=10)
            if 200 <= resp.status_code < 300:
                data = resp.json()
                if isinstance(data, list) and data:
                    return
        except requests.RequestException:
            pass
        time.sleep(POLL_INTERVAL)

    raise RuntimeError("Restaurant seed data was not detected in time.")


@pytest.fixture(scope="session")
def api_base_url() -> Iterator[str]:
    if MANAGE_STACK:
        if BUILD_BEFORE_UP:
            _run_make(BUILD_TARGET)
        _run_make(UP_TARGET)

    _wait_for_api(f"{BASE_URL}/helloECS")
    _wait_for_seed_data(f"{BASE_URL}/restaurants")

    yield BASE_URL

    if MANAGE_STACK:
        _run_make(DOWN_TARGET)


@pytest.fixture(scope="session")
def http_client() -> Iterator[requests.Session]:
    with requests.Session() as session:
        session.headers.update({"Accept": "application/json"})
        yield session


@pytest.fixture(scope="session")
def sample_user_id() -> str:
    return SAMPLE_USER_ID


@pytest.fixture(scope="session")
def sample_restaurant_id() -> str:
    return SAMPLE_RESTAURANT_ID


@pytest.fixture(scope="session")
def sample_reservation_id() -> str:
    return SAMPLE_RESERVATION_ID

