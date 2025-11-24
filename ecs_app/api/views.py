# api/views.py
import os
import uuid
import random
import json
import bcrypt
from datetime import datetime
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
TABLE_USER_STATS = os.getenv("DDB_USER_STATS_TABLE", "UserStats")
TABLE_HOLDS = os.getenv("DDB_HOLDS_TABLE", "Holds")

BUCKET_IMAGES = os.getenv("S3_IMAGE_BUCKET", "foodtok-local-images")


dynamodb = get_dynamodb()
s3 = get_s3()


# ----------------------------------------------------
# Helper Class & functions
# ----------------------------------------------------
class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal to float for JSON serialization"""
    def default(self, obj):
        from decimal import Decimal
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)
    
def convert_floats_to_decimal(obj):
    """Recursively convert all float values to Decimal for DynamoDB"""
    from decimal import Decimal
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj

def convert_price_to_int(price_value):
    """Convert price format ($$, 2, etc.) to integer 1-4"""
    if isinstance(price_value, int):
        return price_value
    if isinstance(price_value, str):
        if price_value.startswith("$"):
            return len(price_value)
        try:
            return int(price_value)
        except ValueError:
            return 2  # Default to moderate
    return 2
    
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
    


# ----------------------------------------------------
# api/restaurants/discovery - Personalized feed
# ----------------------------------------------------
@api_view(["GET"])
def discover_restaurants(request):
    """
    GET /api/restaurants/discovery?userId=X&limit=Y
    
    Returns personalized restaurant recommendations with match scores.
    Matches based on user preferences (cuisine, price, dietary).
    """
    try:
        user_id = request.GET.get("userId")
        limit = int(request.GET.get("limit", 10))
        
        if not user_id:
            return Response({"error": "userId query parameter required"}, status=400)
        
        # Get user preferences
        users_table = dynamodb.Table(TABLE_USERS)
        user_response = users_table.get_item(Key={"userId": user_id})
        user = user_response.get("Item", {})
        
        # Get user preferences or use defaults
        user_preferences = user.get("preferences", {})
        preferred_cuisines = user_preferences.get("cuisines", [])
        preferred_price = user_preferences.get("priceRange", [1, 2, 3, 4])
        dietary_restrictions = user_preferences.get("dietaryRestrictions", [])
        
        # Get all restaurants
        restaurants_table = dynamodb.Table(TABLE_RESTAURANTS)
        response = restaurants_table.scan()
        restaurants = response.get("Items", [])
        
        # Calculate match scores
        scored_restaurants = []
        for restaurant in restaurants:
            score = calculate_match_score(
                restaurant,
                preferred_cuisines,
                preferred_price,
                dietary_restrictions
            )
            
            # Add match data
            restaurant["matchScore"] = score["score"]
            restaurant["matchReasons"] = score["reasons"]
            scored_restaurants.append(restaurant)
        
        # Sort by match score (highest first)
        scored_restaurants.sort(key=lambda x: x["matchScore"], reverse=True)
        
        # Return top N results
        return Response({
            "userId": user_id,
            "restaurants": scored_restaurants[:limit],
            "total": len(scored_restaurants)
        }, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


def calculate_match_score(restaurant, preferred_cuisines, preferred_price, dietary_restrictions):
    """
    Calculate match score (0-100) based on user preferences.
    
    Scoring breakdown:
    - Cuisine match: 40 points
    - Price match: 30 points
    - Dietary options: 20 points
    - Base popularity (rating): 10 points
    """
    score = 0
    reasons = []
    
    # 1. Cuisine matching (40 points)
    restaurant_cuisines = restaurant.get("cuisine", [])
    if isinstance(restaurant_cuisines, str):
        restaurant_cuisines = [restaurant_cuisines]
    
    if preferred_cuisines:
        cuisine_matches = [c for c in restaurant_cuisines if c in preferred_cuisines]
        if cuisine_matches:
            score += 40
            reasons.append(f"Loves {cuisine_matches[0]}")
        else:
            score += 10  # Some points for trying new cuisines
    else:
        score += 20  # No preference = neutral
    
    # 2. Price range matching (30 points)
    restaurant_price = restaurant.get("priceRange", 2)
    
    # Convert $$ format to numeric if needed
    if isinstance(restaurant_price, str):
        restaurant_price = len(restaurant_price)
    
    if restaurant_price in preferred_price:
        score += 30
        price_labels = {1: "Budget-friendly", 2: "Moderate", 3: "Upscale", 4: "Fine dining"}
        reasons.append(price_labels.get(restaurant_price, "Good value"))
    else:
        # Partial points if close
        if any(abs(restaurant_price - p) == 1 for p in preferred_price):
            score += 15
    
    # 3. Dietary options (20 points)
    restaurant_dietary = restaurant.get("dietaryOptions", [])
    if dietary_restrictions:
        matches = [d for d in dietary_restrictions if d in restaurant_dietary]
        if matches:
            score += 20
            reasons.append(f"Has {matches[0]} options")
        elif not restaurant_dietary:
            score += 5  # Some points if no restrictions
    else:
        score += 10  # No dietary restrictions = partial points
    
    # 4. Base popularity from rating (10 points)
    rating = float(restaurant.get("rating", 0))
    score += min(10, int(rating * 2))  # 5.0 rating = 10 points
    
    # Add high rating to reasons if 4.5+
    if rating >= 4.5:
        reasons.append(f"Highly rated ({rating}★)")
    
    return {
        "score": min(100, score),  # Cap at 100
        "reasons": reasons[:3]  # Top 3 reasons
    }


# ----------------------------------------------------
# api/restaurants/<id> - Single restaurant detail
# ----------------------------------------------------
@api_view(["GET"])
def get_restaurant_detail(request, restaurant_id):
    """
    GET /api/restaurants/<id>
    
    Returns detailed information for a single restaurant.
    """
    try:
        table = dynamodb.Table(TABLE_RESTAURANTS)
        response = table.get_item(Key={"restaurantId": restaurant_id})
        
        item = response.get("Item")
        if not item:
            return Response(
                {"error": f"Restaurant with id '{restaurant_id}' not found"},
                status=404
            )
        
        return Response(item, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ----------------------------------------------------
# api/restaurants/search - Filtered search
# ----------------------------------------------------
@api_view(["GET"])
def search_restaurants(request):
    """
    GET /api/restaurants/search?cuisine=Italian&priceRange=2,3&minRating=4.0
    
    Search restaurants with filters:
    - cuisine: Cuisine type (e.g., "Italian", "Japanese")
    - priceRange: Comma-separated price levels (1-4)
    - minRating: Minimum rating (0.0-5.0)
    - city: City filter (e.g., "New York")
    - limit: Max results (default 20)
    """
    try:
        # Parse query parameters
        cuisine = request.GET.get("cuisine")
        price_range_str = request.GET.get("priceRange")
        min_rating = request.GET.get("minRating")
        city = request.GET.get("city")
        limit = int(request.GET.get("limit", 20))
        
        # Get all restaurants (DynamoDB scan)
        table = dynamodb.Table(TABLE_RESTAURANTS)
        response = table.scan()
        restaurants = response.get("Items", [])
        
        # Apply filters
        filtered = restaurants

        # Filter by cuisine
        if cuisine:
            cuisine_lower = cuisine.lower()
            filtered = [
                r for r in filtered
                if any(
                    cuisine_lower in c.lower()
                    for c in (r.get("cuisine", []) if isinstance(r.get("cuisine"), list) else [r.get("cuisine", "")])
                )
            ]
        
        # Filter by price range
        if price_range_str:
            try:
                price_ranges = [int(p.strip()) for p in price_range_str.split(",")]
                filtered = [
                    r for r in filtered
                    if convert_price_to_int(r.get("priceRange", 2)) in price_ranges
                ]
            except ValueError:
                return Response({"error": "Invalid priceRange format. Use comma-separated numbers (1-4)."}, status=400)
        
        # Filter by minimum rating
        if min_rating:
            try:
                min_rating_float = float(min_rating)
                filtered = [
                    r for r in filtered
                    if float(r.get("rating", 0)) >= min_rating_float
                ]
            except ValueError:
                return Response({"error": "Invalid minRating format. Use decimal (e.g., 4.0)."}, status=400)
        
        # Filter by city
        if city:
            city_lower = city.lower()
            filtered = [
                r for r in filtered
                if city_lower in r.get("location", {}).get("city", "").lower()
            ]
        
        # Sort by rating (highest first)
        filtered.sort(key=lambda x: float(x.get("rating", 0)), reverse=True)
        
        # Limit results
        filtered = filtered[:limit]
        
        return Response({
            "restaurants": filtered,
            "total": len(filtered),
            "filters": {
                "cuisine": cuisine,
                "priceRange": price_range_str,
                "minRating": min_rating,
                "city": city
            }
        }, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================

@api_view(["POST"])
def login(request):
    """
    POST /api/auth/login
    Body: { "email": "user@example.com", "password": "password123" }
    """
    try:
        email = request.data.get("email")
        password = request.data.get("password")
        
        if not email or not password:
            return Response({"error": "Email and password required"}, status=400)
        
        # Get user from DynamoDB
        table = dynamodb.Table(TABLE_USERS)
        response = table.scan(
            FilterExpression="email = :email",
            ExpressionAttributeValues={":email": email}
        )
        
        users = response.get("Items", [])
        
        if not users:
            return Response({"error": "Invalid credentials"}, status=401)
        
        user = users[0]
        
        # Check hashed password
        stored_password = user.get("password", "")
        if isinstance(stored_password, str) and stored_password.startswith("$2b$"):
            # Hashed password
            if not bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
                return Response({"error": "Invalid credentials"}, status=401)
        else:
            # Legacy plain text (migrate on login)
            if stored_password != password:
                return Response({"error": "Invalid credentials"}, status=401)
            # Hash and update password
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            table.update_item(
                Key={"userId": user.get("userId")},
                UpdateExpression="SET password = :pwd",
                ExpressionAttributeValues={":pwd": hashed}
            )
        
        # Return user data (remove password)
        user_data = {
            "id": user.get("userId"),
            "email": user.get("email"),
            "firstName": user.get("firstName", ""),
            "lastName": user.get("lastName", ""),
            "preferences": user.get("preferences", {
                "cuisines": [],
                "dietaryRestrictions": [],
                "priceRange": "$$",
                "maxDistance": 10,
                "favoriteRestaurants": []
            }),
            "createdAt": user.get("createdAt"),
            "updatedAt": user.get("updatedAt")
        }
        
        return Response({"user": user_data}, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def signup(request):
    """
    POST /api/auth/signup
    Body: { "email": "user@example.com", "password": "password123", "firstName": "John", "lastName": "Doe" }
    """
    try:
        email = request.data.get("email")
        password = request.data.get("password")
        first_name = request.data.get("firstName", "")
        last_name = request.data.get("lastName", "")
        
        if not email or not password:
            return Response({"error": "Email and password required"}, status=400)
        
        # Check if user already exists
        table = dynamodb.Table(TABLE_USERS)
        response = table.scan(
            FilterExpression="email = :email",
            ExpressionAttributeValues={":email": email}
        )
        
        if response.get("Items"):
            return Response({"error": "User already exists"}, status=400)
        
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        
        new_user = {
            "userId": user_id,
            "email": email,
            "password": bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "firstName": first_name,
            "lastName": last_name,
            "preferences": {
                "cuisines": [],
                "dietaryRestrictions": [],
                "priceRange": "$$",
                "maxDistance": 10,
                "favoriteRestaurants": []
            },
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }
        
        table.put_item(Item=new_user)
        
        # Return user data (remove password)
        user_data = {k: v for k, v in new_user.items() if k != "password"}
        user_data["id"] = user_data.pop("userId")
        
        return Response({"user": user_data}, status=201)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["PATCH"])
def update_preferences(request):
    """
    PATCH /api/auth/preferences
    Body: { 
      "userId": "user_001", 
      "preferences": {...},
      "firstName": "John",  // optional
      "lastName": "Doe",    // optional
      "bio": "..."          // optional
    }
    """
    try:
        user_id = request.data.get("userId")
        preferences = request.data.get("preferences", {})
        first_name = request.data.get("firstName")
        last_name = request.data.get("lastName")
        bio = request.data.get("bio")
        
        if not user_id:
            return Response({"error": "userId required"}, status=400)
        
        # Convert floats to Decimal for DynamoDB
        from decimal import Decimal
        def to_decimal(obj):
            if isinstance(obj, list):
                return [to_decimal(i) for i in obj]
            elif isinstance(obj, dict):
                return {k: to_decimal(v) for k, v in obj.items()}
            elif isinstance(obj, float):
                return Decimal(str(obj))
            return obj
        
        preferences = to_decimal(preferences)
        
        # Build update expression dynamically
        from datetime import datetime, timezone
        table = dynamodb.Table(TABLE_USERS)
        
        update_expr = "SET updatedAt = :updated"
        expr_values = {":updated": datetime.now(timezone.utc).isoformat()}
        
        if preferences:
            update_expr += ", preferences = :prefs"
            expr_values[":prefs"] = preferences
        
        if first_name is not None:
            update_expr += ", firstName = :firstName"
            expr_values[":firstName"] = first_name
        
        if last_name is not None:
            update_expr += ", lastName = :lastName"
            expr_values[":lastName"] = last_name
        
        if bio is not None:
            update_expr += ", bio = :bio"
            expr_values[":bio"] = bio
        
        response = table.update_item(
            Key={"userId": user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ReturnValues="ALL_NEW"
        )
        
        user = response.get("Attributes", {})
        user_data = {k: v for k, v in user.items() if k != "password"}
        user_data["id"] = user_data.pop("userId", user_id)
        
        return Response({"user": user_data}, status=200)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def get_profile(request, user_id):
    """
    GET /api/auth/profile/:userId
    """
    try:
        table = dynamodb.Table(TABLE_USERS)
        response = table.get_item(Key={"userId": user_id})
        
        user = response.get("Item")
        
        if not user:
            return Response({"error": "User not found"}, status=404)
        
        # Remove password
        user_data = {k: v for k, v in user.items() if k != "password"}
        user_data["id"] = user_data.pop("userId")
        
        return Response({"user": user_data}, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ============================================================
# RESERVATION ENDPOINTS
# ============================================================
@api_view(["POST"])
def check_availability(request):
    """
    POST /api/reservations/availability
    Body: { "restaurantId": "rest1", "date": "2025-11-25", "partySize": 4, "timeRange": {...} }
    """
    try:
        restaurant_id = request.data.get("restaurantId")
        date = request.data.get("date")
        party_size = request.data.get("partySize", 2)
        
        # Mock availability - in production, check actual bookings
        available_slots = []
        for hour in range(18, 22):
            for minute in [0, 30]:
                time_str = f"{hour:02d}:{minute:02d}"
                available_slots.append({
                    "time": time_str,
                    "available": True,
                    "tablesAvailable": random.randint(1, 5)
                })
        
        return Response({
            "restaurantId": restaurant_id,
            "date": date,
            "availableSlots": available_slots
        }, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def create_hold(request):
    """
    POST /api/reservations/hold
    Body: { "userId": "user_001", "restaurantId": "rest1", "date": "2025-11-25", "time": "19:00", "partySize": 4 }
    """
    try:
        from datetime import datetime, timedelta
        
        user_id = request.data.get("userId")
        restaurant_id = request.data.get("restaurantId")
        date = request.data.get("date")
        time = request.data.get("time")
        party_size = request.data.get("partySize", 2)
        
        # Create hold
        hold_id = f"hold_{uuid.uuid4().hex[:8]}"
        expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        
        hold = {
            "holdId": hold_id,
            "userId": user_id,
            "restaurantId": restaurant_id,
            "date": date,
            "time": time,
            "partySize": party_size,
            "expiresAt": expires_at,
            "status": "active",
            "createdAt": datetime.utcnow().isoformat()
        }
        
        # Store in DynamoDB (create table if needed)
        try:
            table = dynamodb.Table(TABLE_HOLDS)
            table.put_item(Item=hold)
        except:
            # Table might not exist, that's ok for now
            pass
        
        return Response({
            "success": True,
            "hold": hold
        }, status=201)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_active_hold(request):
    """
    GET /api/reservations/hold/active?userId=user_001
    """
    try:
        from datetime import datetime
        
        user_id = request.GET.get("userId")
        
        if not user_id:
            return Response({"error": "userId required"}, status=400)
        
        # Query active holds from DynamoDB
        try:
            table = dynamodb.Table(TABLE_HOLDS)
            response = table.scan(
                FilterExpression="userId = :uid AND #st = :status",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={
                    ":uid": user_id,
                    ":status": "active"
                }
            )
            
            holds = response.get("Items", [])
            
            # Filter out expired holds
            now = datetime.utcnow()
            active_holds = []
            for hold in holds:
                expires_at_str = hold.get("expiresAt", "")
                try:
                    expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                    if expires_at > now:
                        active_holds.append(hold)
                except:
                    pass
            
            if active_holds:
                # Return the most recent active hold
                active_holds.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
                return Response({"hold": active_holds[0]}, status=200)
            else:
                return Response({"hold": None}, status=200)
                
        except Exception as e:
            print(f"DynamoDB error: {e}")
            return Response({"hold": None}, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def confirm_reservation(request):
    """
    POST /api/reservations/confirm
    Body: { "holdId": "hold_123", "userId": "user_001", "paymentMethod": "card_..." }
    """
    try:
        from datetime import datetime
        
        hold_id = request.data.get("holdId")
        user_id = request.data.get("userId")
        payment_method = request.data.get("paymentMethod")
        special_requests = request.data.get("specialRequests", "")
        
        # Fetch the hold to get date, time, partySize, restaurantId
        try:
            table = dynamodb.Table(TABLE_HOLDS)
            response = table.get_item(Key={"holdId": hold_id})
            hold = response.get("Item", {})
        except:
            hold = {}
        
        # Create reservation
        reservation_id = f"res_{uuid.uuid4().hex[:8]}"
        confirmation_code = f"{random.randint(100, 999)}{chr(random.randint(65, 90))}{chr(random.randint(65, 90))}{chr(random.randint(65, 90))}"
        reservation = {
            "reservationId": reservation_id,
            "userId": user_id or hold.get("userId"),
            "holdId": hold_id,
            "restaurantId": hold.get("restaurantId", ""),
            "date": hold.get("date", ""),
            "time": hold.get("time", ""),
            "partySize": hold.get("partySize", 2),
            "status": "confirmed",
            "confirmationCode": confirmation_code,
            "depositAmount": 100,
            "paymentMethod": payment_method,
            "specialRequests": special_requests,
            "createdAt": datetime.utcnow().isoformat()
        }
        
        return Response({
            "success": True,
            "reservation": reservation
        }, status=201)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_user_reservations(request, user_id):
    """
    GET /api/reservations/user/:userId?filter=upcoming|past|all
    """
    try:
        from datetime import date
        filter_type = request.GET.get('filter', 'upcoming')
        
        reservations_table = dynamodb.Table(TABLE_RESERVATIONS)
        
        # Query using GSI: UserReservations (userId, date)
        today = date.today().isoformat()
        
        response = reservations_table.query(
            IndexName='UserReservations',
            KeyConditionExpression='userId = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        
        reservations = response.get('Items', [])
        
        # Filter by date/status
        if filter_type == 'upcoming':
            reservations = [r for r in reservations if r.get('date', '') >= today and r.get('status') != 'cancelled']
        elif filter_type == 'past':
            reservations = [r for r in reservations if r.get('date', '') < today or r.get('status') in ['completed', 'cancelled', 'no-show']]
        
        # Convert Decimals to JSON-safe format
        import json
        return JsonResponse(json.loads(json.dumps(reservations, cls=DecimalEncoder)), safe=False)
        
    except Exception as e:
        print(f"Error fetching reservations: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(["GET"])
def get_reservation(request, reservation_id):
    """
    GET /api/reservations/:id?userId=user_001
    """
    try:
        user_id = request.GET.get("userId")
        
        # In production, fetch from DynamoDB
        return Response({"error": "Reservation not found"}, status=404)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["PATCH"])
def modify_reservation(request, reservation_id):
    """
    PATCH /api/reservations/:id
    Body: { "userId": "user_001", "date": "2025-11-26", ... }
    """
    try:
        # In production, update in DynamoDB
        return Response({"error": "Not implemented"}, status=501)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["DELETE"])
def cancel_reservation(request, reservation_id):
    """
    DELETE /api/reservations/:id
    Body: { "userId": "user_001" }
    """
    try:
        # In production, cancel and calculate refund
        return Response({
            "success": True,
            "message": "Reservation cancelled",
            "refundAmount": 75,
            "refundPercentage": 75
        }, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)



# ============================================================
# FAVORITES ENDPOINTS
# ============================================================


@api_view(["POST", "DELETE"])
def favorites_handler(request):
    """
    POST /api/favorites - Add favorite
    DELETE /api/favorites?userId=X&restaurantId=Y - Remove favorite
    """
    from datetime import datetime
    
    if request.method == "POST":
        try:
            user_id = request.data.get("userId")
            restaurant_id = request.data.get("restaurantId")
            restaurant_name = request.data.get("restaurantName")
            restaurant_image = request.data.get("restaurantImage", "")
            match_score = request.data.get("matchScore", 0)
            
            if not user_id or not restaurant_id:
                return Response({"error": "userId and restaurantId required"}, status=400)
            
            # Check if already favorited
            table = dynamodb.Table(TABLE_FAVORITES)
            try:
                existing = table.get_item(
                    Key={
                        "userId": user_id,
                        "restaurantId": restaurant_id
                    }
                )
                if "Item" in existing:
                    return Response({
                        "message": "Already favorited",
                        "favorite": json.loads(json.dumps(existing["Item"], cls=DecimalEncoder))
                    }, status=200)
            except Exception as e:
                print(f"Check existing favorite error: {e}")
            
            # Create favorite
            favorite = {
                "userId": user_id,
                "restaurantId": restaurant_id,
                "restaurantName": restaurant_name,
                "restaurantImage": restaurant_image,
                "matchScore": match_score,
                "likedAt": datetime.utcnow().isoformat() + "Z"
            }
            
            # Convert floats to Decimal for DynamoDB
            favorite = convert_floats_to_decimal(favorite)
            
            # Save to DynamoDB
            table.put_item(Item=favorite)
            
            print(f"Added favorite: {user_id} -> {restaurant_name}")
            
            # Convert Decimal back to float for JSON response
            favorite_response = json.loads(json.dumps(favorite, cls=DecimalEncoder))
            
            return Response({
                "success": True,
                "favorite": favorite_response
            }, status=201)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
    
    elif request.method == "DELETE":
        try:
            user_id = request.GET.get("userId")
            restaurant_id = request.GET.get("restaurantId")
            
            if not user_id or not restaurant_id:
                return Response({"error": "userId and restaurantId required"}, status=400)
            
            table = dynamodb.Table(TABLE_FAVORITES)
            
            # Delete the favorite
            table.delete_item(
                Key={
                    "userId": user_id,
                    "restaurantId": restaurant_id
                }
            )
            
            print(f"Removed favorite: {user_id} -> {restaurant_id}")
            
            return Response({
                "success": True,
                "message": "Favorite removed"
            }, status=200)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def add_favorite(request):
    """
    POST /api/favorites
    Body: {
      "userId": "user_123",
      "restaurantId": "rest_xyz",
      "restaurantName": "Joe's Pizza",
      "restaurantImage": "https://...",
      "matchScore": 85
    }
    """
    try:
        from datetime import datetime
        
        user_id = request.data.get("userId")
        restaurant_id = request.data.get("restaurantId")
        restaurant_name = request.data.get("restaurantName")
        restaurant_image = request.data.get("restaurantImage", "")
        match_score = request.data.get("matchScore", 0)
        
        if not user_id or not restaurant_id:
            return Response({"error": "userId and restaurantId required"}, status=400)
        
        # Check if already favorited
        table = dynamodb.Table(TABLE_FAVORITES)
        try:
            existing = table.get_item(
                Key={
                    "userId": user_id,
                    "restaurantId": restaurant_id
                }
            )
            if "Item" in existing:
                return Response({
                    "message": "Already favorited",
                    "favorite": existing["Item"]
                }, status=200)
        except Exception as e:
            print(f"Check existing favorite error: {e}")
        
        # Create favorite
        favorite = {
            "userId": user_id,
            "restaurantId": restaurant_id,
            "restaurantName": restaurant_name,
            "restaurantImage": restaurant_image,
            "matchScore": match_score,
            "likedAt": datetime.utcnow().isoformat() + "Z"
        }
        
        # Convert floats to Decimal for DynamoDB
        favorite = convert_floats_to_decimal(favorite)
        
        # Save to DynamoDB
        table.put_item(Item=favorite)
        
        print(f"Added favorite: {user_id} -> {restaurant_name}")
        
        return Response({
            "success": True,
            "favorite": favorite
        }, status=201)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_favorites(request, user_id):
    """
    GET /api/favorites/:userId?limit=20
    Returns list of user's favorited restaurants
    """
    try:
        limit = int(request.GET.get("limit", 50))
        
        table = dynamodb.Table(TABLE_FAVORITES)
        
        # Query all favorites for this user
        response = table.query(
            KeyConditionExpression="userId = :uid",
            ExpressionAttributeValues={":uid": user_id},
            ScanIndexForward=False,  # Most recent first
            Limit=limit
        )
        
        favorites = response.get("Items", [])
        
        print(f"Retrieved {len(favorites)} favorites for user {user_id}")
        
        return Response(favorites, status=200)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["DELETE"])
def remove_favorite(request):
    """
    DELETE /api/favorites?userId=user_123&restaurantId=rest_xyz
    """
    try:
        user_id = request.GET.get("userId")
        restaurant_id = request.GET.get("restaurantId")
        
        if not user_id or not restaurant_id:
            return Response({"error": "userId and restaurantId required"}, status=400)
        
        table = dynamodb.Table(TABLE_FAVORITES)
        
        # Delete the favorite
        table.delete_item(
            Key={
                "userId": user_id,
                "restaurantId": restaurant_id
            }
        )
        
        print(f"✅ Removed favorite: {user_id} -> {restaurant_id}")
        
        return Response({
            "success": True,
            "message": "Favorite removed"
        }, status=200)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def check_favorite(request):
    """
    GET /api/favorites/check?userId=user_123&restaurantId=rest_xyz
    Returns: { "isFavorite": true }
    """
    try:
        user_id = request.GET.get("userId")
        restaurant_id = request.GET.get("restaurantId")
        
        if not user_id or not restaurant_id:
            return Response({"error": "userId and restaurantId required"}, status=400)
        
        table = dynamodb.Table(TABLE_FAVORITES)
        
        response = table.get_item(
            Key={
                "userId": user_id,
                "restaurantId": restaurant_id
            }
        )
        
        is_favorite = "Item" in response
        
        return Response({"isFavorite": is_favorite}, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ============================================================================
# USER STATS ENDPOINTS
# ============================================================================

@api_view(["GET"])
def get_user_stats(request, user_id):
    """Get user statistics from UserStats table"""
    try:        
        stats_table = dynamodb.Table(TABLE_USER_STATS)
        
        response = stats_table.get_item(Key={'userId': user_id})
        
        if 'Item' not in response:
            # Return zeros if no stats yet
            return JsonResponse({
                'totalLikes': 0,
                'totalReservations': 0,
                'accountAge': 0,
                'topCuisines': [],
                'lastActive': None
            })
        
        stats = response['Item']
        
        # Convert Decimals to regular numbers
        return JsonResponse({
            'totalLikes': int(stats.get('totalLikes', 0)),
            'totalReservations': int(stats.get('totalReservations', 0)),
            'accountAge': int(stats.get('accountAge', 0)),
            'topCuisines': stats.get('topCuisines', []),
            'lastActive': stats.get('lastActive')
        })
        
    except Exception as e:
        print(f"Error fetching user stats: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)