import os
import boto3
import datetime

dynamo = boto3.resource("dynamodb")
table = dynamo.Table(os.environ["USER_TABLE_NAME"])

def iso_now():
    return datetime.datetime.utcnow().isoformat()

def lambda_handler(event, context):
    """
    Cognito Post Confirmation trigger.
    Creates (or idempotently upserts) a user profile row keyed by the Cognito sub.
    Fields are strings/numbers only (future-proof per your plan).
    """
    # Attributes provided by Cognito
    attrs = (event.get("request") or {}).get("userAttributes") or {}
    sub = attrs.get("sub")
    email = attrs.get("email") or ""
    preferred = attrs.get("preferred_username") or ""

    # If for any reason sub is missing, don't block user confirmation
    if not sub:
        return event

    now = iso_now()

    # Base profile (strings/numbers only; add your own fields freely)
    item = {
        "userId": sub,                      # PK
        "email": email,
        "preferred_username": preferred,    # non-unique display handle
        "profilePicUrl": "",                # string URL to S3/CloudFront later
        "bio": "",                          # string
        "role": os.environ.get("DEFAULT_ROLE", "user"),
        "status": "active",                 # string
        "version": 1,                       # number (for optimistic concurrency later)
        "createdAt": now,
        "updatedAt": now,
    }

    # Idempotent upsert (if item exists, you might prefer an update instead)
    table.put_item(Item=item)

    return event
