from __future__ import annotations

import re
import sys
import threading
from dataclasses import dataclass
from typing import Iterable, List, Sequence, Set
from urllib.parse import urlparse

import requests

from .endpoint_manifest import EndpointSpec, EXPECTED_ENDPOINTS


@dataclass(frozen=True)
class _CompiledEndpoint:
    spec: EndpointSpec
    regex: re.Pattern[str]

    def matches(self, method: str, path: str) -> bool:
        return self.spec.method.upper() == method.upper() and bool(self.regex.match(path))


class EndpointCoverageTracker:
    """Captures which public endpoints are exercised during pytest runs."""

    def __init__(self, specs: Sequence[EndpointSpec] | None = None) -> None:
        specs = specs or EXPECTED_ENDPOINTS
        self._compiled: List[_CompiledEndpoint] = [
            _CompiledEndpoint(spec, re.compile(spec.pattern)) for spec in specs
        ]
        self._hits: Set[str] = set()
        self._unknown: Set[str] = set()
        self._lock = threading.Lock()
        self._original_request = None

    def start(self) -> "EndpointCoverageTracker":
        if self._original_request is not None:
            return self

        self._original_request = requests.sessions.Session.request

        def _instrumented(session, method, url, *args, **kwargs):
            self._record(method, url)
            return self._original_request(session, method, url, *args, **kwargs)

        requests.sessions.Session.request = _instrumented
        return self

    def stop(self) -> None:
        if self._original_request is not None:
            requests.sessions.Session.request = self._original_request
            self._original_request = None

    def _record(self, method: str, url: str) -> None:
        normalized = _normalize_path(url)
        if not normalized:
            return

        method = method.upper()
        for compiled in self._compiled:
            if compiled.matches(method, normalized):
                with self._lock:
                    self._hits.add(compiled.spec.label)
                return

        with self._lock:
            self._unknown.add(f"{method} {normalized}")

    def snapshot(self) -> dict[str, object]:
        total = len(self._compiled)
        hit = len(self._hits)
        coverage = (hit / total * 100) if total else 100.0
        missing = [c.spec.label for c in self._compiled if c.spec.label not in self._hits]
        unknown = sorted(self._unknown)
        return {
            "total": total,
            "hit": hit,
            "coverage": coverage,
            "missing": missing,
            "unknown": unknown,
        }

    def report(self, stream=None) -> None:
        stream = stream or sys.stdout
        summary = self.snapshot()

        stream.write("\n=== Endpoint coverage overview ===\n")
        stream.write(f"Tracked endpoints : {summary['total']}\n")
        stream.write(f"Hit during run    : {summary['hit']}\n")
        stream.write(f"Coverage          : {summary['coverage']:.1f}%\n")

        missing = summary["missing"]
        if missing:
            stream.write("Missing endpoints :\n")
            for label in missing:
                stream.write(f"  - {label}\n")
        else:
            stream.write("Missing endpoints : none 🎉\n")

        unknown = summary["unknown"]
        if unknown:
            stream.write("Unknown endpoints :\n")
            for label in unknown:
                stream.write(f"  - {label}\n")

        stream.write("==================================\n")


def _normalize_path(url: str) -> str | None:
    parsed = urlparse(url)
    path = parsed.path or "/"

    # Only track API calls routed through /api (backend or proxy).
    if path.startswith("/api"):
        path = path[len("/api") :]

    if not path.startswith("/"):
        # Skip requests that were not routed through /api.
        return None

    # Collapse duplicate slashes and ensure root is "/".
    normalized = re.sub(r"/{2,}", "/", path) or "/"
    return normalized

