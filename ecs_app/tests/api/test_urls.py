"""Black-box tests that ensure URL patterns respond successfully."""

from __future__ import annotations

from typing import Any, Dict, List

import pytest


@pytest.fixture(scope="module")
def restaurant_listing(api_base_url: str, http_client) -> List[Dict[str, Any]]:
    response = http_client.get(f"{api_base_url}/restaurants", timeout=30)
    assert response.status_code == 200, response.text
    data: Any = response.json()
    assert isinstance(data, list), f"Expected list, got {type(data)!r}"
    assert data, "Seeded restaurants should not be empty."
    return data


def test_healthcheck_url_is_available(api_base_url: str, http_client) -> None:
    response = http_client.get(f"{api_base_url}/helloECS", timeout=15)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload, dict)
    assert "status" in payload


def test_home_url_returns_restaurants(api_base_url: str, http_client) -> None:
    response = http_client.get(f"{api_base_url}/", timeout=30)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload, list)
    assert payload, "Home endpoint should mirror restaurants listing."


def test_restaurants_url_lists_core_fields(restaurant_listing: List[Dict[str, Any]]) -> None:
    sample = restaurant_listing[0]
    for field in ("restaurantId", "name", "cuisine", "location"):
        assert field in sample, f"Missing '{field}' in restaurant payload."
    assert isinstance(sample["location"], dict)


def test_restaurant_detail_url_returns_single_item(
    api_base_url: str, http_client, restaurant_listing: List[Dict[str, Any]]
) -> None:
    restaurant_id = restaurant_listing[0]["restaurantId"]
    response = http_client.get(f"{api_base_url}/restaurants/{restaurant_id}", timeout=30)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload.get("restaurantId") == restaurant_id
    for field in ("name", "location", "rating"):
        assert field in payload


def test_discovery_url_includes_match_metadata(
    api_base_url: str, http_client, sample_user_id: str
) -> None:
    params = {"userId": sample_user_id, "limit": 3}
    response = http_client.get(f"{api_base_url}/restaurants/discovery", params=params, timeout=30)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload.get("userId") == sample_user_id
    restaurants = payload.get("restaurants", [])
    assert isinstance(restaurants, list)
    if restaurants:
        sample = restaurants[0]
        for field in ("restaurantId", "matchScore", "matchReasons"):
            assert field in sample, f"Missing '{field}' in discovery payload."


def test_search_url_respects_filters(api_base_url: str, http_client) -> None:
    params = {"cuisine": "Sushi", "city": "New York", "limit": 5}
    response = http_client.get(f"{api_base_url}/restaurants/search", params=params, timeout=30)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload.get("restaurants"), list)
    assert isinstance(payload.get("total"), int)
    filters = payload.get("filters", {})
    assert filters.get("cuisine") == params["cuisine"]

