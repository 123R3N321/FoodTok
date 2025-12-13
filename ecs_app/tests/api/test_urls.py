import os
import uuid

from datetime import datetime, timedelta
from typing import Any, Dict

import boto3
import pytest
import requests

BASE_URL = os.getenv("FOODTOK_SMOKE_BASE_URL", "http://localhost:8080/api").rstrip("/")
DEFAULT_TIMEOUT = int(os.getenv("FOODTOK_SMOKE_REQUEST_TIMEOUT", "15"))
DYNAMO_ENDPOINT = os.getenv("FOODTOK_SMOKE_DYNAMO_ENDPOINT", "http://localhost:8000")
DYNAMO_REGION = os.getenv("FOODTOK_SMOKE_DYNAMO_REGION", "us-east-1")
DYNAMO_KEY = os.getenv("FOODTOK_SMOKE_AWS_KEY", "test")
DYNAMO_SECRET = os.getenv("FOODTOK_SMOKE_AWS_SECRET", "test")
DDB_RESTAURANTS_TABLE = os.getenv("DDB_RESTAURANTS_TABLE", "Restaurants")
DDB_USERS_TABLE = os.getenv("DDB_USERS_TABLE", "Users")
DDB_RESERVATIONS_TABLE = os.getenv("DDB_RESERVATIONS_TABLE", "Reservations")
DDB_HOLDS_TABLE = os.getenv("DDB_HOLDS_TABLE", "Holds")


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


def test_favorites_endpoints_flow():
    _require_backend()
    email = f"smoke-fav+{uuid.uuid4().hex}@example.com"
    password = "Pass!123"
    restaurant_id = _ensure_restaurant_via_dynamo(
        {
            "restaurantId": f"smoke-rest-{uuid.uuid4().hex[:6]}",
            "name": "Favorites Smoke Test",
            "description": "Test restaurant for favorites flow",
            "cuisine": ["Smoke"],
            "priceRange": "$$",
        }
    )

    signup_payload = {
        "email": email,
        "password": password,
        "firstName": "Fav",
        "lastName": "Tester",
    }
    signup_response = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload, timeout=DEFAULT_TIMEOUT)
    assert signup_response.status_code == 201, signup_response.text
    user_id = signup_response.json()["user"]["id"]

    add_payload = {
        "userId": user_id,
        "restaurantId": restaurant_id,
        "restaurantName": "Favorites Smoke Test",
        "restaurantImage": "",
        "matchScore": 99,
    }
    add_response = requests.post(f"{BASE_URL}/favorites", json=add_payload, timeout=DEFAULT_TIMEOUT)
    assert add_response.status_code in (200, 201), add_response.text

    check_response = requests.get(
        f"{BASE_URL}/favorites/check",
        params={"userId": user_id, "restaurantId": restaurant_id},
        timeout=DEFAULT_TIMEOUT,
    )
    assert check_response.status_code == 200, check_response.text
    assert check_response.json().get("isFavorite") is True

    list_response = requests.get(f"{BASE_URL}/favorites/{user_id}", timeout=DEFAULT_TIMEOUT)
    assert list_response.status_code == 200, list_response.text
    favorites = list_response.json()
    assert isinstance(favorites, list)
    assert any(fav.get("restaurantId") == restaurant_id for fav in favorites)

    delete_response = requests.delete(
        f"{BASE_URL}/favorites",
        params={"userId": user_id, "restaurantId": restaurant_id},
        timeout=DEFAULT_TIMEOUT,
    )
    assert delete_response.status_code == 200, delete_response.text

    recheck_response = requests.get(
        f"{BASE_URL}/favorites/check",
        params={"userId": user_id, "restaurantId": restaurant_id},
        timeout=DEFAULT_TIMEOUT,
    )
    assert recheck_response.status_code == 200, recheck_response.text
    assert recheck_response.json().get("isFavorite") is False


def test_reservations_availability_returns_slots():
    _require_backend()
    restaurant_id = _ensure_restaurant_via_dynamo(_random_restaurant_payload("avail"))
    date_str = (datetime.utcnow() + timedelta(days=5)).date().isoformat()
    resp = requests.post(
        f"{BASE_URL}/reservations/availability",
        json={"restaurantId": restaurant_id, "date": date_str, "partySize": 2},
        timeout=DEFAULT_TIMEOUT,
    )
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload.get("restaurantId") == restaurant_id
    assert isinstance(payload.get("availableSlots"), list)


