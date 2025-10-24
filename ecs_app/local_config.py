import boto3
import os
from botocore.exceptions import ClientError

def create_dynamodb_table(dynamodb, table_name: str):
    """Create DynamoDB table if it doesn’t exist."""
    try:
        existing_tables = dynamodb.meta.client.list_tables()["TableNames"]
        if table_name in existing_tables:
            print(f"DynamoDB table '{table_name}' already exists.")
            return

        print(f"Creating DynamoDB table: {table_name}")
        table = dynamodb.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "userId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        table.wait_until_exists()
        print(f"DynamoDB table '{table_name}' created successfully.")
    except ClientError as e:
        print(f"DynamoDB creation error: {e}")

def create_s3_bucket(s3_client, bucket_name: str, region: str):
    """Create S3 bucket if it doesn’t exist."""
    try:
        buckets = [b["Name"] for b in s3_client.list_buckets().get("Buckets", [])]
        if bucket_name in buckets:
            print(f"S3 bucket '{bucket_name}' already exists.")
            return

        print(f"Creating S3 bucket: {bucket_name}")
        if region == "us-east-1":
            s3_client.create_bucket(Bucket=bucket_name)
        else:
            s3_client.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": region},
            )
        print(f"S3 bucket '{bucket_name}' created successfully.")
    except ClientError as e:
        print(f"S3 bucket creation error: {e}")

def main():
    print("Starting setup...")

    is_local = os.getenv("IS_LOCAL", "true").lower() == "true"
    region = os.getenv("AWS_REGION", "us-east-1")
    table_name = os.getenv("SEED_DYNAMO_TABLE", "FoodTokLocal")
    bucket_name = os.getenv("SEED_S3_BUCKET", "foodtok-local-images")

    if is_local:
        dynamo_endpoint = os.getenv("LOCAL_DYNAMO_ENDPOINT", "http://localhost:8000")
        s3_endpoint = os.getenv("LOCAL_S3_ENDPOINT", "http://localhost:4566")
        print(f"Using LocalStack/DynamoDB Local endpoints: {dynamo_endpoint}, {s3_endpoint}")
    else:
        dynamo_endpoint = None
        s3_endpoint = None
        print("Using AWS production endpoints")

    dynamodb = boto3.resource(
        "dynamodb",
        region_name=region,
        endpoint_url=dynamo_endpoint,
        aws_access_key_id="test" if is_local else None,
        aws_secret_access_key="test" if is_local else None,
    )

    s3 = boto3.client(
        "s3",
        region_name=region,
        endpoint_url=s3_endpoint,
        aws_access_key_id="test" if is_local else None,
        aws_secret_access_key="test" if is_local else None,
    )

    create_dynamodb_table(dynamodb, table_name)
    create_s3_bucket(s3, bucket_name, region)

    print("Setup completed successfully!")

if __name__ == "__main__":
    main()
