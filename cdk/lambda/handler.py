import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

_users_table_name = os.environ.get("USERS_TABLE_NAME")
users_table = dynamodb.Table(_users_table_name) if _users_table_name else None

def _get_claims(event):
    # REST API (v1) + Cognito Authorizer
    rc = event.get("requestContext", {}) or {}
    auth = rc.get("authorizer", {}) or {}
    claims = auth.get("claims") or {}
    # If you ever switch to HTTP API (v2), use:
    # claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {}) or {}
    return claims

def lambda_handler(event, context):
    path = event.get("path", "") or ""
    method = event.get("httpMethod", "") or ""
    claims = _get_claims(event)

    user_sub = claims.get("sub")                  # stable, unique Cognito user ID
    username = claims.get("cognito:username")
    email = claims.get("email")

    # /hello endpoint
    if path.endswith("/hello") and method == "GET":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Hello from Lambda!",
                "whoami": {"sub": user_sub, "username": username, "email": email}
            }),
        }

    elif path.endswith("/me") and method == "GET":
        if not users_table:
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Users table not configured"}),
            }
        if not user_sub:
            return {
                "statusCode": 401,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "unauthorized"}),
            }
        try:
            resp = users_table.get_item(Key={"userId": user_sub})
            item = resp.get("Item")
            if not item:
                # Profile not created yet (should exist after Post Confirmation)
                return {
                    "statusCode": 404,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"error": "profile_not_found"}),
                }
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(item),
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": str(e)}),
            }

    # /insert endpoint
    elif path.endswith("/insert") and method == "POST":
        try:
            body_raw = event.get("body", "{}") or "{}"
            body = json.loads(body_raw) if isinstance(body_raw, str) else (body_raw or {})
            # Ignore any client-supplied userId; trust the token
            user_id = user_sub or "anonymous"

            table.put_item(Item={
                "userId": user_id,
                "createdAt": datetime.utcnow().isoformat(),
                "data": body,
            })

            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": f"Inserted user {user_id}"}),
            }

        except Exception as e:
            # Optional: log e to CloudWatch for easier debugging
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": str(e)}),
            }

    # Default
    return {
        "statusCode": 404,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": "Endpoint not found"}),
    }
