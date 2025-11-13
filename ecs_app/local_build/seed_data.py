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
        return Decimal(str(obj))   
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

    # TODO: Extend for production if needed
    # Currently only for local environment
    is_local = os.getenv("IS_LOCAL", "true").lower() == "true"
    region = os.getenv("AWS_REGION", "us-east-1")

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
    
    # Get S3 Bucket names
    bucket_images = os.getenv("S3_IMAGES_BUCKET", "foodtok-local-images")


    # Add DDB tables and S3 Buckets seeding paths
    users_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "users.json")
    restaurants_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "restaurants.json")
    reservations_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "reservations.json")
    user_preferences_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "user_preferences.json")
    user_favorite_cuisines_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "user_favorite_cuisine.json")
    chainstores_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "chainstores.json")
    restaurant_hours_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "restaurant_hours.json")
    restaurant_special_hours_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "restaurant_special_hours.json")
    cuisines_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "cuisines.json")
    restaurant_cuisines_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "restaurant_cuisines.json")
    amenities_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "amenities.json")
    restaurant_amenities_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "restaurant_amenities.json")
    restaurant_images_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "restaurant_images.json")
    dining_tables_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "dining_tables.json")
    table_availability_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "table_availability.json")
    table_availability_overrides_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "table_availability_overrides.json")
    table_availability_snapshots_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "table_availability_snapshots.json")
    reservation_tables_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "reservation_tables.json")
    reservation_history_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "reservation_history.json")
    waitlist_entries_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "waitlist_entries.json")
    reviews_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "reviews.json")
    review_images_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "review_images.json")
    review_responses_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "review_responses.json")
    review_helpful_votes_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "review_helpful_votes.json")
    favorites_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "favorites.json")
    recommendation_scores_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "recommendation_scores.json")
    user_interactions_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "user_interactions.json")
    notifications_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "notifications.json")
    admins_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "admins.json")
    admin_activity_logs_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "admin_activity_logs.json")
    user_no_show_records_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "user_no_show_records.json")
    system_settings_seed_file_path = os.path.join("/app/seed_data/dynamo_seed", "system_settings.json")

    # Get S3 Bucket paths
    s3_seed_file_dir = os.path.join("/app/seed_data", "s3_seed")

    # Get local/production DDB and S3 endpoints
    if is_local:
        dynamo_endpoint = os.getenv("LOCAL_DYNAMO_ENDPOINT", "http://localhost:8000")
        s3_endpoint = os.getenv("LOCAL_S3_ENDPOINT", "http://localhost:4566")
        print(f"Using LocalStack endpoints: {dynamo_endpoint}, {s3_endpoint}")
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
    ]

    path_names = [
        users_seed_file_path,
        restaurants_seed_file_path,
        reservations_seed_file_path,
        user_preferences_seed_file_path,
        user_favorite_cuisines_seed_file_path,
        chainstores_seed_file_path,
        restaurant_hours_seed_file_path,
        restaurant_special_hours_seed_file_path,
        cuisines_seed_file_path,
        restaurant_cuisines_seed_file_path,
        amenities_seed_file_path,
        restaurant_amenities_seed_file_path,
        restaurant_images_seed_file_path,
        dining_tables_seed_file_path,
        table_availability_seed_file_path,
        table_availability_overrides_seed_file_path,
        table_availability_snapshots_seed_file_path,
        reservation_tables_seed_file_path,
        reservation_history_seed_file_path,
        waitlist_entries_seed_file_path,
        reviews_seed_file_path,
        review_images_seed_file_path,
        review_responses_seed_file_path,
        review_helpful_votes_seed_file_path,
        favorites_seed_file_path,
        recommendation_scores_seed_file_path,
        user_interactions_seed_file_path,
        notifications_seed_file_path,
        admins_seed_file_path,
        admin_activity_logs_seed_file_path,
        user_no_show_records_seed_file_path,
        system_settings_seed_file_path,
    ]

    for table_name, path_name in zip(table_names, path_names):
        print(f"Preparing to seed table '{table_name}' from '{path_name}'")
        seed_dynamodb_table(dynamodb, table_name, path_name)

    """
    # Seed DDB tables and S3 Buckets
    seed_dynamodb_table(dynamodb, table_users, users_seed_file_path)
    seed_dynamodb_table(dynamodb, table_restaurants, restaurants_seed_file_path)
    seed_dynamodb_table(dynamodb, table_reservations, reservations_seed_file_path)
    seed_dynamodb_table(dynamodb, table_user_preferences, user_preferences_seed_file_path)
    seed_dynamodb_table(dynamodb, table_user_favorite_cuisines, user_favorite_cuisines_seed_file_path)
    seed_dynamodb_table(dynamodb, table_chainstores, chainstores_seed_file_path)
    seed_dynamodb_table(dynamodb, table_restaurant_hours, restaurant_hours_seed_file_path)
    seed_dynamodb_table(dynamodb, table_restaurant_special_hours, restaurant_special_hours_seed_file_path)
    seed_dynamodb_table(dynamodb, table_cuisines, cuisines_seed_file_path)
    seed_dynamodb_table(dynamodb, table_restaurant_cuisines, restaurant_cuisines_seed_file_path)
    seed_dynamodb_table(dynamodb, table_amenities, amenities_seed_file_path)
    seed_dynamodb_table(dynamodb, table_restaurant_amenities, restaurant_amenities_seed_file_path)
    seed_dynamodb_table(dynamodb, table_restaurant_images, restaurant_images_seed_file_path)
    seed_dynamodb_table(dynamodb, table_dining_tables, dining_tables_seed_file_path)
    seed_dynamodb_table(dynamodb, table_table_availability, table_availability_seed_file_path)
    seed_dynamodb_table(dynamodb, table_table_availability_overrides, table_availability_overrides_seed_file_path)
    seed_dynamodb_table(dynamodb, table_table_availability_snapshots, table_availability_snapshots_seed_file_path)
    seed_dynamodb_table(dynamodb, table_reservation_tables, reservation_tables_seed_file_path)
    seed_dynamodb_table(dynamodb, table_reservation_history, reservation_history_seed_file_path)
    seed_dynamodb_table(dynamodb, table_waitlist_entries, waitlist_entries_seed_file_path)
    seed_dynamodb_table(dynamodb, table_reviews, reviews_seed_file_path)
    seed_dynamodb_table(dynamodb, table_review_images, review_images_seed_file_path)
    seed_dynamodb_table(dynamodb, table_review_responses, review_responses_seed_file_path)
    seed_dynamodb_table(dynamodb, table_review_helpful_votes, review_helpful_votes_seed_file_path)
    seed_dynamodb_table(dynamodb, table_favorites, favorites_seed_file_path)
    seed_dynamodb_table(dynamodb, table_recommendation_scores, recommendation_scores_seed_file_path)
    seed_dynamodb_table(dynamodb, table_user_interactions, user_interactions_seed_file_path)
    seed_dynamodb_table(dynamodb, table_notifications, notifications_seed_file_path)
    seed_dynamodb_table(dynamodb, table_admins, admins_seed_file_path)
    seed_dynamodb_table(dynamodb, table_admin_activity_logs, admin_activity_logs_seed_file_path)
    seed_dynamodb_table(dynamodb, table_user_no_show_records, user_no_show_records_seed_file_path)
    seed_dynamodb_table(dynamodb, table_system_settings, system_settings_seed_file_path)
    """

    seed_s3_bucket(s3, bucket_images, s3_seed_file_dir)

    print("Seeding completed successfully!")

if __name__ == "__main__":
    main()
