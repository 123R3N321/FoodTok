"""Endpoint-level smoke tests that focus on view behavior and payload shape."""

from __future__ import annotations

from typing import Any


def test_insert_and_list_items(api_base_url: str, http_client) -> None:
    response = http_client.post(f"{api_base_url}/insertECS", timeout=15)
    assert response.status_code == 200, response.text
    payload = response.json()
    inserted_item = payload.get("item", {})
    assert isinstance(inserted_item, dict)
    assert "userId" in inserted_item

    list_response = http_client.get(f"{api_base_url}/listECS", timeout=30)
    assert list_response.status_code == 200, list_response.text
    items = list_response.json()
    assert isinstance(items, list)
    assert items, "Expected at least one user item in DynamoDB."


def test_upload_and_download_cycle(api_base_url: str, http_client) -> None:
    upload_response = http_client.post(f"{api_base_url}/uploadECS", timeout=30)
    assert upload_response.status_code == 200, upload_response.text
    upload_payload = upload_response.json()
    file_name = upload_payload.get("file_name")
    assert file_name

    download_response = http_client.get(f"{api_base_url}/downloadECS/{file_name}", timeout=30)
    assert download_response.status_code == 200, download_response.text
    download_payload = download_response.json()
    assert download_payload.get("file_name") == file_name
    assert "content" in download_payload


def test_reservation_availability_structure(
    api_base_url: str, http_client, sample_restaurant_id: str
) -> None:
    payload = {
        "restaurantId": sample_restaurant_id,
        "date": "2025-12-24",
        "partySize": 2,
    }
    response = http_client.post(
        f"{api_base_url}/reservations/availability",
        json=payload,
        timeout=30,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data.get("restaurantId") == sample_restaurant_id
    assert data.get("date") == payload["date"]
    slots = data.get("availableSlots")
    assert isinstance(slots, list)
    if slots:
        slot = slots[0]
        for field in ("time", "available", "tablesAvailable"):
            assert field in slot


def test_get_active_hold_returns_latest_hold(
    api_base_url: str,
    http_client,
    sample_user_id: str,
    sample_restaurant_id: str,
    hold_factory,
) -> None:
    hold = hold_factory(user_id=sample_user_id, restaurant_id=sample_restaurant_id)
    response = http_client.get(
        f"{api_base_url}/reservations/hold/active",
        params={"userId": sample_user_id},
        timeout=30,
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    returned_hold = payload.get("hold")
    if returned_hold:
        assert returned_hold.get("holdId")
        assert returned_hold.get("userId") == sample_user_id
        if "holdId" in hold:
            assert returned_hold["holdId"] == hold["holdId"]


def test_confirm_reservation_returns_confirmation(
    api_base_url: str,
    http_client,
    sample_user_id: str,
    sample_restaurant_id: str,
    hold_factory,
) -> None:
    hold = hold_factory(user_id=sample_user_id, restaurant_id=sample_restaurant_id)
    payload = {
        "holdId": hold["holdId"],
        "userId": sample_user_id,
        "paymentMethod": "card_visa_1234",
    }
    response = http_client.post(f"{api_base_url}/reservations/confirm", json=payload, timeout=30)
    assert response.status_code == 201, response.text
    data = response.json()
    reservation = data.get("reservation", {})
    assert data.get("success") is True
    assert isinstance(reservation, dict)
    for field in ("reservationId", "confirmationCode", "status"):
        assert field in reservation


def test_cancel_reservation_returns_success(
    api_base_url: str, http_client, sample_reservation_id: str
) -> None:
    response = http_client.delete(
        f"{api_base_url}/reservations/{sample_reservation_id}/cancel",
        timeout=30,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data.get("success") is True
    assert "message" in data


def test_check_favorite_returns_boolean(
    api_base_url: str, http_client, sample_user_id: str, sample_restaurant_id: str
) -> None:
    params = {"userId": sample_user_id, "restaurantId": sample_restaurant_id}
    response = http_client.get(f"{api_base_url}/favorites/check", params=params, timeout=30)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "isFavorite" in data
    assert isinstance(data["isFavorite"], bool)


def test_list_favorites_returns_collection(
    api_base_url: str, http_client, sample_user_id: str
) -> None:
    response = http_client.get(f"{api_base_url}/favorites/{sample_user_id}", timeout=30)
    assert response.status_code == 200, response.text
    favorites = response.json()
    assert isinstance(favorites, list)


def test_user_stats_endpoint_has_core_metrics(
    api_base_url: str, http_client, sample_user_id: str
) -> None:
    response = http_client.get(f"{api_base_url}/stats/{sample_user_id}", timeout=30)
    assert response.status_code == 200, response.text
    stats = response.json()
    for field in ("totalLikes", "totalReservations", "topCuisines"):
        assert field in stats

