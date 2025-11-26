# 🎯 Complete Data Persistence Plan

## 📊 Current State Analysis

### ✅ What's Working
- **Signup**: Creates user in DynamoDB Users table with bcrypt password hashing
- **Login**: Validates credentials against DynamoDB, migrates legacy passwords
- **User Preferences**: PATCH `/api/auth/preferences` updates Users table
- **Get Profile**: Fetches user from DynamoDB
- **Restaurants**: Seeded in DynamoDB, discovery endpoints functional

### ❌ What's Broken

#### **Critical Issues**
1. **Profile Page Crashes** 
   - Frontend uses `user.preferences?.cuisines` but backend returns `preferences.cuisines` (same field)
   - Actual issue: Profile displays hardcoded mock data instead of real DB queries
   - Line 136: Crashes when preferences object is empty/undefined

2. **No Favorites Persistence**
   - User swipes right → frontend calls `likesRestaurant(userId, restaurantId)`
   - Backend has NO endpoint for this → silently fails
   - No DynamoDB table for favorites

3. **No Reservation History**
   - `confirm_reservation()` creates reservation object but doesn't save to DB
   - `get_user_reservations()` returns empty array (hardcoded)
   - Backend comment: "In production, query from DynamoDB" ← NOT IMPLEMENTED

4. **No User Activity Tracking**
   - Swipes (left/right) not recorded
   - View counts not tracked
   - Match scores not stored
   - Profile shows: "12 restaurants liked • 5 reservations made • Active for 14 days" ← ALL FAKE

5. **Settings Page Not Syncing**
   - Edit profile form only updates local state
   - No API call to persist name/bio changes
   - Only "Food Preferences" section saves (redirects to onboarding - inefficient)

---

## 🗄️ Required DynamoDB Tables

