from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

# ==========================================================
# TABLE DEFINITIONS
# ==========================================================
class DynamoTables(Enum):
    USERS = "Users"
    RESTAURANTS = "Restaurants"
    RESERVATIONS = "Reservations"
    USER_PREFERENCES = "UserPreferences"
    USER_FAVORITE_CUISINES = "UserFavoriteCuisines"
    CHAINSTORES = "ChainStores"
    RESTAURANT_HOURS = "RestaurantHours"
    RESTAURANT_SPECIAL_HOURS = "RestaurantSpecialHours"
    CUISINES = "Cuisines"
    RESTAURANT_CUISINES = "RestaurantCuisines"
    AMENITIES = "Amenities"
    RESTAURANT_AMENITIES = "RestaurantAmenities"
    RESTAURANT_IMAGES = "RestaurantImages"
    DINING_TABLES = "DiningTables"
    TABLE_AVAILABILITY = "TableAvailability"
    TABLE_AVAILABILITY_OVERRIDES = "TableAvailabilityOverrides"
    TABLE_AVAILABILITY_SNAPSHOTS = "TableAvailabilitySnapshots"
    RESERVATION_TABLES = "ReservationTables"
    RESERVATION_HISTORY = "ReservationHistory"
    WAITLIST_ENTRIES = "WaitlistEntries"
    REVIEWS = "Reviews"
    REVIEW_IMAGES = "ReviewImages"
    REVIEW_RESPONSES = "ReviewResponses"
    REVIEW_HELPFUL_VOTES = "ReviewHelpfulVotes"
    FAVORITES = "Favorites"
    RECOMMENDATION_SCORES = "RecommendationScores"
    USER_INTERACTIONS = "UserInteractions"
    NOTIFICATIONS = "Notifications"
    ADMINS = "Admins"
    ADMIN_ACTIVITY_LOGS = "AdminActivityLogs"
    USER_NO_SHOW_RECORDS = "UserNoShowRecords"
    SYSTEM_SETTINGS = "SystemSettings"

# ==========================================================
# TABLE DATA CLASSES
# ==========================================================

@dataclass
class Users:
    userId: str
    firstName: str
    lastName: str
    email: str
    createdDay: str
    createdTime: str
    passwordHash: str

@dataclass
class Restaurants:
    restaurantId: str
    chainId: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    isActive: Optional[str] = None
    acceptsReservations: Optional[str] = None
    phone: Optional[str] = None
    createdAt: Optional[str] = None

@dataclass
class Reservations:
    reservationId: str
    userId: str
    restaurantId: str
    date: str                 # YYYY-MM-DD
    time: str                 # HH:MM
    partySize: int
    status: str               # confirmed | cancelled | completed
    dateTimeStatus: str       # GSI sort key: YYYY-MM-DD#HH:MM#status
    confirmationCode: str
    depositAmount: float
    depositPaid: bool
    paymentLast4: str
    paymentBrand: str
    createdAt: str
    specialRequests: Optional[str] = None
    cancelledAt: Optional[str] = None

@dataclass
class UserPreferences:
    userId: str
    cuisinePreferences: List[str]
    dietaryRestrictions: List[str]
    budgetRange: Optional[str] = None
    travelMaxDistance: Optional[int] = None

@dataclass
class UserFavoriteCuisines:
    userId: str
    cuisineId: str

@dataclass
class ChainStores:
    chainId: str
    chainName: Optional[str] = None

@dataclass
class RestaurantHours:
    restaurantId: str
    dayOfWeek: str
    openTime: Optional[str] = None
    closeTime: Optional[str] = None

@dataclass
class RestaurantSpecialHours:
    restaurantId: str
    date: str
    openTime: Optional[str] = None
    closeTime: Optional[str] = None
    isClosed: Optional[bool] = None

@dataclass
class Cuisines:
    cuisineId: str
    slug: str
    name: Optional[str] = None

@dataclass
class RestaurantCuisines:
    restaurantId: str
    cuisineId: str

@dataclass
class Amenities:
    amenityId: str
    slug: str
    name: Optional[str] = None


@dataclass
class RestaurantAmenities:
    restaurantId: str
    amenityId: str

@dataclass
class RestaurantImages:
    imageId: str
    restaurantId: str
    url: Optional[str] = None
    description: Optional[str] = None


@dataclass
class DiningTables:
    tableId: str
    restaurantId: str
    capacity: Optional[int] = None
    tableNumber: Optional[str] = None


@dataclass
class TableAvailability:
    restaurantId: str
    dayOfWeek: str
    timeSlots: Optional[List[str]] = None


@dataclass
class TableAvailabilityOverrides:
    restaurantId: str
    date: str
    timeSlots: Optional[List[str]] = None

@dataclass
class TableAvailabilitySnapshots:
    restaurantId: str
    date: str
    snapshot: Optional[dict] = None

@dataclass
class ReservationTables:
    reservationId: str
    tableId: str

@dataclass
class ReservationHistory:
    historyId: str
    reservationId: str
    eventType: Optional[str] = None
    timestamp: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class WaitlistEntries:
    waitlistId: str
    restaurantId: str
    userId: str
    requestedDate: str
    requestedTime: Optional[str] = None
    partySize: Optional[int] = None
    status: Optional[str] = None
    createdAt: Optional[str] = None


@dataclass
class Reviews:
    reviewId: str
    restaurantId: str
    userId: str
    reservationId: Optional[str] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    createdAt: Optional[str] = None

@dataclass
class ReviewImages:
    imageId: str
    reviewId: str
    url: Optional[str] = None

@dataclass
class ReviewResponses:
    reviewId: str
    responseText: Optional[str] = None
    adminId: Optional[str] = None
    createdAt: Optional[str] = None

@dataclass
class ReviewHelpfulVotes:
    reviewId: str
    userId: str


@dataclass
class Favorites:
    userId: str
    restaurantId: str

@dataclass
class RecommendationScores:
    userId: str
    restaurantId: str
    overallScore: Optional[float] = None


@dataclass
class UserInteractions:
    interactionId: str
    userId: str
    restaurantId: str
    interactionType: str
    createdAt: Optional[str] = None

@dataclass
class RecommendationScores:
    userId: str
    restaurantId: str
    overallScore: Optional[float] = None

@dataclass
class UserInteractions:
    interactionId: str
    userId: str
    restaurantId: str
    interactionType: str
    createdAt: Optional[str] = None


@dataclass
class Notifications:
    notificationId: str
    userId: str
    createdAt: str
    message: Optional[str] = None
    isRead: Optional[str] = None

@dataclass
class Admins:
    adminId: str
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None

@dataclass
class AdminActivityLogs:
    logId: str
    adminId: str
    entityType: Optional[str] = None
    entityId: Optional[str] = None
    action: Optional[str] = None
    timestamp: Optional[str] = None

@dataclass
class UserNoShowRecords:
    recordId: str
    userId: str
    restaurantId: str
    createdAt: Optional[str] = None

@dataclass
class SystemSettings:
    settingKey: str
    settingValue: Optional[str] = None