def test_reservations_hold_and_active():
    _require_backend()
    user = _signup_test_user("hold")
    restaurant_id = _ensure_restaurant_via_dynamo(_random_restaurant_payload("hold"))
    date_str = (datetime.utcnow() + timedelta(days=6)).date().isoformat()
    time_slot = _pick_time_slot(restaurant_id, date_str)
    hold = _create_hold_via_api(user["id"], restaurant_id, date_str, time_slot)
    try:
        active_resp = requests.get(
            f"{BASE_URL}/reservations/hold/active",
            params={"userId": user["id"]},
            timeout=DEFAULT_TIMEOUT,
        )
        assert active_resp.status_code == 200, active_resp.text
        active_hold = active_resp.json().get("hold")
        assert active_hold
        assert active_hold.get("holdId") == hold["holdId"]
    finally:
        _delete_hold(hold["holdId"])
        _cleanup_test_user(user["id"])


def test_reservations_confirm_creates_reservation():
    _require_backend()
    user = _signup_test_user("confirm")
    restaurant_id = _ensure_restaurant_via_dynamo(_random_restaurant_payload("confirm"))
    date_str = (datetime.utcnow() + timedelta(days=8)).date().isoformat()
    time_slot = _pick_time_slot(restaurant_id, date_str)
    hold = _create_hold_via_api(user["id"], restaurant_id, date_str, time_slot)
    reservation = None
    try:
        reservation = _confirm_reservation_via_api(user["id"], hold["holdId"])
        assert reservation.get("restaurantId") == restaurant_id
    finally:
        if reservation:
            _delete_reservation(reservation["reservationId"])
        _delete_hold(hold["holdId"])
        _cleanup_test_user(user["id"])


def test_reservations_user_listing_includes_reservation():
    _require_backend()
    user = _signup_test_user("list")
    restaurant_id = _ensure_restaurant_via_dynamo(_random_restaurant_payload("list"))
    date_str = (datetime.utcnow() + timedelta(days=9)).date().isoformat()
    time_slot = _pick_time_slot(restaurant_id, date_str)
    hold = _create_hold_via_api(user["id"], restaurant_id, date_str, time_slot)
    reservation = _confirm_reservation_via_api(user["id"], hold["holdId"])
    try:
        resp = requests.get(
            f"{BASE_URL}/reservations/user/{user['id']}",
            params={"filter": "all"},
            timeout=DEFAULT_TIMEOUT,
        )
        assert resp.status_code == 200, resp.text
        reservations = _extract_reservations(resp.json())
        assert any(r.get("reservationId") == reservation["reservationId"] for r in reservations)
    finally:
        _delete_reservation(reservation["reservationId"])
        _delete_hold(hold["holdId"])
        _cleanup_test_user(user["id"])


def test_reservations_modify_updates_time():
    _require_backend()
    user = _signup_test_user("modify")
    restaurant_id = _ensure_restaurant_via_dynamo(_random_restaurant_payload("modify"))
    date_str = (datetime.utcnow() + timedelta(days=10)).date().isoformat()
    time_slot = _pick_time_slot(restaurant_id, date_str)
    hold = _create_hold_via_api(user["id"], restaurant_id, date_str, time_slot)
    reservation = _confirm_reservation_via_api(user["id"], hold["holdId"])
    try:
        new_time = "20:00" if time_slot != "20:00" else "18:30"
        resp = requests.patch(
            f"{BASE_URL}/reservations/{reservation['reservationId']}/modify",
            json={"userId": user["id"], "time": new_time},
            timeout=DEFAULT_TIMEOUT,
        )
        assert resp.status_code == 200, resp.text
    finally:
        _delete_reservation(reservation["reservationId"])
        _delete_hold(hold["holdId"])
        _cleanup_test_user(user["id"])


def test_reservations_cancel_reservation():
    _require_backend()
    user = _signup_test_user("cancel")
    restaurant_id = _ensure_restaurant_via_dynamo(_random_restaurant_payload("cancel"))
    date_str = (datetime.utcnow() + timedelta(days=11)).date().isoformat()
    time_slot = _pick_time_slot(restaurant_id, date_str)
    hold = _create_hold_via_api(user["id"], restaurant_id, date_str, time_slot)
    reservation = _confirm_reservation_via_api(user["id"], hold["holdId"])
    try:
        cancel_resp = requests.delete(
            f"{BASE_URL}/reservations/{reservation['reservationId']}/cancel",
            json={"userId": user["id"]},
            timeout=DEFAULT_TIMEOUT,
        )
        assert cancel_resp.status_code == 200, cancel_resp.text
    finally:
        _delete_reservation(reservation["reservationId"])
        _delete_hold(hold["holdId"])
        _cleanup_test_user(user["id"])


