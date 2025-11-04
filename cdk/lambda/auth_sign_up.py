import json, os, boto3
cognito = boto3.client("cognito-idp")
CLIENT_ID = os.environ["USER_POOL_CLIENT_ID"]

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        "body": json.dumps(body),
    }

def lambda_handler(event, context):
    try:
        data = json.loads(event.get("body") or "{}")
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""
        username = (data.get("username") or "").strip()
        extra = data.get("attributes") or {}

        if not email or not password or not username:
            return _resp(400, {"error": "email, password, and username are required"})

        # Email is the Cognito primary username (globally unique).
        # User-facing username is stored as a (non-unique) attribute.
        user_attrs = [
            {"Name": "email", "Value": email},
            {"Name": "preferred_username", "Value": username},  # non-unique, mutable
        ]
        for k, v in extra.items():
            user_attrs.append({"Name": k, "Value": str(v)})

        out = cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=email,          # <— email is the Cognito username
            Password=password,
            UserAttributes=user_attrs,
        )

        body = {
            "userConfirmed": bool(out.get("UserConfirmed")),
            "userSub": out.get("UserSub"),
        }
        cd = out.get("CodeDeliveryDetails")
        if cd:
            body["delivery"] = {
                "destination": cd.get("Destination"),
                "medium": cd.get("DeliveryMedium"),
            }
        return _resp(200, body)

    except cognito.exceptions.UsernameExistsException as e:
        return _resp(409, {"error": "UsernameExistsException", "message": str(e)})
    except cognito.exceptions.InvalidPasswordException as e:
        return _resp(400, {"error": "InvalidPasswordException", "message": str(e)})
    except Exception as e:
        return _resp(400, {"error": type(e).__name__, "message": str(e)})