### **1. Users Table** (Already Exists ✅)
```json
{
  "TableName": "Users",
  "PrimaryKey": "userId (String)",
  "Attributes": {
    "userId": "user_abc123",
    "email": "user@example.com",
    "password": "$2b$12$...",  // bcrypt hashed
    "firstName": "John",
    "lastName": "Doe",
    "bio": "",  // NEW: Add bio field
    "phoneNumber": "",  // NEW: Add phone
    "preferences": {
      "cuisineTypes": ["Italian", "Japanese"],  // Use cuisineTypes consistently
      "dietaryRestrictions": ["Vegetarian"],
      "priceRange": [2, 3],
      "maxDistance": 10,
      "favoriteRestaurants": []  // DEPRECATED: Move to Favorites table
    },
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Changes Needed:**
- Add `bio` field (string, max 200 chars)
- Add `phoneNumber` field (string, optional)
- Ensure backend always returns `cuisineTypes` not `cuisines`

---

### **2. Favorites Table** (NEW ⚠️)
```json
{
  "TableName": "Favorites",
  "PrimaryKey": "userId (String)",
  "SortKey": "restaurantId (String)",
  "Attributes": {
    "userId": "user_abc123",
    "restaurantId": "rest_xyz789",
    "restaurantName": "Joe's Pizza",  // Denormalized for quick display
    "restaurantImage": "https://...",
    "matchScore": 85,  // Score when favorited
    "likedAt": "2025-01-15T14:20:00Z"
  },
  "Indexes": [
    {
      "IndexName": "RestaurantIndex",
      "PartitionKey": "restaurantId",
      "SortKey": "likedAt",
      "Purpose": "Query all users who liked a restaurant"
    }
  ]
}
```

**Query Patterns:**
- Get user's favorites: `Query(userId=X, SortKey=descending)`
- Check if user liked restaurant: `GetItem(userId=X, restaurantId=Y)`
- Count user's total likes: `Query(userId=X, Select=COUNT)`

---

### **3. Reservations Table** (Partially Exists ⚠️)
```json
{
  "TableName": "Reservations",
  "PrimaryKey": "reservationId (String)",
  "Attributes": {
    "reservationId": "res_xyz123",
    "userId": "user_abc123",
    "holdId": "hold_def456",  // Link to Holds table
    "restaurantId": "rest_789",
    "restaurantName": "Momofuku",  // Denormalized
    "restaurantImage": "https://...",
    "date": "2025-01-20",
    "time": "19:00",
    "partySize": 4,
    "status": "confirmed",  // confirmed | cancelled | completed | no-show
    "confirmationCode": "234ABC",
    "depositAmount": 100,  // in cents
    "paymentMethod": "card_1234",
    "specialRequests": "Window seat please",
    "cancellationReason": "",  // If cancelled
    "refundAmount": 0,  // If cancelled
    "createdAt": "2025-01-15T15:00:00Z",
    "updatedAt": "2025-01-15T15:00:00Z",
    "completedAt": null  // Set after dining
  },
  "GSI": [
    {
      "IndexName": "UserReservations",
      "PartitionKey": "userId",
      "SortKey": "date",
      "Purpose": "Query user's reservation history"
    }
  ]
}
```

**Changes Needed:**
- `confirm_reservation()` must actually save to DynamoDB
- Implement `get_user_reservations()` to query UserReservations GSI
- Add status transition validation (confirmed → cancelled/completed)

---

### **4. Holds Table** (Already Exists ✅)
```json
{
  "TableName": "Holds",
  "PrimaryKey": "holdId (String)",
  "Attributes": {
    "holdId": "hold_abc123",
    "userId": "user_xyz",
    "restaurantId": "rest_789",
    "date": "2025-01-20",
    "time": "19:00",
    "partySize": 4,
    "status": "active",  // active | expired | converted
    "expiresAt": "2025-01-15T15:10:00Z",  // 10 min expiry
    "createdAt": "2025-01-15T15:00:00Z"
  }
}
```

**Changes Needed:**
- When `confirm_reservation()` succeeds, update hold status to "converted"

---

### **5. UserActivity Table** (NEW ⚠️)
```json
{
  "TableName": "UserActivity",
  "PrimaryKey": "userId (String)",
  "SortKey": "activityId (String)",  // timestamp-uuid format
  "Attributes": {
    "userId": "user_abc123",
    "activityId": "20250115150000-uuid123",
    "activityType": "swipe_right",  // swipe_right | swipe_left | view | reservation | favorite
    "restaurantId": "rest_xyz",
    "restaurantName": "Joe's Pizza",  // Denormalized
    "matchScore": 78,  // If applicable
    "metadata": {
      "swipeDirection": "right",
      "viewDuration": 5.2,  // seconds
      "reservationId": "res_123"  // If reservation made
    },
    "timestamp": "2025-01-15T15:00:00Z"
  }
}
```

**Purpose:**
- Track all user interactions for analytics
- Calculate "Active for X days" stat
- Build recommendation history
- Audit trail for debugging

---

### **6. UserStats Table** (NEW ⚠️)
```json
{
  "TableName": "UserStats",
  "PrimaryKey": "userId (String)",
  "Attributes": {
    "userId": "user_abc123",
    "totalLikes": 12,
    "totalReservations": 5,
    "totalSwipes": 47,
    "accountAge": 14,  // days since signup
    "lastActiveAt": "2025-01-15T15:00:00Z",
    "firstActivityAt": "2025-01-01T10:00:00Z",
    "topCuisines": ["Italian", "Japanese"],  // Most liked
    "averageMatchScore": 82.5,
    "updatedAt": "2025-01-15T15:00:00Z"
  }
}
```

**Purpose:**
- Precomputed stats for fast profile page loading
- Updated via background job or trigger functions
- Avoids expensive aggregation queries on every page load

---

## 🔌 Backend API Endpoints Required

### **Auth Endpoints** (4/4 exist, 1 needs fix)

#### ✅ `POST /api/auth/signup`
- **Status**: Working
- **What it does**: Creates user in Users table with hashed password
- **No changes needed**

#### ✅ `POST /api/auth/login`
- **Status**: Working
- **What it does**: Validates credentials, migrates legacy passwords
- **No changes needed**

#### ⚠️ `PATCH /api/auth/preferences`
- **Status**: Partially working
- **Issue**: Only updates preferences object, not firstName/lastName/bio
- **Fix Required**: Accept `firstName`, `lastName`, `bio`, `phoneNumber` in request body

#### ✅ `GET /api/auth/profile/:userId`
- **Status**: Working
- **What it does**: Fetches user from DynamoDB
- **No changes needed**

---

### **Favorites Endpoints** (0/4 exist ❌)

#### ❌ `POST /api/favorites` (NEW)
```python
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
    # Save to Favorites table
    # Update UserStats.totalLikes += 1
    # Log to UserActivity
