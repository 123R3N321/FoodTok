# test_e2e_runner.py

import json, os, time
import boto3
import urllib.request, urllib.error

PROJECT_PREFIX = os.getenv("PROJECT_PREFIX", "FoodTok")
TEST_EMAIL = os.getenv("TEST_EMAIL", "testuser@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "P@ssword1234")
CLEANUP_USER = os.getenv("CLEANUP_USER", "true").lower() == "true"
INCLUDE_TOKENS = os.getenv("INCLUDE_TOKENS", "true").lower() == "true"  # toggle

def _get_export(cf, name: str) -> str:
    token = None
    while True:
        resp = cf.list_exports(NextToken=token) if token else cf.list_exports()
        for e in resp.get("Exports", []):
            if e.get("Name") == name:
                return e["Value"]
        token = resp.get("NextToken")
        if not token:
            break
    raise RuntimeError(f"Export {name} not found")

def _http_get(url: str, headers: dict, attempts=5, backoff=1):
    last_exc = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.getcode(), resp.read()
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8", errors="ignore")
            except Exception:
                err_body = ""
            last_exc = {"http_error": e.code, "headers": dict(getattr(e, "headers", {}) or {}), "body": err_body}
        except Exception as e:
            last_exc = {"exception": str(e)}
        time.sleep(backoff * (i + 1))
    raise RuntimeError(json.dumps({"request_failed": True, "last_exc": last_exc}))

def _peek_jwt(jwt):
    import base64, json as _json
    try:
        _, p, _ = jwt.split(".")
        pad = lambda s: s + "=" * (-len(s) % 4)
        payload = _json.loads(base64.urlsafe_b64decode(pad(p)).decode())
        return {"iss": payload.get("iss"), "aud": payload.get("aud"), "token_use": payload.get("token_use")}
    except Exception:
        return {}

def _result(ok: bool, status_code: int, body_obj: dict, debug: dict):
    return {
        "statusCode": 200,  # always 200 so Makefile can jq;
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"ok": ok, "statusCode": status_code, "body": body_obj, "debug": debug}),
    }

def lambda_handler(event, context):
    session = boto3.Session()
    cf = session.client("cloudformation")

    region = _get_export(cf, f"{PROJECT_PREFIX}-Region")
    api_url = _get_export(cf, f"{PROJECT_PREFIX}-ApiGatewayUrl")
    user_pool_id = _get_export(cf, f"{PROJECT_PREFIX}-UserPoolId")
    client_id = _get_export(cf, f"{PROJECT_PREFIX}-UserPoolClientId")
    if not api_url.endswith("/"):
        api_url += "/"

    cognito = session.client("cognito-idp", region_name=region)

    # ensure test user
    try:
        cognito.admin_create_user(
            UserPoolId=user_pool_id,
            Username=TEST_EMAIL,
            MessageAction="SUPPRESS",
            UserAttributes=[
                {"Name": "email", "Value": TEST_EMAIL},
                {"Name": "email_verified", "Value": "true"},
            ],
        )
    except cognito.exceptions.UsernameExistsException:
        pass
    cognito.admin_set_user_password(
        UserPoolId=user_pool_id,
        Username=TEST_EMAIL,
        Password=TEST_PASSWORD,
        Permanent=True,
    )

    try:
        # authenticate
        auth = cognito.initiate_auth(
            ClientId=client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": TEST_EMAIL, "PASSWORD": TEST_PASSWORD},
        )
        access_token = auth["AuthenticationResult"]["AccessToken"]
        id_token = auth["AuthenticationResult"]["IdToken"]

        debug = {
            "api_url": api_url,
            "region": region,
            "user_pool_id": user_pool_id,
            "client_id": client_id,
            "id_token_peek": _peek_jwt(id_token),
            "access_token_peek": _peek_jwt(access_token),
        }
        if INCLUDE_TOKENS:
            debug["id_token"] = id_token
            debug["access_token"] = access_token

        url = api_url + "hello"

        # try Access token first
        try:
            code, body = _http_get(url, headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"})
            try:
                parsed = json.loads(body.decode("utf-8"))
            except Exception:
                parsed = {"raw": body.decode("utf-8", errors="ignore")}
            if code == 200:
                debug["used_token"] = "access"
                return _result(True, code, parsed, debug)
            # fall through to ID token
        except Exception as e_access:
            debug["access_call_error"] = str(e_access)

        # try ID token
        try:
            code, body = _http_get(url, headers={"Authorization": f"Bearer {id_token}", "Content-Type": "application/json"})
            try:
                parsed = json.loads(body.decode("utf-8"))
            except Exception:
                parsed = {"raw": body.decode("utf-8", errors="ignore")}
            debug["used_token"] = "id"
            return _result(code == 200, code, parsed, debug)
        except Exception as e_id:
            debug["id_call_error"] = str(e_id)
            return _result(False, 0, {"error": "both token calls failed"}, debug)

    finally:
        if CLEANUP_USER:
            try:
                cognito.admin_delete_user(UserPoolId=user_pool_id, Username=TEST_EMAIL)
            except Exception:
                pass
