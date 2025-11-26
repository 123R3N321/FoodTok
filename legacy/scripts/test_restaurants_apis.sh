#!/bin/bash
# Test script for restaurant API endpoints

BASE_URL="http://localhost:8080/api"

echo "🍕 Testing FoodTok Restaurant APIs"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Testing Health Check${NC}"
echo "GET $BASE_URL/helloECS"
curl -s "$BASE_URL/helloECS" | jq
echo ""
echo ""

echo -e "${BLUE}2. Testing Discovery Feed (Personalized)${NC}"
echo "GET $BASE_URL/restaurants/discovery?userId=user_001&limit=5"
curl -s "$BASE_URL/restaurants/discovery?userId=user_001&limit=5" | jq
echo ""
echo ""

echo -e "${BLUE}3. Testing Restaurant Detail${NC}"
echo "GET $BASE_URL/restaurants/rest1"
curl -s "$BASE_URL/restaurants/rest1" | jq
echo ""
echo ""

echo -e "${BLUE}4. Testing Search - Italian Restaurants${NC}"
echo "GET $BASE_URL/restaurants/search?cuisine=Italian&minRating=4.0"
curl -s "$BASE_URL/restaurants/search?cuisine=Italian&minRating=4.0" | jq
echo ""
echo ""

echo -e "${BLUE}5. Testing Search - Price Range Filter${NC}"
echo "GET $BASE_URL/restaurants/search?priceRange=2,3&limit=5"
curl -s "$BASE_URL/restaurants/search?priceRange=2,3&limit=5" | jq
echo ""
echo ""

echo -e "${BLUE}6. Testing Search - City Filter${NC}"
echo "GET $BASE_URL/restaurants/search?city=New%20York"
curl -s "$BASE_URL/restaurants/search?city=New%20York" | jq
echo ""
echo ""

echo -e "${GREEN}✅ All tests complete!${NC}"