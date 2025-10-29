#!/usr/bin/env python3
# run_api_from_test_output.py
# Read tokens from test-output.json and hit your API endpoints.
# No external deps; uses urllib from stdlib.

import json
import sys
import os
import urllib.request
import urllib.error
from typing import Tuple, Dict, Any

# so that makefile works too
DEFAULT_PATH = os.path.join(os.getcwd(), "tests/test-output.json")


def load_runner_payload(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        sys.exit(f"ERROR: File not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        outer = json.load(f)
    # The Lambda returned {"statusCode":200,"headers":...,"body":"{...json...}"}
    body_raw = outer.get("body", "{}")
    if isinstance(body_raw, str):
        try:
            body = json.loads(body_raw)
        except json.JSONDecodeError:
            sys.exit("ERROR: Unable to parse .body as JSON")
    else:
        body = body_raw
    return body

def extract_tokens_and_api(body: Dict[str, Any]) -> Tuple[str, str, str]:
    debug = body.get("debug") or {}
    api_url = (debug.get("api_url") or "").strip()
    if not api_url:
        sys.exit("ERROR: debug.api_url missing in test-output.json body")
    if not api_url.endswith("/"):
        api_url += "/"

    id_token = debug.get("id_token")
    access_token = debug.get("access_token")

    if not id_token and not access_token:
        sys.exit("ERROR: Neither id_token nor access_token found in debug section.")

    return api_url, id_token, access_token

def http_get(url: str, headers: Dict[str, str]) -> Tuple[int, str, Dict[str, str]]:
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.getcode(), resp.read().decode("utf-8", errors="ignore"), dict(resp.info())
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            pass
        return e.code, err_body, dict(getattr(e, "headers", {}) or {})
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}", {}

def http_post_json(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Tuple[int, str, Dict[str, str]]:
    data = json.dumps(payload).encode("utf-8")
    hdrs = {"Content-Type": "application/json"}
    hdrs.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.getcode(), resp.read().decode("utf-8", errors="ignore"), dict(resp.info())
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            pass
        return e.code, err_body, dict(getattr(e, "headers", {}) or {})
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}", {}

def print_result(label: str, status: int, body: str):
    print(f"\n=== {label} ===")
    print(f"Status: {status}")
    print("Body  :", body[:2000] + ("..." if len(body) > 2000 else ""))

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    want_insert = "--insert" in sys.argv  # optional: POST /insert after hello

    body = load_runner_payload(path)
    api_url, id_token, access_token = extract_tokens_and_api(body)

    hello_url = api_url + "hello"
    insert_url = api_url + "insert"

    print(f"API URL base: {api_url}")
    print(f"Using tokens found in: {path}")
    if not access_token:
        print("Note: access_token not present; will try ID token only.")
    if not id_token:
        print("Note: id_token not present; will try Access token only.")

    any_success = False

    # Try with Access token first (if present)
    if access_token:
        h = {"Authorization": f"Bearer {access_token}"}
        s, b, _ = http_get(hello_url, h)
        print_result("GET /hello (access token)", s, b)
        if 200 <= s < 300:
            any_success = True
            if want_insert:
                s2, b2, _ = http_post_json(insert_url, h, {"sample": "payload", "ts": "now"})
                print_result("POST /insert (access token)", s2, b2)

    # Try with ID token (if needed or access failed)
    if id_token and not any_success:
        h = {"Authorization": f"Bearer {id_token}"}
        s, b, _ = http_get(hello_url, h)
        print_result("GET /hello (id token)", s, b)
        if 200 <= s < 300:
            any_success = True
            if want_insert:
                s2, b2, _ = http_post_json(insert_url, h, {"sample": "payload", "ts": "now"})
                print_result("POST /insert (id token)", s2, b2)

    if not any_success:
        print("\nResult: ❌ Both tokens failed to call /hello. See outputs above.")
        sys.exit(1)

    print("\nResult: ✅ API call(s) succeeded.")

if __name__ == "__main__":
    main()
