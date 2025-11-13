# api/views.py
import os
import uuid
import random
from io import BytesIO
from django.http import JsonResponse
from django.shortcuts import render


from rest_framework.decorators import api_view
from rest_framework.response import Response

from .aws import get_dynamodb, get_s3

# ===============================
# Load environment variables
# ===============================
IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"
LOCAL_S3_ENDPOINT = os.getenv("LOCAL_S3_ENDPOINT")

# Add DDB tables and S3 Buckets here
TABLE_USERS = os.getenv("DDB_USERS_TABLE", "Users")
TABLE_RESTAURANTS = os.getenv("DDB_RESTAURANTS_TABLE", "Restaurants")
TABLE_RESERVATIONS = os.getenv("DDB_RESERVATIONS_TABLE", "Reservations")
TABLE_USER_PREFERENCES = os.getenv("DDB_USER_PREFERENCES_TABLE", "UserPreferences")
TABLE_USER_FAVORITE_CUISINES = os.getenv("DDB_USER_FAVORITE_CUISINES_TABLE", "UserFavoriteCuisines")
TABLE_CHAINSTORES = os.getenv("DDB_CHAINSTORES_TABLE", "ChainStores")
TABLE_RESTAURANT_HOURS = os.getenv("DDB_RESTAURANT_HOURS_TABLE", "RestaurantHours")
TABLE_RESTAURANT_SPECIAL_HOURS = os.getenv("DDB_RESTAURANT_SPECIAL_HOURS_TABLE", "RestaurantSpecialHours")
TABLE_CUISINES = os.getenv("DDB_CUISINES_TABLE", "Cuisines")
TABLE_RESTAURANT_CUISINES = os.getenv("DDB_RESTAURANT_CUISINES_TABLE", "RestaurantCuisines")
TABLE_AMENITIES = os.getenv("DDB_AMENITIES_TABLE", "Amenities")
TABLE_RESTAURANT_AMENITIES = os.getenv("DDB_RESTAURANT_AMENITIES_TABLE", "RestaurantAmenities")
TABLE_RESTAURANT_IMAGES = os.getenv("DDB_RESTAURANT_IMAGES_TABLE", "RestaurantImages")
TABLE_DINING_TABLES = os.getenv("DDB_DINING_TABLES_TABLE", "DiningTables")
TABLE_TABLE_AVAILABILITY = os.getenv("DDB_TABLE_AVAILABILITY_TABLE", "TableAvailability")
TABLE_TABLE_AVAILABILITY_OVERRIDES = os.getenv("DDB_TABLE_AVAILABILITY_OVERRIDES_TABLE", "TableAvailabilityOverrides")
TABLE_TABLE_AVAILABILITY_SNAPSHOTS = os.getenv("DDB_TABLE_AVAILABILITY_SNAPSHOTS_TABLE", "TableAvailabilitySnapshots")
TABLE_RESERVATION_TABLES = os.getenv("DDB_RESERVATION_TABLES_TABLE", "ReservationTables")
TABLE_RESERVATION_HISTORY = os.getenv("DDB_RESERVATION_HISTORY_TABLE", "ReservationHistory")
TABLE_WAITLIST_ENTRIES = os.getenv("DDB_WAITLIST_ENTRIES_TABLE", "WaitlistEntries")
TABLE_REVIEWS = os.getenv("DDB_REVIEWS_TABLE", "Reviews")
TABLE_REVIEW_IMAGES = os.getenv("DDB_REVIEW_IMAGES_TABLE", "ReviewImages")
TABLE_REVIEW_RESPONSES = os.getenv("DDB_REVIEW_RESPONSES_TABLE", "ReviewResponses")
TABLE_REVIEW_HELPFUL_VOTES = os.getenv("DDB_REVIEW_HELPFUL_VOTES_TABLE", "ReviewHelpfulVotes")
TABLE_FAVORITES = os.getenv("DDB_FAVORITES_TABLE", "Favorites")
TABLE_RECOMMENDATION_SCORES = os.getenv("DDB_RECOMMENDATION_SCORES_TABLE", "RecommendationScores")
TABLE_USER_INTERACTIONS = os.getenv("DDB_USER_INTERACTIONS_TABLE", "UserInteractions")
TABLE_NOTIFICATIONS = os.getenv("DDB_NOTIFICATIONS_TABLE", "Notifications")
TABLE_ADMINS = os.getenv("DDB_ADMINS_TABLE", "Admins")
TABLE_ADMIN_ACTIVITY_LOGS = os.getenv("DDB_ADMIN_ACTIVITY_LOGS_TABLE", "AdminActivityLogs")
TABLE_USER_NO_SHOW_RECORDS = os.getenv("DDB_USER_NO_SHOW_RECORDS_TABLE", "UserNoShowRecords")
TABLE_SYSTEM_SETTINGS = os.getenv("DDB_SYSTEM_SETTINGS_TABLE", "SystemSettings")

