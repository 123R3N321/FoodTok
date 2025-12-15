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

        # Use a more efficient approach - try to describe the table first
        # This is faster than listing all tables
        try:
            dynamodb.meta.client.describe_table(TableName=table_name)
            print(f"   ✓ DynamoDB table '{table_name}' already exists.")
            return
        except ClientError as e:
            # Table doesn't exist if error code is ResourceNotFoundException
            if e.response['Error']['Code'] != 'ResourceNotFoundException':
                raise

        print(f"   Creating DynamoDB table: {table_name}...")
        table = dynamodb.create_table(**schema)
        # Use a shorter wait timeout since we're creating new tables
        table.wait_until_exists()
        print(f"   ✓ DynamoDB table '{table_name}' created successfully.")

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'ResourceInUseException':
            print(f"   ✓ DynamoDB table '{table_name}' already exists (race condition).")
        else:
            print(f"   ❌ DynamoDB creation error for '{table_name}': {e}")
            raise
    except Exception as e:
        print(f"   ❌ Unexpected error creating table '{table_name}': {e}")
        raise


def create_s3_bucket(s3_client, bucket_name: str, region: str):
    """Create S3 bucket if it doesn't exist."""
    try:
        # Try to head the bucket first - faster than listing all buckets
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            print(f"   ✓ S3 bucket '{bucket_name}' already exists.")
            return
        except ClientError as e:
            # Bucket doesn't exist if error code is 404
            if e.response['Error']['Code'] != '404':
                raise

        print(f"   Creating S3 bucket: {bucket_name}...")
        if region == "us-east-1":
            s3_client.create_bucket(Bucket=bucket_name)
        else:
            s3_client.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": region},
            )
        print(f"   ✓ S3 bucket '{bucket_name}' created successfully.")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'BucketAlreadyOwnedByYou':
            print(f"   ✓ S3 bucket '{bucket_name}' already exists (race condition).")
        else:
            print(f"   ❌ S3 bucket creation error for '{bucket_name}': {e}")
            raise
    except Exception as e:
        print(f"   ❌ Unexpected error creating bucket '{bucket_name}': {e}")
        raise


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
    print(f"\n🔌 Initializing service clients...")
    print(f"   DynamoDB endpoint: {dynamo_endpoint}")
    print(f"   S3 endpoint: {s3_endpoint}")
    
    # Use longer timeouts for DynamoDB Local which can be slow
    dynamodb_config = Config(
        connect_timeout=30,
        read_timeout=30,
        retries={'max_attempts': 2, 'mode': 'standard'}
    )
    
    dynamodb = boto3.resource(
        "dynamodb",
        region_name=region,
        endpoint_url=dynamo_endpoint,
        aws_access_key_id="test" if is_local else None,
        aws_secret_access_key="test" if is_local else None,
        config=dynamodb_config
    )
    print(f"   ✓ DynamoDB client initialized")
    
    s3_config = Config(
        connect_timeout=30,
        read_timeout=30,
        retries={'max_attempts': 2, 'mode': 'standard'}
    )
    
    s3 = boto3.client(
        "s3",
        region_name=region,
        endpoint_url=s3_endpoint,
        aws_access_key_id="test" if is_local else None,
        aws_secret_access_key="test" if is_local else None,
        config=s3_config
    )
    print(f"   ✓ S3 client initialized")
    
    # Skip connection test - we know curl works, and list_tables can be slow on DynamoDB Local
    # We'll test the connection when we actually try to create tables

    # Get DynamoDB table names from environment
    # Match local_config.py behavior, but include Restaurants since tests need it
    table_users = os.getenv("DDB_USERS_TABLE", "Users")
    table_restaurants = os.getenv("DDB_RESTAURANTS_TABLE", "Restaurants")  # Needed for tests
    table_favorites = os.getenv("DDB_FAVORITES_TABLE", "Favorites")
    table_reservations = os.getenv("DDB_RESERVATIONS_TABLE", "Reservations")
    # table_user_stats = os.getenv("DDB_USER_STATS_TABLE", "UserStats")  # Not used, commented out like local_config.py
    table_holds = os.getenv("DDB_HOLDS_TABLE", "Holds")

    # Get S3 Bucket names
    bucket_images = os.getenv("S3_IMAGES_BUCKET", "foodtok-local-images")

    # Create tables needed for tests
    # Matches local_config.py but includes Restaurants (needed by test_urls.py)
    table_names = [
        table_users,
        table_restaurants,  # Added: tests need this table
        table_reservations,
        table_favorites,
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

