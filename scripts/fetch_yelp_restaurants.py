#!/usr/bin/env python3
"""
Fetch real NYC restaurants from Yelp Fusion API
and format them for FoodTok's DynamoDB schema.

Usage:
    export YELP_API_KEY="your_key_here"
    python scripts/fetch_yelp_restaurants.py
"""

import os
import json
import requests
from typing import List, Dict, Any

# Yelp Fusion API endpoint
YELP_API_URL = "https://api.yelp.com/v3/businesses/search"

# Target cuisines to fetch (diverse NYC food scene)
CUISINES = [
    "italian",
    "japanese",
    "mexican",
    "chinese",
    "indian",
    "thai",
    "american",
    "french",
    "mediterranean",
    "korean"
]

# NYC neighborhoods to search
LOCATIONS = [
    "Manhattan, NY",
    "Brooklyn, NY",
    "Williamsburg, Brooklyn, NY",
    "East Village, Manhattan, NY",
    "West Village, Manhattan, NY"
]


def fetch_yelp_restaurants(api_key: str, cuisine: str, location: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch restaurants from Yelp API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "accept": "application/json"
    }
    
    params = {
        "term": f"{cuisine} restaurants",
        "location": location,
        "limit": limit,
        "sort_by": "rating",
        "categories": "restaurants"
    }
    
    try:
        response = requests.get(YELP_API_URL, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("businesses", [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {cuisine} in {location}: {e}")
        return []


def transform_to_foodtok_format(yelp_business: Dict[str, Any]) -> Dict[str, Any]:
    """Transform Yelp API response to FoodTok's DynamoDB schema."""
    
    # Extract coordinates
    coords = yelp_business.get("coordinates", {})
    location = yelp_business.get("location", {})
    
    # Map Yelp price to our 1-4 scale
    price_map = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    price_range = price_map.get(yelp_business.get("price", "$$"), 2)
    
    # Extract categories (cuisines)
    categories = yelp_business.get("categories", [])
    cuisine = categories[0]["title"] if categories else "American"
    
    # Generate features based on Yelp data
    features = []
    if yelp_business.get("transactions"):
        if "delivery" in yelp_business["transactions"]:
            features.append("Delivery")
        if "pickup" in yelp_business["transactions"]:
            features.append("Takeout")
    
    # Infer features from name/categories
    name_lower = yelp_business.get("name", "").lower()
    if "bar" in name_lower or "wine" in name_lower:
        features.append("Bar")
    if price_range >= 3:
        features.append("Fine Dining")
    if "outdoor" in name_lower or "garden" in name_lower:
        features.append("Outdoor Seating")
    
    # Build address string
    address_parts = location.get("display_address", [])
    address = ", ".join(address_parts) if address_parts else "New York, NY"
    
    return {
        "id": f"rest_{yelp_business['id']}",
        "name": yelp_business.get("name", "Unknown Restaurant"),
        "cuisine": cuisine,
        "priceRange": price_range,
        "rating": float(yelp_business.get("rating", 4.0)),
        "reviewCount": int(yelp_business.get("review_count", 0)),
        "imageUrl": yelp_business.get("image_url", ""),
        "description": f"Highly rated {cuisine.lower()} restaurant in {location.get('city', 'NYC')}",
        "address": address,
        "location": {
            "lat": coords.get("latitude", 40.7589),
            "lng": coords.get("longitude", -73.9851),
            "city": location.get("city", "New York"),
            "state": location.get("state", "NY"),
            "zipCode": location.get("zip_code", "10001")
        },
        "phone": yelp_business.get("display_phone", ""),
        "yelpUrl": yelp_business.get("url", ""),
        "hours": {
            "Monday": "11:00 AM - 10:00 PM",
            "Tuesday": "11:00 AM - 10:00 PM",
            "Wednesday": "11:00 AM - 10:00 PM",
            "Thursday": "11:00 AM - 10:00 PM",
            "Friday": "11:00 AM - 11:00 PM",
            "Saturday": "10:00 AM - 11:00 PM",
            "Sunday": "10:00 AM - 10:00 PM"
        },
        "features": features if features else ["Dine-in", "Reservations"],
        "dietaryOptions": ["Vegetarian Options"],  # Assume most have this
        "capacity": {
            "total": 50,
            "perTimeSlot": 10
        },
        "depositPerPerson": 25,
        "isActive": True
    }


def main():
    """Main function to fetch and save restaurants."""
    api_key = os.getenv("YELP_API_KEY")
    
    if not api_key:
        print("ERROR: YELP_API_KEY environment variable not set!")
        print("\nGet your API key from: https://www.yelp.com/developers/v3/manage_app")
        print("\nThen run:")
        print("  export YELP_API_KEY='your_key_here'")
        print("  python scripts/fetch_yelp_restaurants.py")
        return
    
    print("🍕 Fetching restaurants from Yelp Fusion API...")
    print(f"📍 Searching {len(CUISINES)} cuisines across {len(LOCATIONS)} NYC locations\n")
    
    all_restaurants = []
    seen_ids = set()
    
    # Fetch restaurants for each cuisine/location combination
    for cuisine in CUISINES:
        for location in LOCATIONS[:2]:  # Limit locations to avoid rate limits
            print(f"  Fetching {cuisine} restaurants in {location}...")
            
            yelp_results = fetch_yelp_restaurants(api_key, cuisine, location, limit=3)
            
            for business in yelp_results:
                business_id = business.get("id")
                
                # Avoid duplicates
                if business_id and business_id not in seen_ids:
                    seen_ids.add(business_id)
                    formatted = transform_to_foodtok_format(business)
                    all_restaurants.append(formatted)
                    print(f"    ✓ {formatted['name']} ({formatted['cuisine']}) - {formatted['rating']}⭐")
    
    print(f"\n✅ Fetched {len(all_restaurants)} unique restaurants!")
    
    # Save to seed_data directory
    output_path = "seed_data/dynamo_seed/restaurants.json"
    with open(output_path, "w") as f:
        json.dump(all_restaurants, f, indent=2)
    
    print(f"💾 Saved to {output_path}")
    
    # Print summary
    print("\n📊 Summary:")
    print(f"  Total restaurants: {len(all_restaurants)}")
    cuisines_found = set(r["cuisine"] for r in all_restaurants)
    print(f"  Cuisines: {', '.join(sorted(cuisines_found))}")
    print(f"  Avg rating: {sum(r['rating'] for r in all_restaurants) / len(all_restaurants):.1f}⭐")
    
    print("\n🎉 Ready to seed DynamoDB! Run:")
    print("  docker-compose up -d")


if __name__ == "__main__":
    main()