from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence, Tuple


@dataclass(frozen=True)
class EndpointSpec:
    """Regex-based description of an externally visible API endpoint."""

    label: str
    method: str
    pattern: str

    def key(self) -> Tuple[str, str]:
        return (self.method.upper(), self.label)


EXPECTED_ENDPOINTS: Sequence[EndpointSpec] = (
    # Health
    EndpointSpec("GET /helloECS", "GET", r"^/helloECS$"),
    # Auth
    EndpointSpec("POST /auth/login", "POST", r"^/auth/login$"),
    EndpointSpec("POST /auth/signup", "POST", r"^/auth/signup$"),
    EndpointSpec("PATCH /auth/preferences", "PATCH", r"^/auth/preferences$"),
    EndpointSpec("GET /auth/profile/<user_id>", "GET", r"^/auth/profile/[^/]+$"),
    EndpointSpec("POST /auth/change-password", "POST", r"^/auth/change-password$"),
    # Favorites
    EndpointSpec("GET /favorites/check", "GET", r"^/favorites/check$"),
    EndpointSpec("GET /favorites/<user_id>", "GET", r"^/favorites/[^/]+$"),
    EndpointSpec("POST /favorites", "POST", r"^/favorites$"),
    EndpointSpec("DELETE /favorites", "DELETE", r"^/favorites$"),
    # Reservations
    EndpointSpec("POST /reservations/availability", "POST", r"^/reservations/availability$"),
    EndpointSpec("POST /reservations/hold", "POST", r"^/reservations/hold$"),
    EndpointSpec("GET /reservations/hold/active", "GET", r"^/reservations/hold/active$"),
    EndpointSpec("POST /reservations/confirm", "POST", r"^/reservations/confirm$"),
    EndpointSpec("GET /reservations/user/<user_id>", "GET", r"^/reservations/user/[^/]+$"),
    EndpointSpec("GET /reservations/<reservation_id>", "GET", r"^/reservations/[^/]+$"),
    EndpointSpec(
        "PATCH /reservations/<reservation_id>/modify",
        "PATCH",
        r"^/reservations/[^/]+/modify$",
    ),
    EndpointSpec(
        "DELETE /reservations/<reservation_id>/cancel",
        "DELETE",
        r"^/reservations/[^/]+/cancel$",
    ),
)