BUCKET_IMAGES = os.getenv("S3_IMAGE_BUCKET", "foodtok-local-images")


dynamodb = get_dynamodb()
s3 = get_s3()


# ----------------------------------------------------
# api/helloECS
# ----------------------------------------------------
@api_view(["GET"])
def hello_ecs(request):
    return Response({"status": "healthy"}, status=200)


# ----------------------------------------------------
# api/insertECS
# ----------------------------------------------------
@api_view(["POST"])
def insert_item(request):
    try:
        table = dynamodb.Table(TABLE_USERS)
        item = {
            "userId": str(uuid.uuid4()),
            "random_value": random.randint(1, 1000),
        }
        table.put_item(Item=item)

        return Response({"message": "Item inserted", "item": item}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ----------------------------------------------------
# api/listECS
# ----------------------------------------------------
@api_view(["GET"])
def list_items(request):
    try:
        table = dynamodb.Table(TABLE_USERS)
        response = table.scan()
        return Response(response.get("Items", []), status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ----------------------------------------------------
# api/uploadECS
# ----------------------------------------------------
@api_view(["POST"])
def upload_file(request):
    try:
        file_name = f"sample_{uuid.uuid4().hex[:8]}.txt"
        contents = f"Hello from Django ECS! {uuid.uuid4()}"

        # Upload to S3
        s3.upload_fileobj(BytesIO(contents.encode()), BUCKET_IMAGES, file_name)

        file_url = (
            f"{LOCAL_S3_ENDPOINT}/{BUCKET_IMAGES}/{file_name}" if IS_LOCAL
            else f"https://{BUCKET_IMAGES}.s3.amazonaws.com/{file_name}"
        )

        return Response({
            "message": "File uploaded!",
            "file_name": file_name,
            "file_url": file_url,
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ----------------------------------------------------
# api/downloadECS/<filename>
# ----------------------------------------------------
@api_view(["GET"])
def download_file(request, filename):
    try:
        obj = s3.get_object(Bucket=BUCKET_IMAGES, Key=filename)
        data = obj["Body"].read().decode("utf-8")

        return Response({"file_name": filename, "content": data}, status=200)

    except s3.exceptions.NoSuchKey:
        return Response({"error": f"File '{filename}' not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ----------------------------------------------------
# api/restaurants
# ----------------------------------------------------
@api_view(["GET"])
def get_restaurants(request):
    try:
        table = dynamodb.Table(TABLE_RESTAURANTS)
        response = table.scan()

        items = response.get("Items", [])
        return JsonResponse(items, safe=False, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
# ----------------------------------------------------
# home view (sanity check)
# ----------------------------------------------------

def home(request):
    # return render(request, "ecs_app/home.html", {})
    try:
        table = dynamodb.Table(TABLE_RESTAURANTS)
        response = table.scan()

        items = response.get("Items", [])
        return JsonResponse(items, safe=False, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)