```

#### ❌ `DELETE /api/favorites` (NEW)
```python
@api_view(["DELETE"])
def remove_favorite(request):
    """
    DELETE /api/favorites?userId=user_123&restaurantId=rest_xyz
    """
    # Remove from Favorites table
    # Update UserStats.totalLikes -= 1
```

#### ❌ `GET /api/favorites/:userId` (NEW)
```python
@api_view(["GET"])
def get_favorites(request, user_id):
    """
    GET /api/favorites/:userId?limit=20
    Returns list of user's favorited restaurants
    """
    # Query Favorites table
```

#### ❌ `GET /api/favorites/check` (NEW)
```python
@api_view(["GET"])
def check_favorite(request):
    """
    GET /api/favorites/check?userId=user_123&restaurantId=rest_xyz
    Returns: { "isFavorite": true }
    """
    # GetItem from Favorites table
```

---

### **Reservation Endpoints** (8 exist, 2 need implementation)

#### ✅ `GET /api/reservations/availability` - Working
#### ✅ `POST /api/reservations/hold` - Working  
#### ✅ `GET /api/reservations/hold/active` - Working
#### ⚠️ `POST /api/reservations/confirm` - **CRITICAL FIX NEEDED**
```python
# Current: Creates reservation object but doesn't save
# Fix: Add table.put_item(Item=reservation)
# Also: Update hold status to "converted"
# Also: Update UserStats.totalReservations += 1
# Also: Log to UserActivity
```

#### ⚠️ `GET /api/reservations/user/:userId` - **NOT IMPLEMENTED**
```python
# Current: Returns empty array []
# Fix: Query Reservations table via UserReservations GSI
# Support filter=upcoming|past|all
```

#### ✅ `GET /api/reservations/:id` - Exists (returns 404)
#### ✅ `PATCH /api/reservations/:id/modify` - Exists (501 Not Implemented)
#### ✅ `DELETE /api/reservations/:id/cancel` - Exists (mock response)

---

### **User Activity Endpoints** (0/2 exist ❌)

#### ❌ `POST /api/activity` (NEW)
```python
@api_view(["POST"])
def log_activity(request):
    """
    POST /api/activity
    Body: {
      "userId": "user_123",
      "activityType": "swipe_right",
      "restaurantId": "rest_xyz",
      "matchScore": 78,
      "metadata": {...}
    }
    """
    # Save to UserActivity table
    # Update lastActiveAt in UserStats
```

#### ❌ `GET /api/stats/:userId` (NEW)
```python
@api_view(["GET"])
def get_stats(request, user_id):
    """
    GET /api/stats/:userId
    Returns: {
      "totalLikes": 12,
      "totalReservations": 5,
      "accountAge": 14,
      "topCuisines": ["Italian"]
    }
    """
    # Read from UserStats table
    # If not exists, compute from UserActivity and cache
```

---

## 🔄 Frontend Changes Required

### **1. Fix Profile Page** (`src/app/(main)/profile/page.tsx`)

**Issues:**
- Line 136: `user.preferences?.cuisines?.length` → should be `cuisineTypes`
- Displays hardcoded stats instead of real data
- No loading state while fetching stats
- No error handling

**Fix:**
```typescript
// Replace mock data (lines 35-56) with real API call
const [stats, setStats] = useState<UserStats | null>(null);

