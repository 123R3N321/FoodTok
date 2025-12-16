import boto3
import os
import time
from botocore.exceptions import ClientError

from dynamo_schemas import TABLE_SCHEMAS

def delete_dynamodb_table_if_exists(dynamodb, table_name: str):
    """Delete DynamoDB table if it already exists."""
    try:
        existing_tables = dynamodb.meta.client.list_tables()["TableNames"]
        if table_name not in existing_tables:
            print(f"Table '{table_name}' does not exist, skipping delete.")
            return

        print(f"Deleting existing DynamoDB table '{table_name}' ...")
        table = dynamodb.Table(table_name)
        table.delete()

        # Wait for deletion to complete
        waiter = dynamodb.meta.client.get_waiter("table_not_exists")
        waiter.wait(TableName=table_name)
        print(f"Table '{table_name}' deleted successfully.")
    except ClientError as e:
        print(f"DynamoDB deletion error for '{table_name}': {e}")

def create_dynamodb_table(dynamodb, table_name: str):
    """Create DynamoDB table if it doesn’t exist."""
    try:
        schema = TABLE_SCHEMAS.get(table_name)
        if not schema:
            raise Exception(f"Unknown table schema for {table_name}")

        existing_tables = dynamodb.meta.client.list_tables()["TableNames"]
        if table_name in existing_tables:
            print(f"DynamoDB table '{table_name}' already exists.")
            return

        print(f"Creating DynamoDB table: {table_name}")

        table = dynamodb.create_table(**schema)
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
    print("=" * 60)
    print("Starting local infrastructure setup...")
    print("=" * 60)

    is_local = os.getenv("IS_LOCAL", "true").lower() == "true"
    region = os.getenv("AWS_REGION", "us-east-1")

    # Get local DDB and S3 endpoints
    if is_local:
        dynamo_endpoint = os.getenv("LOCAL_DYNAMO_ENDPOINT", "http://localhost:8000")
        s3_endpoint = os.getenv("LOCAL_S3_ENDPOINT", "http://localhost:4566")
        print("Using LocalStack/DynamoDB Local endpoints:")
        print(f"  DynamoDB: {dynamo_endpoint}")
        print(f"  S3      : {s3_endpoint}")
    else:
        dynamo_endpoint = None
        s3_endpoint = None
        print("Using AWS production endpoints")

    # Initialize ddb client and s3 client with higher timeouts for local stacks
    config = boto3.session.Config(connect_timeout=30, read_timeout=30, retries={"max_attempts": 1})

    print("Initializing DynamoDB/S3 clients...")
    dynamodb = boto3.resource(
        "dynamodb",
        region_name=region,
        endpoint_url=dynamo_endpoint,
        aws_access_key_id="test" if is_local else None,
        aws_secret_access_key="test" if is_local else None,
        config=config,
    )

    s3 = boto3.client(
        "s3",
        region_name=region,
        endpoint_url=s3_endpoint,
        aws_access_key_id="test" if is_local else None,
        aws_secret_access_key="test" if is_local else None,
        config=config,
    )

    # Get DynamoDB table names
    table_users = os.getenv("DDB_USERS_TABLE", "Users")
    table_favorites = os.getenv("DDB_FAVORITES_TABLE", "Favorites")
    table_reservations = os.getenv("DDB_RESERVATIONS_TABLE", "Reservations")
    #table_user_stats = os.getenv("DDB_USER_STATS_TABLE", "UserStats")
    table_holds = os.getenv("DDB_HOLDS_TABLE", "Holds")

    # Get S3 Bucket names
    bucket_images = os.getenv("S3_IMAGES_BUCKET", "foodtok-local-images")

    table_names = [
        table_users,
        table_reservations,
        table_favorites,
        #table_user_stats,
        table_holds,
    ]

    # Create DDB tables and S3 Buckets
    print("\nCreating DynamoDB tables:")
    for table_name in table_names:
        print(f"  -> {table_name}")
        # delete_dynamodb_table_if_exists(dynamodb, table_name)
        create_dynamodb_table(dynamodb, table_name)

    print("\nCreating S3 bucket:")
    print(f"  -> {bucket_images}")
    create_s3_bucket(s3, bucket_images, region)    

    print("\nSetup completed successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()
