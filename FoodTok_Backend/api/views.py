# api/views.py
import os
import uuid
import random
import json
import bcrypt
import requests
import traceback
from datetime import date, datetime, timedelta
from decimal import Decimal
from io import BytesIO
from django.http import JsonResponse

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .aws import get_dynamodb, get_s3

# ===============================
# Load environment variables
# ===============================
IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"
LOCAL_S3_ENDPOINT = os.getenv("LOCAL_S3_ENDPOINT")
BUCKET_IMAGES = os.getenv("S3_IMAGE_BUCKET", "foodtok-local-images")

TABLE_USERS = os.getenv("DDB_USERS_TABLE", "Users")
TABLE_FAVORITES = os.getenv("DDB_FAVORITES_TABLE", "Favorites")
TABLE_RESERVATIONS = os.getenv("DDB_RESERVATIONS_TABLE", "Reservations")
TABLE_HOLDS = os.getenv("DDB_HOLDS_TABLE", "Holds")

dynamodb = get_dynamodb()
s3 = get_s3()


# ----------------------------------------------------
# Helper Class & functions
# ----------------------------------------------------
class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal to float for JSON serialization"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)
    
def convert_floats_to_decimal(obj):
    """Recursively convert all float values to Decimal for DynamoDB"""
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
# api/helloECS - Health Check
# ----------------------------------------------------
@api_view(["GET"])
def hello_ecs(request):
    return Response({"status": "healthy"}, status=200)


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
      "email": "john@example.com",  // optional
      "bio": "..."          // optional
    }
    """
    try:
        user_id = request.data.get("userId")
        preferences = request.data.get("preferences", {})
        first_name = request.data.get("firstName")
        last_name = request.data.get("lastName")
        email = request.data.get("email")
        bio = request.data.get("bio")
        
        if not user_id:
            return Response({"error": "userId required"}, status=400)
        
        # Validate email format if provided
        if email is not None:
            import re
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, email):
                return Response({"error": "Invalid email format"}, status=400)
            
            # Check if email is already taken by another user
            table = dynamodb.Table(TABLE_USERS)
            scan_response = table.scan(
                FilterExpression="email = :email AND userId <> :userId",
                ExpressionAttributeValues={
                    ":email": email,
                    ":userId": user_id
                }
            )
            if scan_response.get("Items"):
                return Response({"error": "Email already in use"}, status=400)
        
        """
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
        """
        
        preferences = convert_floats_to_decimal(preferences)
        
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
        
        if email is not None:
            update_expr += ", email = :email"
            expr_values[":email"] = email
        
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


@api_view(["POST"])
def change_password(request):
    """
    POST /api/auth/change-password
    Body: { 
      "userId": "user_001",
      "currentPassword": "oldpass123",
      "newPassword": "newpass123"
    }
    """
    try:
        user_id = request.data.get("userId")
        current_password = request.data.get("currentPassword")
        new_password = request.data.get("newPassword")
        
        if not user_id or not current_password or not new_password:
            return Response({"error": "userId, currentPassword, and newPassword required"}, status=400)
        
        if len(new_password) < 8:
            return Response({"error": "New password must be at least 8 characters"}, status=400)
        
        # Get user from DynamoDB
        table = dynamodb.Table(TABLE_USERS)
        response = table.get_item(Key={"userId": user_id})
        
        user = response.get("Item")
        if not user:
            return Response({"error": "User not found"}, status=404)
        
        # Verify current password
        stored_password = user.get("password", "")
        if isinstance(stored_password, str) and stored_password.startswith("$2b$"):
            # Hashed password
            if not bcrypt.checkpw(current_password.encode('utf-8'), stored_password.encode('utf-8')):
                return Response({"error": "Current password is incorrect"}, status=401)
        else:
            # Legacy plain text
            if stored_password != current_password:
                return Response({"error": "Current password is incorrect"}, status=401)
        
        # Hash and update to new password
        from datetime import datetime, timezone
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        table.update_item(
            Key={"userId": user_id},
            UpdateExpression="SET password = :pwd, updatedAt = :updated",
            ExpressionAttributeValues={
                ":pwd": hashed_password,
                ":updated": datetime.now(timezone.utc).isoformat()
            }
        )
        
        return Response({"message": "Password changed successfully"}, status=200)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
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

        try:
            table = dynamodb.Table(TABLE_RESERVATIONS)
            table.put_item(Item=reservation)
            print(f"Created reservation: {reservation_id} for user: {user_id}")
        except Exception as e:
            print(f"Error saving reservation to DynamoDB: {e}")
        
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
        filter_type = request.GET.get('filter', 'upcoming')
        
        if not user_id:
            return Response({"error": "userId required"}, status=400)
        
        reservations_table = dynamodb.Table(TABLE_RESERVATIONS)
        
        # Query using GSI
        today = date.today().isoformat()
        
        try:
            # Use scan instead of query since GSI may not exist in local DynamoDB
            response = reservations_table.scan(
                FilterExpression='userId = :uid',
                ExpressionAttributeValues={':uid': user_id}
            )
            reservations = response.get('Items', [])
            print(f"Found {len(reservations)} reservations for user {user_id}")
            
            # Enrich with restaurant details from Yelp
            YELP_API_KEY = "jR1H2t_k7N0ccSBaAi5ukGt3LnysoxqvLe6V4zF0zNfXtFFgyNf4o9sIsIakY-zB9gODNFf9TnPpKRSNB-DYU2zGom0F_DNDEZvGTAqIeNDqwc9tB6p4AyyjuaYdaXYx"
            
            for reservation in reservations:
                restaurant_id = reservation.get('restaurantId')
                if restaurant_id and not restaurant_id.startswith('test_'):
                    try:
                        # Fetch from Yelp API
                        headers = {'Authorization': f'Bearer {YELP_API_KEY}'}
                        response = requests.get(
                            f'https://api.yelp.com/v3/businesses/{restaurant_id}',
                            headers=headers,
                            timeout=3
                        )
                        if response.status_code == 200:
                            restaurant = response.json()
                            reservation['restaurantName'] = restaurant.get('name', restaurant_id)
                            reservation['restaurantImage'] = restaurant.get('image_url', '')
                            reservation['restaurantCuisine'] = [cat['title'] for cat in restaurant.get('categories', [])]
                            location = restaurant.get('location', {})
                            address_parts = location.get('display_address', [])
                            reservation['restaurantAddress'] = ', '.join(address_parts) if address_parts else ''
                            reservation['restaurantRating'] = restaurant.get('rating', 0)
                            print(f"Enriched reservation with restaurant: {restaurant.get('name')}")
                        else:
                            print(f"Yelp API returned {response.status_code} for {restaurant_id}")
                    except Exception as e:
                        print(f"Could not fetch restaurant {restaurant_id}: {e}")
                        reservation['restaurantName'] = restaurant_id
                        reservation['restaurantCuisine'] = []
        except Exception as e:
            print(f"DynamoDB scan error: {e}")
            reservations = []
        
        if filter_type == 'upcoming':
            reservations = [
                r for r in reservations 
                if r.get('date', '') >= today and r.get('status') != 'cancelled'
            ]
        elif filter_type == 'past':
            reservations = [
                r for r in reservations 
                if r.get('date', '') < today or r.get('status') == 'cancelled'
            ]
        # filter_type == 'all' falls through here with no filtering
        
        # Sort by date
        if filter_type == 'upcoming':
            reservations.sort(key=lambda x: x.get('date', '') + x.get('time', ''))
        else:
            # Past reservations: most recent first
            reservations.sort(key=lambda x: x.get('date', '') + x.get('time', ''), reverse=True)
        
        # Convert Decimals to JSON-safe format
        reservations_json = json.loads(json.dumps(reservations, cls=DecimalEncoder))
        
        return Response({
            "reservations": reservations_json,
            "count": len(reservations_json),
            "filter": filter_type
        }, status=200)
        
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_reservation(request, reservation_id):
    """
    GET /api/reservations/:id?userId=user_001
    """
    try:
        user_id = request.GET.get("userId")
        
        if not reservation_id:
            return Response({"error": "reservationId required"}, status=400)
        
        reservations_table = dynamodb.Table(TABLE_RESERVATIONS)
        
        try:
            response = reservations_table.get_item(
                Key={"reservationId": reservation_id}
            )
            
            reservation = response.get("Item")
            
            if not reservation:
                return Response({"error": "Reservation not found"}, status=404)
            
            # Verify user owns this reservation
            if user_id and reservation.get("userId") != user_id:
                return Response({"error": "Unauthorized"}, status=403)
            
            # Convert Decimals to JSON-safe format
            reservation_json = json.loads(json.dumps(reservation, cls=DecimalEncoder))
            
            return Response(reservation_json, status=200)
            
        except Exception as e:
            print(f"DynamoDB get_item error: {e}")
            return Response({"error": "Reservation not found"}, status=404)
        
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["PATCH"])
def modify_reservation(request, reservation_id):
    """
    PATCH /api/reservations/:id
    Body: { "userId": "user_001", "date": "2025-11-26", ... }
    """
    try:        
        user_id = request.data.get("userId")
        new_date = request.data.get("date")
        new_time = request.data.get("time")
        new_party_size = request.data.get("partySize")
        new_special_requests = request.data.get("specialRequests")
        
        if not reservation_id:
            return Response({"error": "reservationId required"}, status=400)
        
        if not user_id:
            return Response({"error": "userId required for authorization"}, status=400)
        
        reservations_table = dynamodb.Table(TABLE_RESERVATIONS)
        
        # Get existing reservation
        try:
            response = reservations_table.get_item(
                Key={"reservationId": reservation_id}
            )
            reservation = response.get("Item")
            
            if not reservation:
                return Response({"error": "Reservation not found"}, status=404)
            
            # Verify user owns this reservation
            if reservation.get("userId") != user_id:
                return Response({"error": "Unauthorized"}, status=403)
            
            # Only allow modifications if reservation is confirmed and not in the past
            if reservation.get("status") != "confirmed":
                return Response({
                    "error": "Can only modify confirmed reservations"
                }, status=400)
            
            # Check if reservation date is in the past
            reservation_date_str = reservation.get("date", "")
            if reservation_date_str:
                try:
                    reservation_date = datetime.strptime(reservation_date_str, "%Y-%m-%d").date()
                    if reservation_date < date.today():
                        return Response({
                            "error": "Cannot modify past reservations"
                        }, status=400)
                except:
                    pass
            
        except Exception as e:
            print(f"DynamoDB get_item error: {e}")
            return Response({"error": "Reservation not found"}, status=404)
        
        # Build update expression dynamically
        update_expr = "SET updatedAt = :updatedAt"
        expr_values = {":updatedAt": datetime.utcnow().isoformat() + "Z"}
        expr_names = {}
        
        # Update date (also update the GSI sort key)
        if new_date is not None:
            update_expr += ", #date = :date"
            expr_names["#date"] = "date"
            expr_values[":date"] = new_date
        
        # Update time
        if new_time is not None:
            update_expr += ", #time = :time"
            expr_names["#time"] = "time"
            expr_values[":time"] = new_time
        
        # Update party size and recalculate deposit
        if new_party_size is not None:
            try:
                new_party_size_int = int(new_party_size)
                if new_party_size_int < 1 or new_party_size_int > 20:
                    return Response({
                        "error": "Party size must be between 1 and 20"
                    }, status=400)
                
                # Recalculate deposit ($25 per person)
                deposit_per_person = 25
                new_deposit = Decimal(str(deposit_per_person * new_party_size_int))
                
                update_expr += ", partySize = :partySize, depositAmount = :depositAmount"
                expr_values[":partySize"] = new_party_size_int
                expr_values[":depositAmount"] = new_deposit
            except ValueError:
                return Response({"error": "Invalid partySize"}, status=400)
        
        # Update special requests
        if new_special_requests is not None:
            update_expr += ", specialRequests = :specialRequests"
            expr_values[":specialRequests"] = str(new_special_requests)
        
        # Only update if there are changes
        if len(expr_values) == 1:  # Only updatedAt
            return Response({
                "error": "No fields to update"
            }, status=400)
        
        # Update reservation in DynamoDB
        try:
            update_response = reservations_table.update_item(
                Key={"reservationId": reservation_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values,
                ExpressionAttributeNames=expr_names if expr_names else None,
                ReturnValues="ALL_NEW"
            )
            
            updated_reservation = update_response.get("Attributes", {})
            
            # Convert Decimals to JSON-safe format
            reservation_json = json.loads(json.dumps(updated_reservation, cls=DecimalEncoder))
            
            return Response({
                "success": True,
                "reservation": reservation_json
            }, status=200)
            
        except Exception as e:
            print(f"DynamoDB update_item error: {e}")
            return Response({"error": f"Failed to update reservation: {str(e)}"}, status=500)
        
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["DELETE"])
def cancel_reservation(request, reservation_id):
    """
    DELETE /api/reservations/:id
    Body: { "userId": "user_001" }
    """
    try:
        from datetime import datetime
        from decimal import Decimal
        
        user_id = request.data.get("userId")
        
        if not reservation_id or not user_id:
            return Response({"error": "reservationId and userId required"}, status=400)
        
        reservations_table = dynamodb.Table(TABLE_RESERVATIONS)
        
        # Get existing reservation
        response = reservations_table.get_item(Key={"reservationId": reservation_id})
        reservation = response.get("Item")
        
        if not reservation:
            return Response({"error": "Reservation not found"}, status=404)
        
        if reservation.get("userId") != user_id:
            return Response({"error": "Unauthorized"}, status=403)
            
        if reservation.get("status") == "cancelled":
            return Response({"error": "Reservation already cancelled"}, status=400)
        
        # Calculate refund
        reservation_date_str = reservation.get("date", "")
        reservation_time_str = reservation.get("time", "00:00")
        deposit_amount = float(reservation.get("depositAmount", 0))
        
        try:
            reservation_dt_str = f"{reservation_date_str}T{reservation_time_str}:00"
            # Parse as naive datetime (assuming restaurant local time)
            reservation_datetime = datetime.fromisoformat(reservation_dt_str)
            
            # Use datetime.now() to compare similar "wall clock" times
            # Alternatively, force everything to UTC if you store timezones.
            # Assuming 'date' stored is effectively "Local Server Time/Restaurant Time"
            now = datetime.now() 
            
            time_diff = reservation_datetime - now
            hours_until = time_diff.total_seconds() / 3600
            
            # Logic from README
            if hours_until >= 24:
                refund_percentage = 100
            elif hours_until >= 4:
                refund_percentage = 50
            else:
                refund_percentage = 0 
                
            # If time has already passed (negative hours), no refund
            if hours_until < 0:
                refund_percentage = 0
            
            refund_amount = deposit_amount * (refund_percentage / 100)
            
        except Exception as e:
            print(f"Error calculating refund: {e}")
            refund_percentage = 0
            refund_amount = 0
            hours_until = 0
        
        # Update DynamoDB
        update_response = reservations_table.update_item(
            Key={"reservationId": reservation_id},
            UpdateExpression="SET #status = :status, cancelledAt = :cancelledAt, refundAmount = :refundAmount, refundPercentage = :refundPercentage, updatedAt = :updatedAt",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": "cancelled",
                ":cancelledAt": datetime.utcnow().isoformat() + "Z", # Metadata can stay UTC
                ":refundAmount": Decimal(str(refund_amount)),
                ":refundPercentage": Decimal(str(refund_percentage)),
                ":updatedAt": datetime.utcnow().isoformat() + "Z"
            },
            ReturnValues="ALL_NEW"
        )
        
        updated_reservation = json.loads(json.dumps(update_response.get("Attributes", {}), cls=DecimalEncoder))
        
        return Response({
            "success": True,
            "message": "Reservation cancelled",
            "reservation": updated_reservation,
            "refund": {
                "amount": refund_amount,
                "percentage": refund_percentage,
                "hoursUntilReservation": round(hours_until, 2)
            }
        }, status=200)
        
    except Exception as e:
        traceback.print_exc()
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
        
        print(f"Removed favorite: {user_id} -> {restaurant_id}")
        
        return Response({
            "success": True,
            "message": "Favorite removed"
        }, status=200)
        
    except Exception as e:
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


# ----------------------------------------------------
# DISCOVERY / MATCH SCORE LOGIC
# ----------------------------------------------------


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