def test_reservations_full_flow():
    _require_backend()
    email = f"smoke-res+{uuid.uuid4().hex}@example.com"
    password = "Pass!123"
    future_date = (datetime.utcnow() + timedelta(days=7)).date().isoformat()
    restaurant_id = _ensure_restaurant_via_dynamo(
        {
            "restaurantId": f"smoke-rest-{uuid.uuid4().hex[:6]}",
            "name": "Reservations Smoke Test",
            "description": "Reservations test restaurant",
            "cuisine": ["Integration"],
            "priceRange": "$$",
        }
    )

    signup_payload = {
        "email": email,
        "password": password,
        "firstName": "Resy",
        "lastName": "Tester",
    }
    signup_resp = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload, timeout=DEFAULT_TIMEOUT)
    assert signup_resp.status_code == 201, signup_resp.text
    user_id = signup_resp.json()["user"]["id"]

    hold_id = None
    reservation_id = None
    try:
        availability_payload = {
            "restaurantId": restaurant_id,
            "date": future_date,
            "partySize": 2,
        }
        availability_resp = requests.post(
            f"{BASE_URL}/reservations/availability",
            json=availability_payload,
            timeout=DEFAULT_TIMEOUT,
        )
        assert availability_resp.status_code == 200, availability_resp.text
        slots = availability_resp.json().get("availableSlots", [])
        assert isinstance(slots, list)
        time_choice = slots[0]["time"] if slots else "19:00"

        hold_payload = {
            "userId": user_id,
            "restaurantId": restaurant_id,
            "date": future_date,
            "time": time_choice,
            "partySize": 2,
        }
        hold_resp = requests.post(f"{BASE_URL}/reservations/hold", json=hold_payload, timeout=DEFAULT_TIMEOUT)
        assert hold_resp.status_code == 201, hold_resp.text
        hold = hold_resp.json()["hold"]
        hold_id = hold["holdId"]

        active_resp = requests.get(
            f"{BASE_URL}/reservations/hold/active",
            params={"userId": user_id},
            timeout=DEFAULT_TIMEOUT,
        )
        assert active_resp.status_code == 200, active_resp.text

        confirm_payload = {
            "holdId": hold_id,
            "userId": user_id,
            "paymentMethod": "card_visa_1111",
        }
        confirm_resp = requests.post(
            f"{BASE_URL}/reservations/confirm",
            json=confirm_payload,
            timeout=DEFAULT_TIMEOUT,
        )
        assert confirm_resp.status_code == 201, confirm_resp.text
        reservation = confirm_resp.json()["reservation"]
        reservation_id = reservation["reservationId"]

        user_res_resp = requests.get(
            f"{BASE_URL}/reservations/user/{user_id}",
            params={"filter": "all"},
            timeout=DEFAULT_TIMEOUT,
        )
        assert user_res_resp.status_code == 200, user_res_resp.text
        reservations = _extract_reservations(user_res_resp.json())
        assert any(r.get("reservationId") == reservation_id for r in reservations)

        new_time = "20:00" if time_choice != "20:00" else "18:30"
        modify_payload = {
            "userId": user_id,
            "time": new_time,
            "specialRequests": "Corner table",
        }
        modify_resp = requests.patch(
            f"{BASE_URL}/reservations/{reservation_id}/modify",
            json=modify_payload,
            timeout=DEFAULT_TIMEOUT,
        )
        assert modify_resp.status_code == 200, modify_resp.text

        user_res_resp_2 = requests.get(
            f"{BASE_URL}/reservations/user/{user_id}",
            params={"filter": "all"},
            timeout=DEFAULT_TIMEOUT,
        )
        assert user_res_resp_2.status_code == 200, user_res_resp_2.text
        reservations_after_modify = _extract_reservations(user_res_resp_2.json())
        assert any(r.get("reservationId") == reservation_id for r in reservations_after_modify)

        cancel_resp = requests.delete(
            f"{BASE_URL}/reservations/{reservation_id}/cancel",
            json={"userId": user_id},
            timeout=DEFAULT_TIMEOUT,
        )
        assert cancel_resp.status_code == 200, cancel_resp.text
    finally:
        _cleanup_test_user(user_id)
        if reservation_id:
            _delete_reservation(reservation_id)
        if hold_id:
            _delete_hold(hold_id)


