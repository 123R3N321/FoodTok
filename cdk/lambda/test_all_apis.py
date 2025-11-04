# test_all_apis.py
import json, os, time, random, string
import boto3
import urllib.request, urllib.error

PROJECT_PREFIX = os.getenv("PROJECT_PREFIX", "FoodTok")
TEST_EMAIL_BASE = os.getenv("TEST_EMAIL_BASE", "apitestuser@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "P@ssword1234")
TEST_USERNAME = os.getenv("TEST_USERNAME", "apitest")
CLEANUP_USER = os.getenv("CLEANUP_USER", "true").lower() == "true"
INCLUDE_TOKENS = os.getenv("INCLUDE_TOKENS", "false").lower() == "true"

def _get_export(cf, name: str) -> str:
    token = None
    while True:
        resp = cf.list_exports(NextToken=token) if token else cf.list_exports()
        for e in resp.get("Exports", []):
            if e.get("Name") == name:
                return e["Value"]
        token = resp.get("NextToken")
        if not token: break
    raise RuntimeError(f"Export {name} not found")

def _http_post(url: str, body: dict, headers=None):
    data = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.getcode(), r.read()
    except urllib.error.HTTPError as e:
        # capture error body instead of raising so we can report it
        return e.code, (e.read() or b"")

def _http_get(url: str, headers=None, attempts=1, backoff=1.0):
    headers = headers or {}
    last_err = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.getcode(), r.read()
        except urllib.error.HTTPError as e:
            # capture body instead of raising
            body = e.read() or b""
            return e.code, body
        except Exception as e:
            last_err = {"exception": str(e)}
            time.sleep(backoff * (i + 1))
    raise RuntimeError(json.dumps({"request_failed": True, "last_exc": last_err}))

def _unique_email(base: str) -> str:
    name, domain = base.split("@", 1) if "@" in base else (base, "example.com")
    salt = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{name}+{salt}@{domain}"

def _peek_jwt(jwt):
    import base64, json as _json
    try:
        _, p, _ = jwt.split(".")
        pad = lambda s: s + "=" * (-len(s) % 4)
        payload = _json.loads(base64.urlsafe_b64decode(pad(p)).decode())
        return {"iss": payload.get("iss"), "aud": payload.get("aud"), "token_use": payload.get("token_use")}
    except Exception:
        return {}

def _ok(status, body):  # wrap for Makefile jq
    return {"statusCode": 200, "headers": {"Content-Type":"application/json"}, "body": json.dumps(body)}

def lambda_handler(event, context):
    cf = boto3.client("cloudformation")
    region = _get_export(cf, f"{PROJECT_PREFIX}-Region")
    api_url = _get_export(cf, f"{PROJECT_PREFIX}-ApiGatewayUrl")
    user_pool_id = _get_export(cf, f"{PROJECT_PREFIX}-UserPoolId")
    if not api_url.endswith("/"): api_url += "/"

    cognito = boto3.client("cognito-idp", region_name=region)

    email = _unique_email(TEST_EMAIL_BASE)
    password = TEST_PASSWORD
    username = TEST_USERNAME
    debug = {
        "api_url": api_url,
        "region": region,
        "user_pool_id": user_pool_id,
        "email": email,
        "username": username,
        "steps": []
    }

    try:
        # 1) Sign up via your endpoint
        code, body = _http_post(api_url + "auth/signUp", {"email": email, "password": password, "username": username})
        su_txt = body.decode("utf-8", "ignore")
        try:
            su = json.loads(su_txt)
        except Exception:
            su = {"raw": su_txt}
        debug["steps"].append({"signUp_status": code, "signUp_resp": su})
        if code not in (200, 201):
            return _ok(code, {"ok": False, "stage": "signUp", "resp": su, "debug": debug})

        # 2) Admin confirm for test (if not auto-confirmed)
        if not bool(su.get("userConfirmed", False)):
            try:
                cognito.admin_confirm_sign_up(UserPoolId=user_pool_id, Username=email)
                debug["steps"].append({"admin_confirm": "ok"})
            except Exception as e:
                debug["steps"].append({"admin_confirm_err": str(e)})

        # small settle delay to allow PostConfirmation to run
        time.sleep(1.0)

        # 3) Sign in via your endpoint
        code, body = _http_post(api_url + "auth/signIn", {"email": email, "password": password})
        si_txt = body.decode("utf-8", "ignore")
        try:
            si = json.loads(si_txt)
        except Exception:
            si = {"raw": si_txt}
        # redacted tokens unless INCLUDE_TOKENS
        redacted = {k: (si[k] if INCLUDE_TOKENS else ("…" if "Token" in k else si[k])) for k in si} if isinstance(si, dict) else si
        debug["steps"].append({"signIn_status": code, "signIn_resp": redacted, "id_token_peek": _peek_jwt(si.get("idToken",""))})
        if code != 200:
            return _ok(code, {"ok": False, "stage": "signIn", "resp": si, "debug": debug})

        id_token = si.get("idToken")

        # 4) /me with ID token — retry a few times to avoid race with PostConfirmation
        me_url = api_url + "me"
        code, body_bytes = 0, b""
        for i in range(5):  # ~1+2+3+4 backoff seconds
            code, body_bytes = _http_get(me_url, headers={"Authorization": f"Bearer {id_token}", "Content-Type":"application/json"})
            if code == 200:
                break
            time.sleep(1 + i)
        me_txt = body_bytes.decode("utf-8", "ignore")
        try:
            me = json.loads(me_txt)
        except Exception:
            me = {"raw": me_txt}
        debug["steps"].append({"me_status": code, "me_resp": me})

        ok = (code == 200 and isinstance(me, dict) and me.get("email") == email)
        return _ok(200, {
            "ok": ok,
            "signUp": su,
            "signIn": si if INCLUDE_TOKENS else redacted,
            "me": me,
            "debug": debug
        })

    finally:
        if CLEANUP_USER:
            try:
                cognito.admin_delete_user(UserPoolId=user_pool_id, Username=email)
            except Exception:
                pass
