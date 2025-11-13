from data_schemas import DynamoTables

# ==========================================================
# DYNAMO TABLE SCHEMAS
# ==========================================================

USERS_TABLE_SCHEMA = {
    "TableName": DynamoTables.USERS.value,
    "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"}
    ],
    "AttributeDefinitions": [
        {"AttributeName": "userId", "AttributeType": "S"}
    ],
    "BillingMode": "PAY_PER_REQUEST"
}

# TODO: TESTING YUXUAN SETUP BELOW, REMOVE IF NOT NEEDED
RESTAURANTS_TABLE_SCHEMA_OLD = {
    "TableName": DynamoTables.RESTAURANTS.value,
    "KeySchema": [
        {"AttributeName": "id", "KeyType": "HASH"}
    ],
    "AttributeDefinitions": [
        {"AttributeName": "id", "AttributeType": "S"}
    ],
    "BillingMode": "PAY_PER_REQUEST"
}

RESTAURANTS_TABLE_SCHEMA = {
    # If your enum already has RESTAURANTS, skip this. Shown only if you prefer the new attributes.
    "TableName": DynamoTables.RESTAURANTS.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "slug", "AttributeType": "S"},
        {"AttributeName": "city", "AttributeType": "S"},
        {"AttributeName": "state", "AttributeType": "S"},
        {"AttributeName": "isActive", "AttributeType": "S"},
        {"AttributeName": "acceptsReservations", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "slug-index",
            "KeySchema": [
                {"AttributeName": "slug", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "city-state-index",
            "KeySchema": [
                {"AttributeName": "city", "KeyType": "HASH"},
                {"AttributeName": "state", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "active-index",
            "KeySchema": [
                {"AttributeName": "isActive", "KeyType": "HASH"},
                {"AttributeName": "acceptsReservations", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

RESERVATIONS_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESERVATIONS.value,
    "KeySchema": [
        {"AttributeName": "reservationId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "reservationId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "dateTimeStatus", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",

    "GlobalSecondaryIndexes": [
        {
            "IndexName": "userId-dts-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "dateTimeStatus", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"}
        },
        {
            "IndexName": "restaurantId-dts-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
                {"AttributeName": "dateTimeStatus", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"}
        }
    ],
}

#----------------------------------------------------------------

USER_PREFERENCES_TABLE_SCHEMA = {
    "TableName": DynamoTables.USER_PREFERENCES.value,
    "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "userId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

USER_FAVORITE_CUISINES_TABLE_SCHEMA = {
    "TableName": DynamoTables.USER_FAVORITE_CUISINES.value,
    "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "cuisineId", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "cuisineId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

CHAINSTORES_TABLE_SCHEMA = {
    "TableName": DynamoTables.CHAINSTORES.value,
    "KeySchema": [
        {"AttributeName": "chainId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "chainId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

RESTAURANT_HOURS_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESTAURANT_HOURS.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
        {"AttributeName": "dayOfWeek", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "dayOfWeek", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

RESTAURANT_SPECIAL_HOURS_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESTAURANT_SPECIAL_HOURS.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
        {"AttributeName": "date", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "date", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

CUISINES_TABLE_SCHEMA = {
    "TableName": DynamoTables.CUISINES.value,
    "KeySchema": [
        {"AttributeName": "cuisineId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "cuisineId", "AttributeType": "S"},
        {"AttributeName": "slug", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "slug-index",
            "KeySchema": [
                {"AttributeName": "slug", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

RESTAURANT_CUISINES_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESTAURANT_CUISINES.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
        {"AttributeName": "cuisineId", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "cuisineId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "cuisineId-index",
            "KeySchema": [
                {"AttributeName": "cuisineId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

AMENITIES_TABLE_SCHEMA = {
    "TableName": DynamoTables.AMENITIES.value,
    "KeySchema": [
        {"AttributeName": "amenityId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "amenityId", "AttributeType": "S"},
        {"AttributeName": "slug", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "slug-index",
            "KeySchema": [
                {"AttributeName": "slug", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

RESTAURANT_AMENITIES_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESTAURANT_AMENITIES.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
        {"AttributeName": "amenityId", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "amenityId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "amenityId-index",
            "KeySchema": [
                {"AttributeName": "amenityId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

RESTAURANT_IMAGES_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESTAURANT_IMAGES.value,
    "KeySchema": [
        {"AttributeName": "imageId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "imageId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

DINING_TABLES_TABLE_SCHEMA = {
    "TableName": DynamoTables.DINING_TABLES.value,
    "KeySchema": [
        {"AttributeName": "tableId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "tableId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

TABLE_AVAILABILITY_TABLE_SCHEMA = {
    "TableName": DynamoTables.TABLE_AVAILABILITY.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
        {"AttributeName": "dayOfWeek", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "dayOfWeek", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

TABLE_AVAILABILITY_OVERRIDES_TABLE_SCHEMA = {
    "TableName": DynamoTables.TABLE_AVAILABILITY_OVERRIDES.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
        {"AttributeName": "date", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "date", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

TABLE_AVAILABILITY_SNAPSHOTS_TABLE_SCHEMA = {
    "TableName": DynamoTables.TABLE_AVAILABILITY_SNAPSHOTS.value,
    "KeySchema": [
        {"AttributeName": "restaurantId", "KeyType": "HASH"},
        {"AttributeName": "date", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "date", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

RESERVATION_TABLES_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESERVATION_TABLES.value,
    "KeySchema": [
        {"AttributeName": "reservationId", "KeyType": "HASH"},
        {"AttributeName": "tableId", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "reservationId", "AttributeType": "S"},
        {"AttributeName": "tableId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "tableId-index",
            "KeySchema": [
                {"AttributeName": "tableId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

RESERVATION_HISTORY_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESERVATION_HISTORY.value,
    "KeySchema": [
        {"AttributeName": "historyId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "historyId", "AttributeType": "S"},
        {"AttributeName": "reservationId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "reservationId-index",
            "KeySchema": [
                {"AttributeName": "reservationId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

WAITLIST_ENTRIES_TABLE_SCHEMA = {
    "TableName": DynamoTables.WAITLIST_ENTRIES.value,
    "KeySchema": [
        {"AttributeName": "waitlistId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "waitlistId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "requestedDate", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "status", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
                {"AttributeName": "requestedDate", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "userId-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "status-index",
            "KeySchema": [
                {"AttributeName": "status", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

REVIEWS_TABLE_SCHEMA = {
    "TableName": DynamoTables.REVIEWS.value,
    "KeySchema": [
        {"AttributeName": "reviewId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "reviewId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "reservationId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "userId-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "reservationId-index",
            "KeySchema": [
                {"AttributeName": "reservationId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

REVIEW_IMAGES_TABLE_SCHEMA = {
    "TableName": DynamoTables.REVIEW_IMAGES.value,
    "KeySchema": [
        {"AttributeName": "imageId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "imageId", "AttributeType": "S"},
        {"AttributeName": "reviewId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "reviewId-index",
            "KeySchema": [
                {"AttributeName": "reviewId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

REVIEW_RESPONSES_TABLE_SCHEMA = {
    "TableName": DynamoTables.REVIEW_RESPONSES.value,
    "KeySchema": [
        {"AttributeName": "reviewId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "reviewId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

REVIEW_HELPFUL_VOTES_TABLE_SCHEMA = {
    "TableName": DynamoTables.REVIEW_HELPFUL_VOTES.value,
    "KeySchema": [
        {"AttributeName": "reviewId", "KeyType": "HASH"},
        {"AttributeName": "userId", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "reviewId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

FAVORITES_TABLE_SCHEMA = {
    "TableName": DynamoTables.FAVORITES.value,
    "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "restaurantId", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

RECOMMENDATION_SCORES_TABLE_SCHEMA = {
    "TableName": DynamoTables.RECOMMENDATION_SCORES.value,
    "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "restaurantId", "KeyType": "RANGE"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        # If overallScore is numeric in your data model, you may switch to "N"
        {"AttributeName": "overallScore", "AttributeType": "N"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "score-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "overallScore", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

USER_INTERACTIONS_TABLE_SCHEMA = {
    "TableName": DynamoTables.USER_INTERACTIONS.value,
    "KeySchema": [
        {"AttributeName": "interactionId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "interactionId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
        {"AttributeName": "interactionType", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "userId-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "type-index",
            "KeySchema": [
                {"AttributeName": "interactionType", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

NOTIFICATIONS_TABLE_SCHEMA = {
    "TableName": DynamoTables.NOTIFICATIONS.value,
    "KeySchema": [
        {"AttributeName": "notificationId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "notificationId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "createdAt", "AttributeType": "S"},
        {"AttributeName": "isRead", "AttributeType": "S"},  # store as "true"/"false" if indexed
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "userId-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "createdAt", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "read-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "isRead", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

ADMINS_TABLE_SCHEMA = {
    "TableName": DynamoTables.ADMINS.value,
    "KeySchema": [
        {"AttributeName": "adminId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "adminId", "AttributeType": "S"},
        {"AttributeName": "email", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "email-index",
            "KeySchema": [
                {"AttributeName": "email", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

ADMIN_ACTIVITY_LOGS_TABLE_SCHEMA = {
    "TableName": DynamoTables.ADMIN_ACTIVITY_LOGS.value,
    "KeySchema": [
        {"AttributeName": "logId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "logId", "AttributeType": "S"},
        {"AttributeName": "adminId", "AttributeType": "S"},
        {"AttributeName": "entityType", "AttributeType": "S"},
        {"AttributeName": "entityId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "adminId-index",
            "KeySchema": [
                {"AttributeName": "adminId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "entity-index",
            "KeySchema": [
                {"AttributeName": "entityType", "KeyType": "HASH"},
                {"AttributeName": "entityId", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

USER_NO_SHOW_RECORDS_TABLE_SCHEMA = {
    "TableName": DynamoTables.USER_NO_SHOW_RECORDS.value,
    "KeySchema": [
        {"AttributeName": "recordId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "recordId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "restaurantId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "userId-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
        {
            "IndexName": "restaurantId-index",
            "KeySchema": [
                {"AttributeName": "restaurantId", "KeyType": "HASH"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        },
    ],
}

SYSTEM_SETTINGS_TABLE_SCHEMA = {
    "TableName": DynamoTables.SYSTEM_SETTINGS.value,
    "KeySchema": [
        {"AttributeName": "settingKey", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "settingKey", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST",
}

# ==========================================================
# AGGREGATED TABLE SCHEMAS
# ==========================================================

TABLE_SCHEMAS = {
    DynamoTables.USERS.value: USERS_TABLE_SCHEMA,
    DynamoTables.RESTAURANTS.value: RESTAURANTS_TABLE_SCHEMA,
    DynamoTables.RESERVATIONS.value: RESERVATIONS_TABLE_SCHEMA,
    DynamoTables.USER_PREFERENCES.value: USER_PREFERENCES_TABLE_SCHEMA,
    DynamoTables.USER_FAVORITE_CUISINES.value: USER_FAVORITE_CUISINES_TABLE_SCHEMA,
    DynamoTables.CHAINSTORES.value: CHAINSTORES_TABLE_SCHEMA,
    DynamoTables.RESTAURANT_HOURS.value: RESTAURANT_HOURS_TABLE_SCHEMA,
    DynamoTables.RESTAURANT_SPECIAL_HOURS.value: RESTAURANT_SPECIAL_HOURS_TABLE_SCHEMA,
    DynamoTables.CUISINES.value: CUISINES_TABLE_SCHEMA,
    DynamoTables.RESTAURANT_CUISINES.value: RESTAURANT_CUISINES_TABLE_SCHEMA,
    DynamoTables.AMENITIES.value: AMENITIES_TABLE_SCHEMA,
    DynamoTables.RESTAURANT_AMENITIES.value: RESTAURANT_AMENITIES_TABLE_SCHEMA,
    DynamoTables.RESTAURANT_IMAGES.value: RESTAURANT_IMAGES_TABLE_SCHEMA,
    DynamoTables.DINING_TABLES.value: DINING_TABLES_TABLE_SCHEMA,
    DynamoTables.TABLE_AVAILABILITY.value: TABLE_AVAILABILITY_TABLE_SCHEMA,
    DynamoTables.TABLE_AVAILABILITY_OVERRIDES.value: TABLE_AVAILABILITY_OVERRIDES_TABLE_SCHEMA,
    DynamoTables.TABLE_AVAILABILITY_SNAPSHOTS.value: TABLE_AVAILABILITY_SNAPSHOTS_TABLE_SCHEMA,
    DynamoTables.RESERVATION_TABLES.value: RESERVATION_TABLES_TABLE_SCHEMA,
    DynamoTables.RESERVATION_HISTORY.value: RESERVATION_HISTORY_TABLE_SCHEMA,
    DynamoTables.WAITLIST_ENTRIES.value: WAITLIST_ENTRIES_TABLE_SCHEMA,
    DynamoTables.REVIEWS.value: REVIEWS_TABLE_SCHEMA,
    DynamoTables.REVIEW_IMAGES.value: REVIEW_IMAGES_TABLE_SCHEMA,
    DynamoTables.REVIEW_RESPONSES.value: REVIEW_RESPONSES_TABLE_SCHEMA,
    DynamoTables.REVIEW_HELPFUL_VOTES.value: REVIEW_HELPFUL_VOTES_TABLE_SCHEMA,
    DynamoTables.FAVORITES.value: FAVORITES_TABLE_SCHEMA,
    DynamoTables.RECOMMENDATION_SCORES.value: RECOMMENDATION_SCORES_TABLE_SCHEMA,
    DynamoTables.USER_INTERACTIONS.value: USER_INTERACTIONS_TABLE_SCHEMA,
    DynamoTables.NOTIFICATIONS.value: NOTIFICATIONS_TABLE_SCHEMA,
    DynamoTables.ADMINS.value: ADMINS_TABLE_SCHEMA,
    DynamoTables.ADMIN_ACTIVITY_LOGS.value: ADMIN_ACTIVITY_LOGS_TABLE_SCHEMA,
    DynamoTables.USER_NO_SHOW_RECORDS.value: USER_NO_SHOW_RECORDS_TABLE_SCHEMA,
    DynamoTables.SYSTEM_SETTINGS.value: SYSTEM_SETTINGS_TABLE_SCHEMA,

}