def _ensure_restaurant_via_dynamo(item: dict) -> str:
    dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url=DYNAMO_ENDPOINT,
        region_name=DYNAMO_REGION,
        aws_access_key_id=DYNAMO_KEY,
        aws_secret_access_key=DYNAMO_SECRET,
    )
    table = dynamodb.Table(DDB_RESTAURANTS_TABLE)
    table.put_item(Item=item)
    return item["restaurantId"]


def _cleanup_test_user(user_id: str) -> None:
    dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url=DYNAMO_ENDPOINT,
        region_name=DYNAMO_REGION,
        aws_access_key_id=DYNAMO_KEY,
        aws_secret_access_key=DYNAMO_SECRET,
    )
    dynamodb.Table(DDB_USERS_TABLE).delete_item(Key={"userId": user_id})


def _delete_reservation(reservation_id: str) -> None:
    dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url=DYNAMO_ENDPOINT,
        region_name=DYNAMO_REGION,
        aws_access_key_id=DYNAMO_KEY,
        aws_secret_access_key=DYNAMO_SECRET,
    )
    dynamodb.Table(DDB_RESERVATIONS_TABLE).delete_item(Key={"reservationId": reservation_id})


def _delete_hold(hold_id: str) -> None:
    dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url=DYNAMO_ENDPOINT,
        region_name=DYNAMO_REGION,
        aws_access_key_id=DYNAMO_KEY,
        aws_secret_access_key=DYNAMO_SECRET,
    )
    dynamodb.Table(DDB_HOLDS_TABLE).delete_item(Key={"holdId": hold_id})


def _extract_reservations(payload: Any) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        return payload.get("reservations", [])
    return []


def _random_restaurant_payload(prefix: str) -> Dict[str, Any]:
    return {
        "restaurantId": f"smoke-{prefix}-{uuid.uuid4().hex[:6]}",
        "name": f"{prefix.title()} Smoke Test",
        "description": "Synthetic restaurant record",
        "cuisine": [prefix],
        "priceRange": "$$",
    }


def _signup_test_user(prefix: str) -> Dict[str, str]:
    email = f"{prefix}+{uuid.uuid4().hex}@example.com"
    password = "Pass!123"
    payload = {
        "email": email,
        "password": password,
        "firstName": prefix.title(),
        "lastName": "User",
    }
    resp = requests.post(f"{BASE_URL}/auth/signup", json=payload, timeout=DEFAULT_TIMEOUT)
    assert resp.status_code == 201, resp.text
    return {"id": resp.json()["user"]["id"], "email": email, "password": password}


def _pick_time_slot(restaurant_id: str, date_str: str) -> str:
    resp = requests.post(
        f"{BASE_URL}/reservations/availability",
        json={"restaurantId": restaurant_id, "date": date_str, "partySize": 2},
        timeout=DEFAULT_TIMEOUT,
    )
    resp.raise_for_status()
    slots = resp.json().get("availableSlots", [])
    if not slots:
        return "19:00"
    return slots[0]["time"]


def _create_hold_via_api(user_id: str, restaurant_id: str, date_str: str, time_str: str) -> Dict[str, Any]:
    resp = requests.post(
        f"{BASE_URL}/reservations/hold",
        json={
            "userId": user_id,
            "restaurantId": restaurant_id,
            "date": date_str,
            "time": time_str,
            "partySize": 2,
        },
        timeout=DEFAULT_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()["hold"]


def _confirm_reservation_via_api(user_id: str, hold_id: str) -> Dict[str, Any]:
    resp = requests.post(
        f"{BASE_URL}/reservations/confirm",
        json={"holdId": hold_id, "userId": user_id, "paymentMethod": "card_api_1111"},
        timeout=DEFAULT_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()["reservation"]


def _require_backend() -> None:
    try:
        requests.get("http://localhost:8080/api/helloECS", timeout=3)
    except requests.RequestException as exc:
        pytest.skip(f"Backend not reachable on localhost:8080 ({exc})")

