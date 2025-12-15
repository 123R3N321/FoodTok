#!/usr/bin/env python3
"""
CI setup script to create DynamoDB tables and S3 buckets.
This recreates the functionality of local_build/local_config.py without requiring tracked files.
"""

import boto3
import os
import time
from botocore.exceptions import ClientError
from botocore.config import Config
from enum import Enum

# Table definitions
class DynamoTables(Enum):
    USERS = "Users"
    RESTAURANTS = "Restaurants"
    FAVORITES = "Favorites"
    RESERVATIONS = "Reservations"
    USER_STATS = "UserStats"
    HOLDS = "Holds"

# DynamoDB table schemas
TABLE_SCHEMAS = {
    DynamoTables.USERS.value: {
        "TableName": DynamoTables.USERS.value,
        "KeySchema": [
            {"AttributeName": "userId", "KeyType": "HASH"}
        ],
        "AttributeDefinitions": [
            {"AttributeName": "userId", "AttributeType": "S"}
        ],
        "BillingMode": "PAY_PER_REQUEST"
    },
    DynamoTables.RESTAURANTS.value: {
        "TableName": DynamoTables.RESTAURANTS.value,
        "KeySchema": [
            {"AttributeName": "id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "id", "AttributeType": "S"}
        ],
        "BillingMode": "PAY_PER_REQUEST"
    },
    DynamoTables.FAVORITES.value: {
        "TableName": DynamoTables.FAVORITES.value,
        "KeySchema": [
            {"AttributeName": "userId", "KeyType": "HASH"},
            {"AttributeName": "restaurantId", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "restaurantId", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST"
    },
    DynamoTables.RESERVATIONS.value: {
        "TableName": DynamoTables.RESERVATIONS.value,
        "KeySchema": [
            {"AttributeName": "reservationId", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "reservationId", "AttributeType": "S"},
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "date", "AttributeType": "S"}
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "UserReservations",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "date", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"}
            }
        ]
    },
    DynamoTables.USER_STATS.value: {
        "TableName": DynamoTables.USER_STATS.value,
        "KeySchema": [
            {"AttributeName": "userId", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "userId", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST"
    },
    DynamoTables.HOLDS.value: {
        "TableName": DynamoTables.HOLDS.value,
        "KeySchema": [
            {"AttributeName": "holdId", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "holdId", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST"
    },
}


def create_dynamodb_table(dynamodb, table_name: str):
    """Create DynamoDB table if it doesn't exist."""
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
    """Create S3 bucket if it doesn't exist."""
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
    print("Starting CI infrastructure setup...")
    print("=" * 60)

    is_local = os.getenv("IS_LOCAL", "true").lower() == "true"
    region = os.getenv("AWS_REGION", "us-east-1")

    # Get local DDB and S3 endpoints
    if is_local:
        dynamo_endpoint = os.getenv("LOCAL_DYNAMO_ENDPOINT", "http://localhost:8000")
        s3_endpoint = os.getenv("LOCAL_S3_ENDPOINT", "http://localhost:4566")
        print(f"\n📋 Configuration:")
        print(f"   IS_LOCAL: {is_local}")
        print(f"   AWS_REGION: {region}")
        print(f"   DynamoDB Endpoint: {dynamo_endpoint}")
        print(f"   S3 Endpoint: {s3_endpoint}")
        print(f"   AWS_ACCESS_KEY_ID: {os.getenv('AWS_ACCESS_KEY_ID', 'NOT SET')}")
        print(f"   AWS_SECRET_ACCESS_KEY: {'SET' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'NOT SET'}")
    else:
        dynamo_endpoint = None
        s3_endpoint = None
        print("Using AWS production endpoints")

    # Initialize ddb client and s3 client
    print(f"\n🔌 Connecting to services...")
    print(f"   Testing DynamoDB connection to: {dynamo_endpoint}")
    
    try:
        dynamodb = boto3.resource(
            "dynamodb",
            region_name=region,
            endpoint_url=dynamo_endpoint,
            aws_access_key_id="test" if is_local else None,
            aws_secret_access_key="test" if is_local else None,
            config=Config(
                connect_timeout=10,
                read_timeout=10,
                retries={'max_attempts': 3}
            )
        )
        # Test connection by listing tables
        test_tables = dynamodb.meta.client.list_tables()
        print(f"   ✓ DynamoDB connection successful! Found {len(test_tables.get('TableNames', []))} existing tables")
    except Exception as e:
        print(f"   ❌ DynamoDB connection failed: {e}")
        raise
    
    print(f"   Testing S3 connection to: {s3_endpoint}")
    try:
        s3 = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=s3_endpoint,
            aws_access_key_id="test" if is_local else None,
            aws_secret_access_key="test" if is_local else None,
            config=Config(
                connect_timeout=10,
                read_timeout=10,
                retries={'max_attempts': 3}
            )
        )
        # Test connection by listing buckets
        test_buckets = s3.list_buckets()
        print(f"   ✓ S3 connection successful! Found {len(test_buckets.get('Buckets', []))} existing buckets")
    except Exception as e:
        print(f"   ❌ S3 connection failed: {e}")
        raise

    # Get DynamoDB table names from environment
    table_users = os.getenv("DDB_USERS_TABLE", "Users")
    table_restaurants = os.getenv("DDB_RESTAURANTS_TABLE", "Restaurants")
    table_favorites = os.getenv("DDB_FAVORITES_TABLE", "Favorites")
    table_reservations = os.getenv("DDB_RESERVATIONS_TABLE", "Reservations")
    table_user_stats = os.getenv("DDB_USER_STATS_TABLE", "UserStats")
    table_holds = os.getenv("DDB_HOLDS_TABLE", "Holds")

    # Get S3 Bucket names
    bucket_images = os.getenv("S3_IMAGES_BUCKET", "foodtok-local-images")

    # Create all tables defined in TABLE_SCHEMAS
    # (Tests may need all of them, even if local_config.py only creates a subset)
    table_names = [
        table_users,
        table_restaurants,
        table_reservations,
        table_favorites,
        table_user_stats,
        table_holds,
    ]

    # Create DDB tables and S3 Buckets
    print(f"\n📦 Creating DynamoDB tables...")
    for table_name in table_names:
        create_dynamodb_table(dynamodb, table_name)

    print(f"\n🪣 Creating S3 buckets...")
    create_s3_bucket(s3, bucket_images, region)

    print(f"\n✅ CI infrastructure setup completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()

