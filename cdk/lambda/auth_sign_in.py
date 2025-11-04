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

        if not email or not password:
            return _resp(400, {"error": "email and password are required"})

        out = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )

        r = out.get("AuthenticationResult") or {}
        return _resp(200, {
            "idToken": r.get("IdToken"),
            "accessToken": r.get("AccessToken"),
            "refreshToken": r.get("RefreshToken"),
            "expiresIn": r.get("ExpiresIn"),
            "tokenType": r.get("TokenType"),
        })

    except cognito.exceptions.NotAuthorizedException as e:
        return _resp(401, {"error": "NotAuthorizedException", "message": str(e)})
    except cognito.exceptions.UserNotConfirmedException as e:
        return _resp(401, {"error": "UserNotConfirmedException", "message": str(e)})
    except cognito.exceptions.UserNotFoundException as e:
        return _resp(401, {"error": "UserNotFoundException", "message": str(e)})
    except Exception as e:
        return _resp(400, {"error": type(e).__name__, "message": str(e)})
