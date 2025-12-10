#!/usr/bin/env python3
"""
Inject completed reservations into DynamoDB for testing History page
"""

import boto3
from datetime import datetime, timedelta
import random
import requests
from decimal import Decimal

# LocalStack DynamoDB endpoint
dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://localhost:8000',
    region_name='us-east-1',
    aws_access_key_id='test',
    aws_secret_access_key='test'
)

reservations_table = dynamodb.Table('Reservations')

USER_ID = 'user_1afa7a88'

def get_favorite_restaurants():
    """Get restaurants from user's favorites"""
    try:
        response = requests.get(f'http://localhost:8080/api/favorites/{USER_ID}')
        if response.status_code == 200:
            favorites = response.json()
            return [
                {
                    'id': fav.get('restaurantId'),
                    'name': fav.get('restaurantName'),
                    'cuisine': fav.get('cuisineType', ['Restaurant'])
                }
                for fav in favorites[:5]  # Get first 5
            ]
    except Exception as e:
        print(f"Error fetching favorites: {e}")
    return []

def inject_completed_reservations():
    """Inject 5 completed reservations with past dates"""
    
    restaurants = get_favorite_restaurants()
    
    if not restaurants:
        print("❌ No restaurants found in favorites!")
        return
    
    print(f"✅ Found {len(restaurants)} restaurants from favorites")
    
    # Create reservations for the past 2 months
    base_date = datetime.now() - timedelta(days=60)
    
    for i, restaurant in enumerate(restaurants):
        # Generate past date
        days_ago = random.randint(5, 60)
        reservation_date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        
        # Random time slot
        times = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
        time = random.choice(times)
        
        # Random party size
        party_size = random.randint(2, 6)
        
        # Generate reservation ID
        reservation_id = f"res_{int(datetime.now().timestamp() * 1000) + i}"
        
        reservation = {
            'reservationId': reservation_id,
            'userId': USER_ID,
            'restaurantId': restaurant.get('id'),
            'restaurantName': restaurant.get('name', 'Unknown Restaurant'),
            'restaurantCuisine': restaurant.get('cuisine', ['Restaurant']),
            'date': reservation_date,
            'time': time,
            'partySize': party_size,
            'status': 'completed',
            'confirmationCode': f"CONF-{random.randint(1000, 9999)}",
            'createdAt': (datetime.now() - timedelta(days=days_ago + 1)).isoformat(),
            'updatedAt': (datetime.now() - timedelta(days=days_ago)).isoformat(),
            'specialRequests': random.choice([
                'Window seat please',
                'Celebrating anniversary',
                'High chair needed',
                None,
                None  # More None values for variety
            ]),
        }
        
        # Add some with totalPaid
        if random.random() > 0.3:
            reservation['totalPaid'] = Decimal(str(round(random.uniform(50, 200), 2)))
        
        try:
            reservations_table.put_item(Item=reservation)
            print(f"✅ Created completed reservation at {restaurant.get('name')} on {reservation_date}")
        except Exception as e:
            print(f"❌ Failed to create reservation: {e}")
    
    print(f"\n🎉 Successfully injected completed reservations!")
    print(f"👤 User ID: {USER_ID}")
    print(f"📅 Check the History page to see them!")

if __name__ == '__main__':
    inject_completed_reservations()
