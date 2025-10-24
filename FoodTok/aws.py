import os, boto3

def dynamodb():
    return boto3.resource(
        "dynamodb",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        endpoint_url=os.getenv("DYNAMODB_ENDPOINT"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "test"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "test"),
    )