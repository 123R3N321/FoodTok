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
    print("Starting setup...")

    # TODO: Extend for production if needed
    # Currently only for local environment
    is_local = os.getenv("IS_LOCAL", "true").lower() == "true"
    region = os.getenv("AWS_REGION", "us-east-1")

    # Get local/production DDB and S3 endpoints
    if is_local:
        dynamo_endpoint = os.getenv("LOCAL_DYNAMO_ENDPOINT", "http://localhost:8000")
        s3_endpoint = os.getenv("LOCAL_S3_ENDPOINT", "http://localhost:4566")
        print(f"Using LocalStack/DynamoDB Local endpoints: {dynamo_endpoint}, {s3_endpoint}")
    else:
        dynamo_endpoint = None
        s3_endpoint = None
        print("Using AWS production endpoints")

    # Initialize ddb client and s3 client
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

    # Get DDB tables names
    table_users = os.getenv("DDB_USERS_TABLE", "Users")
    table_restaurants = os.getenv("DDB_RESTAURANTS_TABLE", "Restaurants")
    table_reservations = os.getenv("DDB_RESERVATIONS_TABLE", "Reservations")
    table_user_preferences = os.getenv("DDB_USER_PREFERENCES_TABLE", "UserPreferences")
    table_user_favorite_cuisines = os.getenv("DDB_USER_FAVORITE_CUISINES_TABLE", "UserFavoriteCuisines")
    table_chainstores = os.getenv("DDB_CHAINSTORES_TABLE", "ChainStores")
    table_restaurant_hours = os.getenv("DDB_RESTAURANT_HOURS_TABLE", "RestaurantHours")
    table_restaurant_special_hours = os.getenv("DDB_RESTAURANT_SPECIAL_HOURS_TABLE", "RestaurantSpecialHours")
    table_cuisines = os.getenv("DDB_CUISINES_TABLE", "Cuisines")
    table_restaurant_cuisines = os.getenv("DDB_RESTAURANT_CUISINES_TABLE", "RestaurantCuisines")
    table_amenities = os.getenv("DDB_AMENITIES_TABLE", "Amenities")
    table_restaurant_amenities = os.getenv("DDB_RESTAURANT_AMENITIES_TABLE", "RestaurantAmenities")
    table_restaurant_images = os.getenv("DDB_RESTAURANT_IMAGES_TABLE", "RestaurantImages")
    table_dining_tables = os.getenv("DDB_DINING_TABLES_TABLE", "DiningTables")
    table_table_availability = os.getenv("DDB_TABLE_AVAILABILITY_TABLE", "TableAvailability")
    table_table_availability_overrides = os.getenv("DDB_TABLE_AVAILABILITY_OVERRIDES_TABLE", "TableAvailabilityOverrides")
    table_table_availability_snapshots = os.getenv("DDB_TABLE_AVAILABILITY_SNAPSHOTS_TABLE", "TableAvailabilitySnapshots")
    table_reservation_tables = os.getenv("DDB_RESERVATION_TABLES_TABLE", "ReservationTables")
    table_reservation_history = os.getenv("DDB_RESERVATION_HISTORY_TABLE", "ReservationHistory")
    table_waitlist_entries = os.getenv("DDB_WAITLIST_ENTRIES_TABLE", "WaitlistEntries")
    table_reviews = os.getenv("DDB_REVIEWS_TABLE", "Reviews")
    table_review_images = os.getenv("DDB_REVIEW_IMAGES_TABLE", "ReviewImages")
    table_review_responses = os.getenv("DDB_REVIEW_RESPONSES_TABLE", "ReviewResponses")
    table_review_helpful_votes = os.getenv("DDB_REVIEW_HELPFUL_VOTES_TABLE", "ReviewHelpfulVotes")
    table_favorites = os.getenv("DDB_FAVORITES_TABLE", "Favorites")
    table_recommendation_scores = os.getenv("DDB_RECOMMENDATION_SCORES_TABLE", "RecommendationScores")
    table_user_interactions = os.getenv("DDB_USER_INTERACTIONS_TABLE", "UserInteractions")
    table_notifications = os.getenv("DDB_NOTIFICATIONS_TABLE", "Notifications")
    table_admins = os.getenv("DDB_ADMINS_TABLE", "Admins")
    table_admin_activity_logs = os.getenv("DDB_ADMIN_ACTIVITY_LOGS_TABLE", "AdminActivityLogs")
    table_user_no_show_records = os.getenv("DDB_USER_NO_SHOW_RECORDS_TABLE", "UserNoShowRecords")
    table_system_settings = os.getenv("DDB_SYSTEM_SETTINGS_TABLE", "SystemSettings")
    table_user_stats = os.getenv("DDB_USER_STATS_TABLE", "UserStats")
    table_holds = os.getenv("DDB_HOLDS_TABLE", "Holds")

    # Get S3 Bucket names
    bucket_images = os.getenv("S3_IMAGES_BUCKET", "foodtok-local-images")

    table_names = [
        table_users,
        table_restaurants,
        table_reservations,
        table_user_preferences,
        table_user_favorite_cuisines,
        table_chainstores,
        table_restaurant_hours,
        table_restaurant_special_hours,
        table_cuisines,
        table_restaurant_cuisines,
        table_amenities,
        table_restaurant_amenities,
        table_restaurant_images,
        table_dining_tables,
        table_table_availability,
        table_table_availability_overrides,
        table_table_availability_snapshots,
        table_reservation_tables,
        table_reservation_history,
        table_waitlist_entries,
        table_reviews,
        table_review_images,
        table_review_responses,
        table_review_helpful_votes,
        table_favorites,
        table_recommendation_scores,
        table_user_interactions,
        table_notifications,
        table_admins,
        table_admin_activity_logs,
        table_user_no_show_records,
        table_system_settings,
        table_user_stats,
        table_holds,     
    ]

    # Create DDB tables and S3 Buckets
    for table_name in table_names:
        delete_dynamodb_table_if_exists(dynamodb, table_name)
        create_dynamodb_table(dynamodb, table_name)

    create_s3_bucket(s3, bucket_images, region)    

    print("Setup completed successfully!")

if __name__ == "__main__":
    main()