useEffect(() => {
  if (user?.id) {
    fetch(`/api/stats/${user.id}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load stats:', err));
  }
}, [user?.id]);

// Line 136: Fix field name
{user.preferences?.cuisineTypes?.length > 0 ? (
  <div className="flex flex-wrap gap-2">
    {user.preferences.cuisineTypes.map((cuisine) => (
      // ...
    ))}
  </div>
) : (
  <p className="text-sm text-gray-500">No preferences set</p>
)}

// Replace hardcoded stats (lines 177-188)
<div className="grid grid-cols-3 gap-4 py-4">
  <div className="text-center">
    <div className="text-2xl font-bold">{stats?.totalLikes || 0}</div>
    <div className="text-sm text-gray-600">Liked</div>
  </div>
  <div className="text-center">
    <div className="text-2xl font-bold">{stats?.totalReservations || 0}</div>
    <div className="text-sm text-gray-600">Reservations</div>
  </div>
  <div className="text-center">
    <div className="text-2xl font-bold">{stats?.accountAge || 0}</div>
    <div className="text-sm text-gray-600">Days Active</div>
  </div>
</div>
```

---

### **2. Fix Settings Page** (`src/app/(main)/settings/page.tsx`)

**Issues:**
- Edit profile form doesn't save to backend
- Uses wrong field name `cuisines` instead of `cuisineTypes`
- "Update Preferences" redirects to onboarding (bad UX)

**Fix:**
```typescript
// Update saveProfile function (around line 50)
const saveProfile = async () => {
  try {
    setIsSaving(true);
    
    // Call backend to update profile
    const response = await fetch('/api/auth/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        phoneNumber: formData.phoneNumber
      })
    });
    
    if (!response.ok) throw new Error('Failed to save profile');
    
    const data = await response.json();
    updateUser(data.user);  // Update Zustand store
    setIsEditing(false);
  } catch (error) {
    console.error('Failed to save profile:', error);
    alert('Failed to save profile changes');
  } finally {
    setIsSaving(false);
  }
};

// Fix cuisine types reference (line ~200)
{user.preferences?.cuisineTypes?.map((cuisine) => (
  // ...
))}
```

---

### **3. Fix Discovery Store** (`src/lib/stores/discovery.ts`)

**Issue:**
- `swipeCard()` calls `likesRestaurant()` with fire-and-forget (no error handling)
- No activity logging for swipes

**Fix:**
```typescript
// Update swipeCard function
swipeCard: async (direction: 'left' | 'right') => {
  const state = get();
  if (state.queue.length === 0) return;

  const card = state.queue[0];
  const userId = useAuthStore.getState().user?.id;

  try {
    // Log activity for both left and right swipes
    if (userId) {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          activityType: direction === 'right' ? 'swipe_right' : 'swipe_left',
          restaurantId: card.id,
          restaurantName: card.name,
          matchScore: card.matchScore || 0,
          metadata: { swipeDirection: direction }
        })
      });

      // If right swipe, add to favorites
      if (direction === 'right') {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            restaurantId: card.id,
            restaurantName: card.name,
            restaurantImage: card.imageUrl,
            matchScore: card.matchScore || 0
          })
        });

        if (!response.ok) {
          console.error('Failed to add favorite');
        }
      }
    }
  } catch (error) {
    console.error('Failed to log swipe:', error);
    // Continue even if logging fails (non-blocking)
  }

  // Update UI state
  set((state) => ({
    queue: state.queue.slice(1),
    swipedRestaurants: [...state.swipedRestaurants, card],
  }));

  // Refill queue if needed
  if (state.queue.length <= 3) {
    get().refillQueue();
  }
},
```

---

### **4. Add Favorites Page** (`src/app/(main)/favorites/page.tsx`)

**Current Issue:**
- Empty placeholder page (17 lines)

**Implement:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { RestaurantCard } from '@/components/features/RestaurantCard';

interface Favorite {
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  matchScore: number;
  likedAt: string;
}

export default function FavoritesPage() {
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/favorites/${user.id}`)
        .then(res => res.json())
        .then(data => setFavorites(data))
        .catch(err => console.error('Failed to load favorites:', err))
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  const removeFavorite = async (restaurantId: string) => {
    try {
      await fetch(`/api/favorites?userId=${user.id}&restaurantId=${restaurantId}`, {
        method: 'DELETE'
      });
      setFavorites(prev => prev.filter(f => f.restaurantId !== restaurantId));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  if (loading) return <div>Loading favorites...</div>;
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">No favorites yet</p>
        <p className="text-sm text-gray-400">Swipe right on restaurants you like!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {favorites.map(fav => (
        <div key={fav.restaurantId} className="relative">
          <RestaurantCard restaurant={fav} />
          <button
            onClick={() => removeFavorite(fav.restaurantId)}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### **5. Fix Reservations Page** (`src/app/(main)/reservations/page.tsx`)

**Current Issue:**
- Uses mock data from `mock-reservations.ts`

**Fix:**
```typescript
// Replace getReservations() call in useEffect
useEffect(() => {
  const loadReservations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/reservations/user/${user.id}?filter=${filter}`);
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  loadReservations();
}, [user?.id, filter]);
```

---

### **6. Update Auth Store** (`src/lib/stores/auth.ts`)

**Issue:**
- `updatePreferences()` doesn't verify success
- No error handling

**Fix:**
```typescript
updatePreferences: async (userId: string, preferences: UserPreferences) => {
  try {
    const response = await fetch('/api/auth/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, preferences }),
    });

    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }

    const data = await response.json();
    
    set((state) => ({
      user: state.user ? { ...state.user, preferences } : null,
    }));

    console.log('✅ Preferences updated successfully');
    return data.user;
  } catch (error) {
    console.error('❌ Failed to update preferences:', error);
    throw error;  // Re-throw so caller can handle
  }
},
```

---

## 🧪 Testing Plan

### **Phase 1: Backend Setup** (Day 1)
1. Create DynamoDB tables: Favorites, Reservations, UserActivity, UserStats
2. Seed with test data
3. Test table creation with `aws dynamodb describe-table`

### **Phase 2: Backend Implementation** (Day 2-3)
1. Implement favorites endpoints (4 new)
2. Fix `confirm_reservation()` to actually save
3. Implement `get_user_reservations()`
4. Implement activity logging endpoint
5. Implement stats calculation endpoint
6. Update `update_preferences()` to accept profile fields

### **Phase 3: Frontend Fixes** (Day 4)
1. Fix profile page crashes (cuisineTypes)
2. Fix settings page (profile edit persistence)
3. Update discovery store (proper favorites API calls)
4. Implement favorites page
5. Fix reservations page (use real API)

### **Phase 4: Integration Testing** (Day 5)
1. **Signup Flow**: Create account → verify in Users table
2. **Login Flow**: Login → verify token → fetch profile
3. **Onboarding Flow**: Set preferences → verify saved to DB
4. **Discovery Flow**: 
   - Swipe left → verify logged to UserActivity
   - Swipe right → verify added to Favorites + UserActivity
   - Check stats update
5. **Favorites Flow**: View favorites page → verify data loads
6. **Reservation Flow**: 
   - Create hold → verify in Holds table
   - Confirm reservation → verify in Reservations table
   - View reservations → verify history loads
7. **Profile Flow**: View profile → verify stats are real
8. **Settings Flow**: Edit profile → verify saves to Users table

### **Phase 5: End-to-End Scenarios** (Day 6)
1. New user signs up → onboarding → discovery → likes 5 restaurants → creates reservation → views profile (stats should show 5 likes, 1 reservation)
2. Existing user logs in → views favorites → removes favorite → favorites count decreases
3. User creates reservation → views reservation history → cancels reservation → status updates

---

## 📝 Database Seed Data Needed

### **users.json** (Update existing)
```json
[
  {
    "userId": "user_001",
    "email": "demo@example.com",
    "password": "$2b$12$...",
    "firstName": "Demo",
    "lastName": "User",
    "bio": "Foodie exploring NYC",
    "phoneNumber": "+1234567890",
    "preferences": {
      "cuisineTypes": ["Italian", "Japanese", "Mexican"],
      "priceRange": [2, 3],
      "dietaryRestrictions": ["Vegetarian Options"]
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
]
```

### **favorites.json** (NEW)
```json
[
  {
    "userId": "user_001",
    "restaurantId": "rest_001",
    "restaurantName": "Joe's Pizza",
    "restaurantImage": "https://...",
    "matchScore": 85,
    "likedAt": "2025-01-10T15:00:00Z"
  }
]
```

### **reservations.json** (NEW)
```json
[
  {
    "reservationId": "res_001",
    "userId": "user_001",
    "restaurantId": "rest_002",
    "restaurantName": "Momofuku",
    "restaurantImage": "https://...",
    "date": "2025-01-25",
    "time": "19:00",
    "partySize": 4,
    "status": "confirmed",
    "confirmationCode": "234ABC",
    "depositAmount": 100,
    "paymentMethod": "card_1234",
    "createdAt": "2025-01-15T12:00:00Z"
  }
]
```

### **user_stats.json** (NEW)
```json
[
  {
    "userId": "user_001",
    "totalLikes": 1,
    "totalReservations": 1,
    "totalSwipes": 20,
    "accountAge": 14,
    "lastActiveAt": "2025-01-15T15:00:00Z",
    "firstActivityAt": "2025-01-01T10:00:00Z",
    "topCuisines": ["Italian"],
    "averageMatchScore": 85.0,
    "updatedAt": "2025-01-15T15:00:00Z"
  }
]
```

---

## 🚀 Implementation Order

### **Priority 1: Critical Fixes** (Must Do First)
1. ✅ Fix profile page crash (cuisineTypes typo)
2. ✅ Implement `POST /api/favorites`
3. ✅ Fix `confirm_reservation()` to save to DB
4. ✅ Implement `GET /api/reservations/user/:userId`
5. ✅ Create Favorites, Reservations, UserStats tables

### **Priority 2: Core Features** (Needed for MVP)
6. ✅ Implement `GET /api/favorites/:userId`
7. ✅ Implement `GET /api/stats/:userId`
8. ✅ Update discovery store swipeCard to use new favorites API
9. ✅ Fix settings page profile edit
10. ✅ Implement favorites page

### **Priority 3: Nice to Have** (Post-MVP)
11. Implement `POST /api/activity` logging
12. Build UserActivity tracking
13. Add reservation modification
14. Add reservation cancellation with refund
15. Implement recommendation improvements

---

## ✅ Approval Checklist

Before implementation, confirm:
- [ ] DynamoDB table schemas approved
- [ ] API endpoint specifications approved
- [ ] Frontend changes make sense
- [ ] Testing plan covers all flows
- [ ] Implementation order is correct

**Once approved, I will:**
1. Create DynamoDB seed files
2. Update backend views.py with new endpoints
3. Fix frontend profile/settings/discovery
4. Test each flow
5. Update PROJECT_UPDATE.md
6. Push to both repos

**Estimated Time:** 2-3 days of focused work

---

## 🔒 Security Considerations

1. **Authentication**: Currently basic auth. Recommend Cognito for production.
2. **Authorization**: Verify `userId` in request matches authenticated user
3. **Input Validation**: Sanitize all user inputs (bio, special requests)
4. **Rate Limiting**: Add rate limits to prevent abuse
5. **Data Privacy**: Never expose passwords in API responses

---

## 📊 Success Metrics

After implementation:
- ✅ Profile page loads without crashing
- ✅ Profile shows REAL stats (not 12, 5, 14)
- ✅ Swiping right saves to Favorites table
- ✅ Favorites page displays actual liked restaurants
- ✅ Creating reservation saves to Reservations table
- ✅ Reservation history shows actual bookings
- ✅ Settings page edits persist to database
- ✅ All data flow: Frontend → API → DynamoDB → Frontend

**Ready for your review and approval! 🎯**
