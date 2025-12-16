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

RESTAURANTS_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESTAURANTS.value,
    "KeySchema": [
        {"AttributeName": "id", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "id", "AttributeType": "S"}
    ],
    "BillingMode": "PAY_PER_REQUEST"
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
    "BillingMode": "PAY_PER_REQUEST"
}

RESERVATIONS_TABLE_SCHEMA = {
    "TableName": DynamoTables.RESERVATIONS.value,
    "KeySchema": [
        {"AttributeName": "reservationId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "reservationId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "date", "AttributeType": "S"}
    ],
    "BillingMode": "PAY_PER_REQUEST",

    "GlobalSecondaryIndexes": [
        {
            "IndexName": "UserReservations",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "date", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"}
        }
    ]
}

USER_STATS_TABLE_SCHEMA = {
    "TableName": DynamoTables.USER_STATS.value,
    "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "userId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST"
}

HOLDS_TABLE_SCHEMA = {
    "TableName": DynamoTables.HOLDS.value,
    "KeySchema": [
        {"AttributeName": "holdId", "KeyType": "HASH"},
    ],
    "AttributeDefinitions": [
        {"AttributeName": "holdId", "AttributeType": "S"},
    ],
    "BillingMode": "PAY_PER_REQUEST"
}

# ==========================================================
# AGGREGATED TABLE SCHEMAS
# ==========================================================

TABLE_SCHEMAS = {
    DynamoTables.USERS.value: USERS_TABLE_SCHEMA,
    DynamoTables.RESTAURANTS.value: RESTAURANTS_TABLE_SCHEMA,
    DynamoTables.RESERVATIONS.value: RESERVATIONS_TABLE_SCHEMA,
    DynamoTables.FAVORITES.value: FAVORITES_TABLE_SCHEMA,
    DynamoTables.USER_STATS.value: USER_STATS_TABLE_SCHEMA,
    DynamoTables.HOLDS.value: HOLDS_TABLE_SCHEMA,
}