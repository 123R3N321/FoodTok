# 🍕 Yelp API Integration for FoodTok

This guide helps you fetch **real NYC restaurant data** from Yelp Fusion API.

## 📋 Step 1: Get Your Yelp API Key

### 1. Sign up for Yelp Fusion API (Free!)

1. Go to: **https://www.yelp.com/developers/v3/manage_app**
2. Click **"Create New App"**
3. Fill out the form:
   - **App Name:** `FoodTok Development`
   - **Industry:** `Food & Beverage`
   - **Email:** Your email
   - **Description:** `Restaurant discovery app for NYU Software Engineering class`
   - **Terms of Service:** Check the box
4. Click **"Create New App"**

### 2. Get Your API Key

After creating the app, you'll see:
- **API Key** (this is what you need!)
- **Client ID** (not needed for this project)

Copy your **API Key** - it looks like:
```
abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

---

## 🚀 Step 2: Fetch Restaurants

### Set your API key:

```bash
# In your terminal (FoodTok_Backend directory)
export YELP_API_KEY="paste_your_key_here"
```

### Install required Python package:

```bash
pip install requests
```

### Run the fetcher script:

```bash
python scripts/fetch_yelp_restaurants.py
```

### Expected output:

```
🍕 Fetching restaurants from Yelp Fusion API...
📍 Searching 10 cuisines across 5 NYC locations

  Fetching italian restaurants in Manhattan, NY...
    ✓ Carbone (Italian) - 4.5⭐
    ✓ L'Artusi (Italian) - 4.6⭐
    ✓ Via Carota (Italian) - 4.7⭐
  
  Fetching japanese restaurants in Manhattan, NY...
    ✓ Sushi Nakazawa (Japanese) - 4.8⭐
    ✓ Ichiran (Japanese) - 4.5⭐
  
  ... [more restaurants]

✅ Fetched 45 unique restaurants!
💾 Saved to seed_data/dynamo_seed/restaurants.json

📊 Summary:
  Total restaurants: 45
  Cuisines: American, Chinese, French, Indian, Italian, Japanese, Korean, Mediterranean, Mexican, Thai
  Avg rating: 4.5⭐

🎉 Ready to seed DynamoDB! Run:
  docker-compose up -d
```

---

## 📝 What Gets Saved?

The script fetches and transforms Yelp data into FoodTok's format:

```json
{
  "id": "rest_carbone-new-york",
  "name": "Carbone",
  "cuisine": "Italian",
  "priceRange": 4,
  "rating": 4.5,
  "reviewCount": 1200,
  "imageUrl": "https://s3-media.yelp.com/...",
  "description": "Highly rated italian restaurant in NYC",
  "address": "181 Thompson St, New York, NY 10012",
  "location": {
    "lat": 40.7276,
    "lng": -74.0036,
    "city": "New York",
    "state": "NY",
    "zipCode": "10012"
  },
  "phone": "+1 (212) 555-1234",
  "yelpUrl": "https://www.yelp.com/biz/carbone-new-york",
  "hours": { ... },
  "features": ["Fine Dining", "Reservations", "Bar"],
  "dietaryOptions": ["Vegetarian Options"],
  "capacity": { "total": 50, "perTimeSlot": 10 },
  "depositPerPerson": 25
}
```

---

## 🔧 Customization

Edit `scripts/fetch_yelp_restaurants.py` to customize:

### Fetch more restaurants:
```python
CUISINES = [
    "italian",
    "japanese",
    # Add more cuisines...
]
```

### Change neighborhoods:
```python
LOCATIONS = [
    "Manhattan, NY",
    "Brooklyn, NY",
    "Queens, NY",  # Add more
]
```

### Adjust limit per search:
```python
yelp_results = fetch_yelp_restaurants(api_key, cuisine, location, limit=5)  # Increase limit
```

---

## ⚠️ Rate Limits

**Yelp Fusion API limits:**
- **5,000 API calls per day** (free tier)
- Current script makes ~20-30 calls (safe!)
- If you need more, space out requests or upgrade

---

## 🎯 Next Steps

After running the script:

1. ✅ Check `seed_data/dynamo_seed/restaurants.json` has data
2. ✅ Start Docker: `docker-compose up -d`
3. ✅ Data will auto-seed into DynamoDB
4. ✅ Build restaurant discovery API endpoints

---

## 🐛 Troubleshooting

### "YELP_API_KEY environment variable not set"
```bash
# Make sure you exported the key:
export YELP_API_KEY="your_key_here"

# Verify it's set:
echo $YELP_API_KEY
```

### "requests module not found"
```bash
pip install requests
```

### "401 Unauthorized"
- Your API key is invalid or expired
- Go to Yelp Developer Portal and regenerate

### Getting fewer restaurants than expected
- Yelp may have limited results for some cuisines/locations
- Try different neighborhoods or increase `limit` parameter

---

**Questions?** Check the main [INTERNAL_README.md](../INTERNAL_README.md) or ask in the team channel!