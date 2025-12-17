# Backend API Documentation

FoodTok Backend API provides RESTful endpoints for user authentication, restaurant reservations, and favorites management. Built with Django REST Framework and DynamoDB.

**Base URL:** `http://localhost:8080/api` (local) | `https://{your-alb-url}/api` (production)

---

## Table of Contents

1. [Health Check](#health-check)
2. [Authentication](#authentication)
3. [Reservations](#reservations)
4. [Favorites](#favorites)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)

---

## Health Check

### Check API Health

**Endpoint:** `GET /helloECS`

**Description:** Simple health check endpoint to verify the API is running.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Authentication

### Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user with email and password. Supports both bcrypt-hashed passwords and legacy plain-text passwords (which are automatically migrated to bcrypt on successful login).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "user_a1b2c3d4",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "preferences": {
      "cuisines": ["italian", "japanese"],
      "dietaryRestrictions": ["vegetarian"],
      "priceRange": "$$",
      "maxDistance": 10,
      "favoriteRestaurants": []
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Email and password required
- `401` - Invalid credentials
- `500` - Server error

---

### Signup

**Endpoint:** `POST /auth/signup`

**Description:** Register a new user account with bcrypt password hashing.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepass123",
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Success Response (201):**
```json
{
  "user": {
    "id": "user_x9y8z7w6",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "preferences": {
      "cuisines": [],
      "dietaryRestrictions": [],
      "priceRange": "$$",
      "maxDistance": 10,
      "favoriteRestaurants": []
    },
    "createdAt": "2025-01-20T14:22:00Z",
    "updatedAt": "2025-01-20T14:22:00Z"
  }
}
```

**Error Responses:**
- `400` - Email and password required OR User already exists
- `500` - Server error

---

### Update Preferences

**Endpoint:** `PATCH /auth/preferences`

**Description:** Update user preferences and profile information. Supports partial updates - only provided fields are modified.

**Request Body:**
```json
{
  "userId": "user_001",
  "preferences": {
    "cuisines": ["italian", "mexican", "thai"],
    "priceRange": "$$$",
    "dietaryRestrictions": ["gluten-free"],
    "maxDistance": 15
  },
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "bio": "Food enthusiast and explorer"
}
```

**Parameters:**
- `userId` (required) - User ID
- `preferences` (optional) - User preference object
- `firstName` (optional) - User's first name
- `lastName` (optional) - User's last name
- `email` (optional) - User's email (validated and checked for uniqueness)
- `bio` (optional) - User biography

**Success Response (200):**
```json
{
  "user": {
    "id": "user_001",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Food enthusiast and explorer",
    "preferences": {
      "cuisines": ["italian", "mexican", "thai"],
      "priceRange": "$$$",
      "dietaryRestrictions": ["gluten-free"],
      "maxDistance": 15
    },
    "updatedAt": "2025-01-20T15:30:00Z"
  }
}
```

**Error Responses:**
- `400` - userId required OR Invalid email format OR Email already in use
- `500` - Server error

---

### Get Profile

**Endpoint:** `GET /auth/profile/:userId`

**Description:** Retrieve user profile information by user ID.

**URL Parameters:**
- `userId` (required) - User ID

**Success Response (200):**
```json
{
  "user": {
    "id": "user_001",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "preferences": { ... },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-20T15:30:00Z"
  }
}
```

**Error Responses:**
- `404` - User not found
- `500` - Server error

---

### Change Password

**Endpoint:** `POST /auth/change-password`

**Description:** Change user password with current password verification. New password must be at least 8 characters.

**Request Body:**
```json
{
  "userId": "user_001",
  "currentPassword": "oldpass123",
  "newPassword": "newsecurepass456"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400` - userId, currentPassword, and newPassword required OR New password must be at least 8 characters
- `401` - Current password is incorrect
- `404` - User not found
- `500` - Server error

---

## Reservations

### Check Availability

**Endpoint:** `POST /reservations/availability`

**Description:** Check available time slots for a restaurant on a specific date.

**Request Body:**
```json
{
  "restaurantId": "rest_abc123",
  "date": "2025-12-25",
  "partySize": 4,
  "timeRange": {
    "start": "17:00",
    "end": "22:00"
  }
}
```

**Success Response (200):**
```json
{
  "restaurantId": "rest_abc123",
  "date": "2025-12-25",
  "availableSlots": [
    {
      "time": "18:00",
      "available": true,
      "tablesAvailable": 3
    },
    {
      "time": "18:30",
      "available": true,
      "tablesAvailable": 5
    },
    {
      "time": "19:00",
      "available": true,
      "tablesAvailable": 2
    }
  ]
}
```

**Notes:**
- Currently returns mock availability data
- Time slots are generated for 30-minute intervals between 6:00 PM and 10:00 PM
- In production, this would check actual bookings against restaurant capacity

---

### Create Hold

**Endpoint:** `POST /reservations/hold`

**Description:** Create a 10-minute reservation hold before payment. This temporarily reserves a table while the user completes checkout.

**Request Body:**
```json
{
  "userId": "user_001",
  "restaurantId": "rest_abc123",
  "date": "2025-12-25",
  "time": "19:00",
  "partySize": 4
}
```

**Success Response (201):**
```json
{
  "success": true,
  "hold": {
    "holdId": "hold_x1y2z3w4",
    "userId": "user_001",
    "restaurantId": "rest_abc123",
    "date": "2025-12-25",
    "time": "19:00",
    "partySize": 4,
    "expiresAt": "2025-12-20T19:10:00Z",
    "status": "active",
    "createdAt": "2025-12-20T19:00:00Z"
  }
}
```

**Notes:**
- Hold expires after 10 minutes
- Hold must be confirmed within expiration time or it will be automatically released

---

### Get Active Hold

**Endpoint:** `GET /reservations/hold/active?userId={userId}`

**Description:** Retrieve user's current active (non-expired) hold.

**Query Parameters:**
- `userId` (required) - User ID

**Success Response (200):**
```json
{
  "hold": {
    "holdId": "hold_x1y2z3w4",
    "userId": "user_001",
    "restaurantId": "rest_abc123",
    "date": "2025-12-25",
    "time": "19:00",
    "partySize": 4,
    "expiresAt": "2025-12-20T19:10:00Z",
    "status": "active",
    "createdAt": "2025-12-20T19:00:00Z"
  }
}
```

**Response when no active hold:**
```json
{
  "hold": null
}
```

**Error Responses:**
- `400` - userId required
- `500` - Server error

---

### Confirm Reservation

**Endpoint:** `POST /reservations/confirm`

**Description:** Convert a hold to a confirmed reservation with payment. Generates a confirmation code.

**Request Body:**
```json
{
  "holdId": "hold_x1y2z3w4",
  "userId": "user_001",
  "paymentMethod": {
    "type": "credit-card",
    "last4": "4242"
  },
  "specialRequests": "Window seat preferred"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "reservation": {
    "reservationId": "res_a9b8c7d6",
    "userId": "user_001",
    "holdId": "hold_x1y2z3w4",
    "restaurantId": "rest_abc123",
    "date": "2025-12-25",
    "time": "19:00",
    "partySize": 4,
    "status": "confirmed",
    "confirmationCode": "123ABC",
    "depositAmount": 100,
    "paymentMethod": {
      "type": "credit-card",
      "last4": "4242"
    },
    "specialRequests": "Window seat preferred",
    "createdAt": "2025-12-20T19:05:00Z"
  }
}
```

**Notes:**
- Deposit amount is $25 per person
- Confirmation code is a unique 6-character alphanumeric code (e.g., "123ABC")

---

### Get User Reservations

**Endpoint:** `GET /reservations/user/:userId?filter={upcoming|past|all}`

**Description:** Retrieve user's reservation history with optional filtering. Automatically enriches reservations with restaurant details from Yelp API.

**URL Parameters:**
- `userId` (required) - User ID

**Query Parameters:**
- `filter` (optional) - Filter type: `upcoming`, `past`, or `all` (default: `upcoming`)

**Success Response (200):**
```json
{
  "reservations": [
    {
      "reservationId": "res_a9b8c7d6",
      "userId": "user_001",
      "restaurantId": "rest_abc123",
      "restaurantName": "Joe's Italian Kitchen",
      "restaurantImage": "https://...",
      "restaurantCuisine": ["Italian", "Pizza"],
      "restaurantAddress": "123 Main St, New York, NY 10001",
      "restaurantRating": 4.5,
      "date": "2025-12-25",
      "time": "19:00",
      "partySize": 4,
      "status": "confirmed",
      "confirmationCode": "123ABC",
      "depositAmount": 100,
      "specialRequests": "Window seat preferred",
      "createdAt": "2025-12-20T19:05:00Z"
    }
  ],
  "count": 1,
  "filter": "upcoming"
}
```

**Filter Types:**
- `upcoming` - Reservations on/after today that are not cancelled
- `past` - Reservations before today OR cancelled reservations
- `all` - All reservations regardless of date/status

**Sorting:**
- Upcoming reservations: Sorted by date/time (earliest first)
- Past reservations: Sorted by date/time (most recent first)

---

### Get Reservation Details

**Endpoint:** `GET /reservations/:reservationId?userId={userId}`

**Description:** Retrieve detailed information about a specific reservation.

**URL Parameters:**
- `reservationId` (required) - Reservation ID

**Query Parameters:**
- `userId` (optional) - User ID for authorization verification

**Success Response (200):**
```json
{
  "reservationId": "res_a9b8c7d6",
  "userId": "user_001",
  "restaurantId": "rest_abc123",
  "date": "2025-12-25",
  "time": "19:00",
  "partySize": 4,
  "status": "confirmed",
  "confirmationCode": "123ABC",
  "depositAmount": 100,
  "specialRequests": "Window seat preferred",
  "createdAt": "2025-12-20T19:05:00Z"
}
```

**Error Responses:**
- `400` - reservationId required
- `403` - Unauthorized (user does not own this reservation)
- `404` - Reservation not found
- `500` - Server error

---

### Modify Reservation

**Endpoint:** `PATCH /reservations/:reservationId`

**Description:** Modify an existing confirmed reservation. Can update date, time, party size, or special requests. Only confirmed, future reservations can be modified.

**URL Parameters:**
- `reservationId` (required) - Reservation ID

**Request Body:**
```json
{
  "userId": "user_001",
  "date": "2025-12-26",
  "time": "20:00",
  "partySize": 6,
  "specialRequests": "Anniversary celebration - please prepare dessert"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "reservation": {
    "reservationId": "res_a9b8c7d6",
    "userId": "user_001",
    "restaurantId": "rest_abc123",
    "date": "2025-12-26",
    "time": "20:00",
    "partySize": 6,
    "status": "confirmed",
    "confirmationCode": "123ABC",
    "depositAmount": 150,
    "specialRequests": "Anniversary celebration - please prepare dessert",
    "updatedAt": "2025-12-21T10:30:00Z"
  }
}
```

**Notes:**
- Deposit amount is automatically recalculated when party size changes ($25 per person)
- Party size must be between 1 and 20
- All fields are optional - only provided fields will be updated

**Error Responses:**
- `400` - reservationId required OR userId required OR No fields to update OR Can only modify confirmed reservations OR Cannot modify past reservations OR Party size must be between 1 and 20 OR Invalid partySize
- `403` - Unauthorized (user does not own this reservation)
- `404` - Reservation not found
- `500` - Server error

---

### Cancel Reservation

**Endpoint:** `DELETE /reservations/:reservationId`

**Description:** Cancel a reservation and calculate refund based on cancellation time. Implements tiered refund policy.

**URL Parameters:**
- `reservationId` (required) - Reservation ID

**Request Body:**
```json
{
  "userId": "user_001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reservation cancelled",
  "reservation": {
    "reservationId": "res_a9b8c7d6",
    "userId": "user_001",
    "status": "cancelled",
    "cancelledAt": "2025-12-20T10:00:00Z",
    "refundAmount": 100,
    "refundPercentage": 100,
    "updatedAt": "2025-12-20T10:00:00Z"
  },
  "refund": {
    "amount": 100,
    "percentage": 100,
    "hoursUntilReservation": 125.5
  }
}
```

**Refund Policy:**

| **Time Before Reservation** | **Refund Percentage** |
|:----------------------------|:---------------------:|
| 24+ hours                   |         100%          |
| 4-24 hours                  |          50%          |
| < 4 hours                   |          0%           |
| After reservation time      |          0%           |

**Error Responses:**
- `400` - reservationId and userId required OR Reservation already cancelled
- `403` - Unauthorized (user does not own this reservation)
- `404` - Reservation not found
- `500` - Server error

---

## Favorites

### Add Favorite (Combined Handler)

**Endpoint:** `POST /favorites`

**Description:** Add a restaurant to user's favorites list. Prevents duplicates automatically.

**Request Body:**
```json
{
  "userId": "user_001",
  "restaurantId": "rest_abc123",
  "restaurantName": "Joe's Italian Kitchen",
  "restaurantImage": "https://example.com/image.jpg",
  "matchScore": 85
}
```

**Success Response (201):**
```json
{
  "success": true,
  "favorite": {
    "userId": "user_001",
    "restaurantId": "rest_abc123",
    "restaurantName": "Joe's Italian Kitchen",
    "restaurantImage": "https://example.com/image.jpg",
    "matchScore": 85,
    "likedAt": "2025-12-20T15:30:00Z"
  }
}
```

**Response if already favorited (200):**
```json
{
  "message": "Already favorited",
  "favorite": { ... }
}
```

**Error Responses:**
- `400` - userId and restaurantId required
- `500` - Server error

---

### Remove Favorite (Combined Handler)

**Endpoint:** `DELETE /favorites?userId={userId}&restaurantId={restaurantId}`

**Description:** Remove a restaurant from user's favorites list.

**Query Parameters:**
- `userId` (required) - User ID
- `restaurantId` (required) - Restaurant ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Favorite removed"
}
```

**Error Responses:**
- `400` - userId and restaurantId required
- `500` - Server error

---

### Get Favorites

**Endpoint:** `GET /favorites/:userId?limit={limit}`

**Description:** Retrieve user's list of favorited restaurants, sorted by most recent first.

**URL Parameters:**
- `userId` (required) - User ID

**Query Parameters:**
- `limit` (optional) - Maximum number of results (default: 50)

**Success Response (200):**
```json
[
  {
    "userId": "user_001",
    "restaurantId": "rest_abc123",
    "restaurantName": "Joe's Italian Kitchen",
    "restaurantImage": "https://example.com/image.jpg",
    "matchScore": 85,
    "likedAt": "2025-12-20T15:30:00Z"
  },
  {
    "userId": "user_001",
    "restaurantId": "rest_xyz789",
    "restaurantName": "Sushi Palace",
    "restaurantImage": "https://example.com/sushi.jpg",
    "matchScore": 92,
    "likedAt": "2025-12-19T12:00:00Z"
  }
]
```

**Error Responses:**
- `500` - Server error

---

### Check Favorite Status

**Endpoint:** `GET /favorites/check?userId={userId}&restaurantId={restaurantId}`

**Description:** Check if a specific restaurant is in user's favorites.

**Query Parameters:**
- `userId` (required) - User ID
- `restaurantId` (required) - Restaurant ID

**Success Response (200):**
```json
{
  "isFavorite": true
}
```

**Error Responses:**
- `400` - userId and restaurantId required
- `500` - Server error

---

## Data Models

### User

```javascript
{
  userId: String,          // Primary key: "user_abc123"
  email: String,           // Unique email address
  password: String,        // Bcrypt-hashed password
  firstName: String,
  lastName: String,
  bio: String,            // Optional user biography
  preferences: {
    cuisines: [String],           // e.g., ["italian", "japanese"]
    dietaryRestrictions: [String], // e.g., ["vegetarian", "gluten-free"]
    priceRange: String,           // e.g., "$$" or "$$$"
    maxDistance: Number,          // in miles
    favoriteRestaurants: [String] // Restaurant IDs
  },
  createdAt: String,      // ISO 8601 timestamp
  updatedAt: String       // ISO 8601 timestamp
}
```

### Reservation

```javascript
{
  reservationId: String,    // Primary key: "res_abc123"
  userId: String,           // User who made the reservation
  holdId: String,           // Original hold ID
  restaurantId: String,     // Restaurant identifier
  restaurantName: String,   // Enriched from Yelp API
  restaurantImage: String,  // Enriched from Yelp API
  restaurantCuisine: [String], // Enriched from Yelp API
  restaurantAddress: String,   // Enriched from Yelp API
  restaurantRating: Number,    // Enriched from Yelp API
  date: String,            // Format: "YYYY-MM-DD"
  time: String,            // Format: "HH:MM" (24-hour)
  partySize: Number,       // Number of guests (1-20)
  status: String,          // "confirmed" | "cancelled"
  confirmationCode: String, // 6-character code (e.g., "123ABC")
  depositAmount: Number,   // Dollar amount ($25 per person)
  paymentMethod: Object,   // Payment details
  specialRequests: String, // Optional customer notes
  cancelledAt: String,     // ISO 8601 timestamp (if cancelled)
  refundAmount: Number,    // Refund amount (if cancelled)
  refundPercentage: Number, // Refund percentage (if cancelled)
  createdAt: String,       // ISO 8601 timestamp
  updatedAt: String        // ISO 8601 timestamp
}
```

### Hold

```javascript
{
  holdId: String,          // Primary key: "hold_abc123"
  userId: String,          // User who created the hold
  restaurantId: String,    // Restaurant identifier
  date: String,            // Format: "YYYY-MM-DD"
  time: String,            // Format: "HH:MM" (24-hour)
  partySize: Number,       // Number of guests
  expiresAt: String,       // ISO 8601 timestamp (10 minutes after creation)
  status: String,          // "active" | "expired" | "confirmed"
  createdAt: String        // ISO 8601 timestamp
}
```

### Favorite

```javascript
{
  userId: String,          // Partition key: "user_abc123"
  restaurantId: String,    // Sort key: "rest_xyz789"
  restaurantName: String,
  restaurantImage: String,
  matchScore: Number,      // 0-100 compatibility score
  likedAt: String          // ISO 8601 timestamp
}
```

---

## Error Handling

All endpoints follow consistent error response format:

### Error Response Structure

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| **Status Code** | **Meaning**           | **Usage**                                |
|:----------------|:----------------------|:-----------------------------------------|
| 200             | OK                    | Successful GET, PATCH, DELETE requests   |
| 201             | Created               | Successful POST requests creating data   |
| 400             | Bad Request           | Missing required fields or invalid input |
| 401             | Unauthorized          | Invalid credentials                      |
| 403             | Forbidden             | User doesn't have permission             |
| 404             | Not Found             | Resource doesn't exist                   |
| 500             | Internal Server Error | Unexpected server error                  |

### Example Error Responses

**Missing Required Field:**
```json
{
  "error": "userId and restaurantId required"
}
```

**Authentication Failed:**
```json
{
  "error": "Invalid credentials"
}
```

**Resource Not Found:**
```json
{
  "error": "Reservation not found"
}
```

**Validation Error:**
```json
{
  "error": "New password must be at least 8 characters"
}
```

---

## Helper Functions

### Match Score Calculation

The backend includes a `calculate_match_score()` function that calculates restaurant compatibility scores (0-100) based on user preferences:

**Scoring Breakdown:**

| **Factor**            | **Points** | **Logic**                                      |
|:----------------------|:----------:|:-----------------------------------------------|
| Cuisine Match         |     40     | 40 if matches preference, 10 for new cuisine   |
| Price Range Match     |     30     | 30 for exact match, 15 if within 1 level       |
| Dietary Options       |     20     | 20 if dietary needs met, 5 if not listed       |
| Base Popularity       |     10     | rating × 2, capped at 10                       |
| **Total**             | **100**    |                                                |

**Match Reasons Examples:**
- "Loves Italian"
- "Budget-friendly"
- "Has vegetarian options"
- "Highly rated (4.8★)"

---

## Environment Variables

The backend requires the following environment variables:

| **Variable**             | **Description**                              | **Example**                   |
|:-------------------------|:---------------------------------------------|:------------------------------|
| `IS_LOCAL`               | Enable local development mode                | `true` or `false`             |
| `LOCAL_S3_ENDPOINT`      | LocalStack S3 endpoint (local only)          | `http://localstack:4566`      |
| `S3_IMAGE_BUCKET`        | S3 bucket name for images                    | `foodtok-local-images`        |
| `DDB_USERS_TABLE`        | DynamoDB Users table name                    | `Users`                       |
| `DDB_FAVORITES_TABLE`    | DynamoDB Favorites table name                | `Favorites`                   |
| `DDB_RESERVATIONS_TABLE` | DynamoDB Reservations table name             | `Reservations`                |
| `DDB_HOLDS_TABLE`        | DynamoDB Holds table name                    | `Holds`                       |
| `LOCAL_DYNAMO_ENDPOINT`  | DynamoDB endpoint (local only)               | `http://dynamo:8000`          |

---

## Notes

### Password Security
- All new passwords are hashed using bcrypt with automatic salt generation
- Legacy plain-text passwords are automatically migrated to bcrypt on successful login
- Minimum password length: 8 characters

### Decimal Handling
- All numeric values (prices, scores, amounts) are converted to Python Decimal for DynamoDB storage
- JSON responses automatically convert Decimal back to float using `DecimalEncoder`

### Reservation Hold System
- Holds expire after exactly 10 minutes
- Expired holds are automatically filtered out when querying active holds
- Hold status should be updated to "confirmed" when converted to reservation

### Yelp API Integration
- User reservations are automatically enriched with restaurant details from Yelp Fusion API
- Includes restaurant name, image, cuisine types, address, and rating
- API requests have a 3-second timeout to prevent blocking
- Failed Yelp lookups gracefully fall back to showing just the restaurant ID

### DynamoDB Tables
- **Users**: Simple primary key on `userId`
- **Favorites**: Composite key with `userId` (partition) and `restaurantId` (sort)
- **Reservations**: Simple primary key on `reservationId`
- **Holds**: Simple primary key on `holdId`
