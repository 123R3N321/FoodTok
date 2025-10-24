import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    path = event.get("path", "")
    method = event.get("httpMethod", "")

    # /hello endpoint
    if path.endswith("/hello") and method == "GET":

        # SIMPLE CHANGE TO TEST DEPLOYMENT
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Hello from Lambda!"}),
            "headers": {"Content-Type": "application/json"}
        }

    # /insert endpoint
    elif path.endswith("/insert") and method == "POST":
        try:
            body = json.loads(event.get("body", "{}"))
            user_id = body.get("userId", "anonymous")

            table.put_item(Item={
                "userId": user_id,
                "createdAt": datetime.utcnow().isoformat(),
                "data": body
            })

            return {
                "statusCode": 200,
                "body": json.dumps({"message": f"Inserted user {user_id}"}),
                "headers": {"Content-Type": "application/json"}
            }

        except Exception as e:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)}),
                "headers": {"Content-Type": "application/json"}
            }

    # Default
    return {
        "statusCode": 404,
        "body": json.dumps({"error": "Endpoint not found"}),
        "headers": {"Content-Type": "application/json"}
    }
