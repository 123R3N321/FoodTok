import boto3
import os
import json
import time
from decimal import Decimal
from botocore.exceptions import ClientError


def marshal(obj):
    """Recursively convert all float values to Decimal for DynamoDB."""
    if isinstance(obj, list):
        return [marshal(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: marshal(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))   # Convert float -> Decimal safely
    else:
        return obj
    
def seed_dynamodb_table(dynamodb, table_name: str, seed_file_path: str):
    """Insert initial seed items into DynamoDB."""
    try:
        with open(seed_file_path, "r") as f:
            items = json.load(f)

        print(f"Seeding DynamoDB table '{table_name}' with {len(items)} items...")

        table = dynamodb.Table(table_name)

        for item in items:
            item = marshal(item)
            table.put_item(Item=item)
        print(f"DynamoDB table '{table_name}' seeded successfully.")

    except FileNotFoundError:
        print(f"DynamoDB seed file not found: {seed_file_path}")
    except ClientError as e:
        print(f"DynamoDB seeding error: {e}")


def wait_for_bucket(s3_client, bucket_name, max_retries=5, delay=2):
    """Wait until the specified S3 bucket exists."""
    for attempt in range(1, max_retries + 1):
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            print(f"Bucket '{bucket_name}' is available (after {attempt} checks).")
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] in ["404", "NoSuchBucket"]:
                print(f"Bucket '{bucket_name}' not ready yet (attempt {attempt}/{max_retries})...")
                time.sleep(delay)
            else:
                print(f"Unexpected error checking bucket: {e}")
                return False
    print(f"Bucket '{bucket_name}' not found after waiting.")
    return False

def seed_s3_bucket(s3_client, bucket_name: str, seed_dir_path: str):
    """Upload seed files to S3 bucket using direct boto3 control."""
    if not os.path.exists(seed_dir_path):
        print(f"No S3 seed directory found at {seed_dir_path}")
        return
    
    if not wait_for_bucket(s3_client, bucket_name):
        print(f"Aborting S3 seeding because bucket '{bucket_name}' was never ready.")
        return

    files = [f for f in os.listdir(seed_dir_path) if os.path.isfile(os.path.join(seed_dir_path, f))]
    if not files:
        print(f"No files found in {seed_dir_path}")
        return

    print(f"Uploading {len(files)} files to S3 bucket '{bucket_name}'...")
    for file_name in files:
        local_path = os.path.join(seed_dir_path, file_name)
        try:
            with open(local_path, "rb") as f:
                s3_client.put_object(Bucket=bucket_name, Key=file_name, Body=f)
            print(f"Uploaded {file_name}")
        except ClientError as e:
            print(f"Failed to upload {file_name}: {e}")
        except Exception as e:
            print(f"Unexpected error uploading {file_name}: {e}")

    print(f"All seed files uploaded successfully to '{bucket_name}'.")

def main():
    print("Starting data seeding...")

    # Can be moved to DC.yml file
    is_local = os.getenv("IS_LOCAL", "true").lower() == "true"
    region = os.getenv("AWS_REGION", "us-east-1")

    # Add DDB tables and S3 Buckets here
    users = os.getenv("SEED_DDB_USERS", "Users")
    restaurants = os.getenv("SEED_DDB_RESTAURANTS", "Restaurants")
    bucket_name = os.getenv("SEED_S3_BUCKET", "foodtok-local-images")

    # Add DDB tables and S3 Buckets seeding paths
    users_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "users.json")
    restaurants_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "restaurants.json")
    s3_seed_dir = os.path.join("/app/seed_data", "s3_seed")

    if is_local:
        dynamo_endpoint = os.getenv("LOCAL_DYNAMO_ENDPOINT", "http://localhost:8000")
        s3_endpoint = os.getenv("LOCAL_S3_ENDPOINT", "http://localhost:4566")
        print(f"Using LocalStack endpoints: {dynamo_endpoint}, {s3_endpoint}")
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

    # Seed DDB tables and S3 Buckets here
    seed_dynamodb_table(dynamodb, users, users_seed_file_path)
    seed_dynamodb_table(dynamodb, restaurants, restaurants_seed_file_path)
    seed_s3_bucket(s3, bucket_name, s3_seed_dir)

    print("Seeding completed successfully!")

if __name__ == "__main__":
    main()
