# API Smoke-Tested Endpoint Schemas

The smoke-test suite under `ecs_app/tests/api/test_urls.py` exercises the endpoints listed below.  
Each section documents the request payload (where applicable) and the key response fields that the tests assert on.

> **Base URL:** `http://localhost:8080/api`
> **Proxy URL:** `http://localhost:3000/api`

---

## Health Check
 simply ensures the backend is up and running
### `GET /helloECS`

**Response**

```json
{
  "status": "healthy"
}
```

- `status` — string; expected to equal `"healthy"`.

---

## Authentication

### `POST /auth/signup`

**Request**

```json
{
  "email": "user@example.com",
  "password": "Pass!123",
  "firstName": "First",
  "lastName": "Last"
}
```

**Response (201)**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "First",
    "lastName": "Last",
    "...": "other profile fields"
  }
}
```

### `POST /auth/login`

**Request**

```json
{
  "email": "user@example.com",
  "password": "Pass!123"
}
```

**Response (200)**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "preferences": { "...": "stored prefs" },
    "...": "other profile fields"
  }
}
```

### `PATCH /auth/preferences`

**Request**

```json
{
  "userId": "uuid",
  "preferences": {
    "cuisines": ["Thai", "Italian"],
    "dietaryRestrictions": ["Vegetarian"],
    "priceRange": [2, 3]
  },
  "firstName": "Updated"
}
```

**Response (200)**

```json
{
  "user": {
    "id": "uuid",
    "firstName": "Updated",
    "preferences": {
      "cuisines": ["Thai", "Italian"],
      "dietaryRestrictions": ["Vegetarian"],
      "priceRange": [2, 3]
    },
    "...": "other profile fields"
  }
}
```

### `GET /auth/profile/{userId}`

**Response (200)**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Updated",
    "...": "other profile fields"
  }
}
```

### `POST /auth/change-password`

**Request**

```json
{
  "userId": "uuid",
  "currentPassword": "Pass!123",
  "newPassword": "Pass!456"
}
```

**Response (200)**

```json
{
  "message": "Password changed successfully"
}
```

---

## Favorites

### `POST /favorites`

**Request**

```json
{
  "userId": "uuid",
  "restaurantId": "rest_123",
  "restaurantName": "Favorites Smoke Test",
  "restaurantImage": "",
  "matchScore": 99
}
```

**Response (200 or 201)**

```json
{
  "favorite": {
    "userId": "uuid",
    "restaurantId": "rest_123",
    "restaurantName": "Favorites Smoke Test",
    "matchScore": 99,
    "...": "other stored fields"
  }
}
```

### `GET /favorites/check?userId=...&restaurantId=...`

**Response (200)**

```json
{
  "isFavorite": true
}
```

- Returns `false` after the favorite is deleted.

### `GET /favorites/{userId}`

**Response (200)**

```json
[
  {
    "userId": "uuid",
    "restaurantId": "rest_123",
    "restaurantName": "Favorites Smoke Test",
    "...": "other favorite metadata"
  }
]
```

### `DELETE /favorites?userId=...&restaurantId=...`

**Response (200)**

```json
{
  "success": true,
  "message": "Favorite removed"
}
```

---

## Reservations

All reservation tests operate on synthetic restaurants and short-lived users to avoid polluting shared data.

### `POST /reservations/availability`

**Request**

```json
{
  "restaurantId": "rest_123",
  "date": "2025-12-24",
  "partySize": 2
}
```

**Response (200)**

```json
{
  "restaurantId": "rest_123",
  "date": "2025-12-24",
  "availableSlots": [
    {
      "time": "18:00",
      "available": true,
      "tablesAvailable": 4
    }
  ]
}
```

### `POST /reservations/hold`

**Request**

```json
{
  "userId": "uuid",
  "restaurantId": "rest_123",
  "date": "2025-12-24",
  "time": "19:00",
  "partySize": 2
}
```

**Response (201)**

```json
{
  "success": true,
  "hold": {
    "holdId": "hold_ab12cd34",
    "userId": "uuid",
    "restaurantId": "rest_123",
    "date": "2025-12-24",
    "time": "19:00",
    "partySize": 2,
    "status": "active",
    "expiresAt": "ISO timestamp",
    "createdAt": "ISO timestamp"
  }
}
```

### `GET /reservations/hold/active?userId=...`

**Response (200)**

```json
{
    "hold": {
        "holdId": "hold_ab12cd34",
        "...": "same structure as the hold creation response"
    }
}
```

- If no active holds exist, `hold` is `null`.

### `POST /reservations/confirm`

**Request**

```json
{
  "holdId": "hold_ab12cd34",
  "userId": "uuid",
  "paymentMethod": "card_visa_1111",
  "specialRequests": "Window seat"
}
```

**Response (201)**

```json
{
  "success": true,
  "reservation": {
    "reservationId": "res_1a2b3c4d",
    "userId": "uuid",
    "holdId": "hold_ab12cd34",
    "restaurantId": "rest_123",
    "date": "2025-12-24",
    "time": "19:00",
    "partySize": 2,
    "status": "confirmed",
    "confirmationCode": "123ABC",
    "depositAmount": 100,
    "paymentMethod": "card_visa_1111",
    "specialRequests": "Window seat",
    "createdAt": "ISO timestamp"
  }
}
```

### `GET /reservations/user/{userId}?filter=all|upcoming|past`

**Response (200)**

```json
[
  {
    "reservationId": "res_1a2b3c4d",
    "userId": "uuid",
    "restaurantId": "rest_123",
    "date": "2025-12-24",
    "time": "19:00",
    "status": "confirmed",
    "...": "additional fields (specialRequests, depositAmount, etc.)"
  }
]
```

### `PATCH /reservations/{reservationId}/modify`

**Request**

```json
{
  "userId": "uuid",
  "time": "20:00",
  "specialRequests": "Corner table"
}
```

**Response (200)**

```json
{
  "success": True,
  "reservation": {
    "reservationId": "res_1a2b3c4d",
    "time": "20:00",
    "specialRequests": "Corner table",
    "...": "other updated fields"
  }
}
```

### `DELETE /reservations/{reservationId}/cancel`

**Request**

```json
{
  "userId": "uuid"
}
```

**Response (200)**

```json
{
  "success": true,
  "message": "Reservation cancelled",
  "refundAmount": 75,
  "refundPercentage": 75
}
```

---

## Helper Test Data

- Temporary restaurants, users, holds, and reservations are created via the API or DynamoDB Local and cleaned up at the end of each test to avoid polluting shared state.
- All timestamps use ISO 8601 strings (e.g., `"2025-12-24T19:00:00Z"`).

---

For the most accurate structures, refer to the implementation in `ecs_app/api/views.py`, but the payloads above capture the fields asserted in the smoke tests and the minimum required to exercise each endpoint.

