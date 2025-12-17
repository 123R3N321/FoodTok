# Project Overview

FoodTok is a modern restaurant reservation platform built with cutting-edge web technologies. The application integrates real-time restaurant data from Yelp Fusion API with a robust backend infrastructure for user management, reservations, and favorites.

## Technology Stack

### Frontend

- **Framework:** Next.js 15.5.4 with App Router

- **Language:** TypeScript 5.x

- **Styling:** Tailwind CSS 4.x with custom design system

- **State Management:** Zustand for global state

- **Animations:** Framer Motion for smooth transitions

- **UI Components:** Custom component library with Radix UI primitives

- **Forms:** React Hook Form with validation

- **Testing:** Jest + React Testing Library

### Backend

- **Framework:** Django REST Framework

- **Language:** Python 3.11+

- **Database:** DynamoDB (AWS)

- **Authentication:** Custom JWT implementation with Cognito integration

- **File Storage:** Amazon S3

- **Testing:** pytest with coverage reporting

- **Load Testing:** Locust for performance testing

### Infrastructure

- **Containerization:** Docker with multi-stage builds

- **Orchestration:** Docker Compose for local development

- **CI/CD:** GitHub Actions with automated testing

- **Deployment:** AWS ECS with Fargate

- **Cloud:** AWS (ECS, DynamoDB, S3, CloudWatch)

# Business Logic and Intelligence

This section documents the “soul” of FoodTok—the intelligent features, algorithms, and safeguards that make the application production-ready and user-centric.

## Project Vision: Helping Users Discover Restaurants

FoodTok solves a common problem: *“Where should I eat tonight?”* by providing:

- **Personalized Discovery:** TikTok-style swipe interface with AI-powered match scores

- **Real Restaurant Data:** Live integration with Yelp Fusion API for accurate information

- **Seamless Booking:** 10-minute hold system prevents overbooking while allowing payment time

- **Fair Cancellation:** Tiered refund policy protects both users and restaurants

## Race Condition Prevention

**Problem:** Multiple users booking the same table simultaneously.

**Solution:** Distributed locking with timeout mechanism.

The system implements a lock mechanism using a Map data structure to track active locks:
- A `SLOT_LOCKS` Map tracks which time slots are currently being reserved
- The `acquireLock()` function attempts to acquire a lock with a 5-second timeout
- If the lock is not available, it retries every 50 milliseconds
- The `releaseLock()` function removes the lock when the reservation is complete or fails

**Usage in Hold Creation:**
- When a user attempts to create a hold, the system first acquires a lock using a key combining restaurant ID, date, and time
- If the lock cannot be acquired (another user is reserving), an error message is shown: "This time slot is currently being reserved by another user"
- The lock is always released in a `finally` block to prevent deadlocks
- This prevents race conditions where two users could book the same table simultaneously


## Idempotency Guarantees

**Problem:** User clicking “Confirm” multiple times could cause double charges.

**Solution:** Idempotency checks at multiple levels.

### Hold Idempotency

The system prevents users from creating multiple holds simultaneously:
- Before creating a new hold, the system checks for existing active holds for the same user
- If an existing hold is found (status is 'held' and not expired), an error is returned
- Error message: "You already have an active reservation in progress. Please complete or cancel it first."
- This ensures users can only have one reservation in progress at a time

### Confirmation Idempotency

The system prevents double charges when users click "Confirm" multiple times:
- Before processing payment, the system checks for existing confirmed reservations matching the same user, restaurant, date, and time
- If a confirmed reservation already exists, the system returns the existing reservation without processing payment again
- The response includes the existing confirmation code
- This guarantees that payment is only processed once per reservation


## Inventory Management and Slot Capacity

**Problem:** Need to track available tables in real-time across holds and reservations.

**Solution:** Capacity tracking with separation of holds vs confirmed reservations.

The system uses a `SlotCapacity` data structure for each time slot containing:
- **totalTables**: Total number of tables available in that slot (e.g., 10 tables)
- **availableTables**: Current count of unreserved tables (decremented on hold, incremented on release)
- **holds**: A Set of active hold IDs that have reserved but not yet confirmed
- **reservations**: A Set of confirmed reservation IDs
- **lastUpdated**: Timestamp of the last capacity change

**Key Operations:**

1.  **reserveSlot()** - Decrement available tables, add to holds/reservations

2.  **releaseSlot()** - Increment available tables when hold expires or reservation cancels

3.  **convertHoldToReservation()** - Move ID from holds to reservations (no capacity change)

## 10-Minute Hold System with Auto-Expiry

**Problem:** Users need time to enter payment details without blocking others indefinitely.

**Solution:** 10-minute temporary hold with automatic cleanup.

The hold system works as follows:
- When a hold is created, it is assigned an `expiresAt` timestamp set to 10 minutes from creation
- The hold object stores: holdId, userId, restaurantId, date, time, partySize, depositAmount, and status ('held')
- A `setTimeout` is scheduled to run after 10 minutes
- When the timeout fires, the system checks if the hold is still in 'held' status
- If still held (not converted to reservation), the system calls `releaseSlot()` to return the table to inventory
- The hold is then deleted from storage
- This simulates DynamoDB TTL (Time To Live) functionality

## Yelp Fusion API Integration

FoodTok uses real restaurant data from Yelp’s Fusion API to provide accurate, up-to-date information.

### API Endpoints Used

| **Endpoint**         | **Purpose**                                      |
|:---------------------|:-------------------------------------------------|
| `/businesses/search` | Discover restaurants by location, cuisine, price |
| `/businesses/{id}`   | Get detailed restaurant information              |

### Integration Architecture

The Yelp API integration uses Next.js API routes to proxy requests:
- **Route Location**: `src/app/api/yelp/search/route.ts`
- **API Base URL**: `https://api.yelp.com/v3`
- **Authentication**: Bearer token using `YELP_API_KEY` environment variable
- **Request Parameters**: term (search query), location (city/coordinates), limit (max results)
- **Response Transformation**: Raw Yelp data is transformed to match the app's `Restaurant` type
- **Error Handling**: HTTP errors are caught and returned with appropriate status codes

## Match Score Algorithm

The match score (0-100) helps users discover restaurants aligned with their preferences.

### Scoring Breakdown

| **Factor** | **Points** | **Logic** |
|:---|:--:|:---|
| Cuisine Match | 40 | 40 if matches preference, 10 for new cuisine, 20 if no pref |
| Price Range | 30 | 30 for exact match, 15 if within 1 level |
| Dietary Options | 20 | 20 if dietary needs met, 5 if not listed |
| Base Popularity | 10 | rating $`\times`$ 2, capped at 10 |
| **Total** | 100 |  |

### Match Reasons Display

Along with the score, users see **why** a restaurant matches:

- “Loves Italian” - Cuisine preference match

- “Budget-friendly” - Price range alignment

- “Has vegetarian options” - Dietary accommodation

- “Highly rated (4.8 stars)” - Quality indicator

## Refund Policy Logic

**Problem:** Fair cancellation policy for both users and restaurants.

**Solution:** Time-based refund tiers.


| **Cancellation Time** | **Refund** |
|:----------------------|:----------:|
| 24+ hours before      |    100%    |
| 4-24 hours before     |    50%     |
|  <  4 hours before  |     0%     |

## NYC-Style Deposit Pricing

Deposits are calculated at $25 per person, reflecting NYC restaurant norms:
- **depositPerPerson**: Fixed at $25, standard for NYC fine dining reservations
- **totalDeposit**: Calculated as `depositPerPerson × partySize`
- **Example**: A party of 4 guests pays a $100 deposit
- Deposits are applied toward the final bill and are refundable based on the cancellation policy

# Frontend Architecture

## Application Structure

The frontend follows Next.js 13+ App Router architecture with route groups for authentication and main application flows.

### Route Groups

- **(auth):** Authentication-related pages (login, signup, onboarding)

- **(main):** Protected application pages requiring authentication

- **api:** Server-side API routes for external integrations

### State Management

The application uses Zustand for global state management with the following stores:

- **Auth Store:** User authentication state, profile data, preferences

- **Reservation Store:** Active hold management, reservation flow state

- **Cart Store:** Shopping cart state for menu items

- **Discovery Store:** Restaurant queue, swipe history, favorites sync

**Cart Store Implementation** (185 lines):

The Cart Store manages shopping cart state with Zustand and localStorage persistence:
- **State**: `cart` object (or null if empty), `isOpen` boolean for drawer visibility
- **addItem()**: Adds items to cart, clears cart if switching restaurants, merges duplicate items
- **removeItem()**: Removes item by menuItemId, clears cart if last item removed
- **updateItemQuantity()**: Updates quantity, removes item if quantity reaches 0
- **calculateTotals()**: Computes subtotal from item prices + customizations, applies NYC 8.875% sales tax, adds $3.99 delivery fee
- **Persistence**: Uses Zustand's `persist` middleware with localStorage key 'foodtok-cart'

**Reservation Store Implementation** (26 lines):

The Reservation Store manages the active hold during the checkout flow:
- **State**: `activeHold` containing the Hold object or null
- **setActiveHold()**: Sets the active hold (called after creating hold from ReservationModal)
- **clearHold()**: Clears the hold (called after successful confirmation or expiration)
- Used to pass hold data between the restaurant detail page and checkout page

## Component Architecture

### Design System

- **Color Palette:** Orange-themed (#FF6B35) with intelligent tag coloring

- **Typography:** Inter font family with responsive scaling

- **Spacing:** 8px grid system with Tailwind utilities

- **Components:** Reusable UI primitives with accessibility support

### UI Components Library

**Location:** `src/components/ui/`

| **Component**  | **Size** | **Purpose**                                 |
|:---------------|:---------|:--------------------------------------------|
| `button.tsx`   | 1.9 KB   | Variant-based button with loading states    |
| `card.tsx`     | 2.0 KB   | Card container with header, content, footer |
| `dialog.tsx`   | 3.9 KB   | Modal dialog with overlay and animations    |
| `input.tsx`    | 0.9 KB   | Form input with Tailwind styling            |
| `textarea.tsx` | 0.7 KB   | Multi-line text input                       |

**Component Design Pattern:**

The UI components follow a variant-based design pattern using `class-variance-authority` (cva):
- **Variants**: Each component supports multiple visual variants (default, destructive, outline, ghost, link)
- **Sizes**: Components support size variants (default, sm, lg, icon)
- **Default Variants**: Fallback to 'default' variant and size if not specified
- **Composability**: Components use `React.forwardRef` for ref forwarding
- **Accessibility**: Built on Radix UI primitives for keyboard navigation and ARIA support

### Key Feature Components

- **HoldTimer:** Real-time countdown for reservation holds

- **ReservationModal:** Multi-step reservation booking flow

- **DiscoveryCard:** Restaurant recommendation cards with match scores

- **CartDrawer:** Slide-out cart with item management

# Frontend Pages Documentation

## Authentication Pages

The authentication module provides a comprehensive user onboarding experience with secure login, registration, and preference configuration. All authentication pages are located in the `(auth)` route group, which applies a specialized layout optimized for the authentication flow.

### Login Page (/login)

**File Location:** `src/app/(auth)/login/page.tsx` (172 lines)

**Purpose:** Primary user authentication entry point with email/password authentication, integrated with the Zustand auth store for persistent session management.

**Component Architecture:**

- **LoginPage** - Main functional component (lines 18-172)

- **validateForm** - Client-side form validation (lines 29-44)

- **handleSubmit** - Async form submission handler (lines 46-57)

- **handleInputChange** - Controlled input handler with error clearing (lines 59-65)

**State Management:**

The Login component uses React hooks and Zustand for state:
- **useRouter**: Next.js router for navigation after successful login
- **useAuthStore**: Zustand store providing login function, loading state, error messages, and clearError action
- **formData state**: Object containing email and password fields as controlled inputs
- **showPassword state**: Boolean toggle for password visibility
- **validationErrors state**: Record mapping field names to error messages

**Form Validation Logic:**

The validation checks before submission:
- **Email validation**: Must be non-empty and match regex pattern for valid email format
- **Password validation**: Must be non-empty (length requirements enforced on signup)
- Errors are collected in an object and only form submits if no errors exist
- Individual field errors clear when user starts typing in that field

**Error Handling Pattern:**

Errors are displayed with smooth animations:
- Uses Framer Motion for enter/exit animations
- Displays with scale (0.95 to 1.0) and opacity (0 to 1) transition
- Red-tinted background with destructive color scheme
- Error messages from API are displayed directly to users

### Signup Page (/signup)

**File Location:** `src/app/(auth)/signup/page.tsx` (268 lines)

**Purpose:** New user registration with comprehensive form validation, password strength indicators, and automatic profile creation.

**Component Architecture:**

- **SignupPage** - Main functional component (lines 19-268)

- **getPasswordValidation** - Real-time password strength checking (lines 34-41)

- **validateForm** - Comprehensive multi-field validation (lines 43-74)

- **handleSubmit** - Registration with auto-login (lines 76-92)

- **handleInputChange** - Input handler with error clearing (lines 94-100)

**Form Fields:**

The signup form captures five fields:
- **firstName**: User's first name (required, trimmed)
- **lastName**: User's last name (required, trimmed)
- **email**: User's email address (required, validated with regex)
- **password**: Account password (required, strength-validated)
- **confirmPassword**: Password confirmation (must match password)

**Password Validation Rules:**

Passwords must meet all five criteria:
- **Minimum length**: At least 8 characters
- **Uppercase letter**: Contains at least one A-Z character
- **Lowercase letter**: Contains at least one a-z character
- **Number**: Contains at least one digit 0-9
- **Special character**: Contains one of !@#$%^&*(),.?":{}|<>

**Comprehensive Form Validation:**

The validateForm function checks:
- First and last name are non-empty after trimming whitespace
- Email is valid using the `isValidEmail` utility function
- Password meets minimum complexity using `isValidPassword` utility
- Confirm password matches the password field exactly
- All errors are collected and displayed next to relevant fields

**Password Strength Indicator UI:**

- Real-time visual feedback with Check/X icons

- Green checkmark for satisfied requirements

- Red X for unsatisfied requirements

- Five validation criteria displayed inline

**Registration Flow:**

1.  User fills all form fields

2.  Client-side validation executes on submit

3.  Password strength is verified (8+ chars, mixed case, number)

4.  Auth store’s `signup()` method creates user

5.  Backend hashes password with bcrypt

6.  On success: auto-login and redirect to onboarding

7.  On failure: specific error messages displayed

### Onboarding Page (/onboarding)

**File Location:** `src/app/(auth)/onboarding/page.tsx` (427 lines)

**Purpose:** Multi-step wizard for capturing user preferences to enable personalized restaurant recommendations.

**Component Architecture:**

- **OnboardingPage** - Main wizard component (lines 51-427)

- **handleCuisineToggle** - Cuisine selection handler (lines 72-79)

- **requestLocation** - Geolocation API integration (lines 81-148)

- **handleDietaryToggle** - Dietary restriction handler (lines 150-157)

- **handleComplete** - Preference save and navigation (lines 159-178)

- **canProceed** - Step validation logic (lines 180-195)

**Onboarding Steps:**

1.  **Cuisine Preferences** - Select favorite cuisine types

2.  **Price Range** - Choose preferred price levels

3.  **Dietary Restrictions** - Configure dietary needs

4.  **Location Setup** - Enable location services

**Available Cuisine Options:**

Users can select from 12 cuisine types, each with an emoji icon:
- Italian 🍕, Japanese 🍣, Mexican 🌮, Chinese 🥡
- Indian 🍛, Thai 🍜, French 🥐, Mediterranean 🧆
- American 🍔, Korean 🍲, Vietnamese 🍜, Greek 🥙

**Dietary Restriction Options:**

Users can select multiple dietary preferences:
- Vegetarian, Vegan, Gluten-free, Dairy-free
- Nut-free, Halal, Kosher
- These preferences filter restaurant recommendations

**Price Range Options:**

Users select their preferred price tier with descriptions:
- **$ (Budget)**: Under $15 per person
- ** ×  (Moderate)**: $15-30 per person
- ** × $ (Upscale)**: $30-60 per person
- ** ×  ×  (Fine dining)**: $60+ per person

**Geolocation Integration:**

The location step uses browser Geolocation API:
- Checks if `navigator.geolocation` is supported
- Requests user permission to access location
- On success, extracts latitude and longitude from position.coords
- Calls BigDataCloud API for reverse geocoding to get city name
- Stores city and coordinates in preferences

**Preference Persistence:**

Preferences are saved via the auth store:
- Calls `updatePreferences()` action with all collected data
- Sends PATCH request to `/api/auth/preferences` endpoint
- Updates user object in localStorage for persistence
- Redirects to home page on completion

**Step Validation Logic:**

Each step has validation before proceeding:
- **Cuisine step**: At least one cuisine must be selected
- **Price step**: A price range must be chosen
- **Dietary step**: Optional, can proceed without selection
- **Location step**: Optional, but recommended for nearby restaurants

**UI/UX Features:**

- **Progress indicator** - Visual step tracker at top

- **Animated transitions** - Framer Motion for step changes

- **Visual cuisine cards** - Emoji icons for each cuisine type

- **Skip functionality** - Option to skip optional steps

- **Back navigation** - Return to previous steps

- **Loading states** - Spinner during location request and save

## Main Application Pages

### Discovery Page (/) - Swipe Interface

**File Location:** `src/app/(main)/page.tsx` (200 lines)

**Purpose:** TikTok-style swipeable restaurant discovery interface with personalized recommendations based on user preferences.

**Component Architecture:**

- **DiscoveryPage** - Main page component (lines 17-200)

- **handleSwipe** - Swipe direction handler (lines 43-55)

- **handleCardClick** - Navigation to restaurant detail (lines 57-63)

- **handleRefresh** - Queue reload trigger (lines 65-70)

**State Management with Zustand:**

The Discovery page uses the discovery store for state:
- **queue**: Array of restaurant cards to display
- **currentIndex**: Index of currently displayed card in queue
- **isLoading**: Boolean for loading state
- **error**: Error message if queue loading fails
- **swipeHistory**: Array tracking previous swipes for undo functionality

**Swipe Mechanics Implementation:**

Swipe gestures are handled using Framer Motion:
- **drag** prop enables horizontal dragging on the card
- **dragConstraints** limits drag distance
- **onDragEnd** callback fires when user releases the card
- If drag distance exceeds threshold (100px), swipe registers as like (right) or dislike (left)
- Cards animate off-screen with exit animation

**Discovery Queue Loading:**

On component mount, the page loads restaurants:
- Calls `loadQueue()` action from discovery store
- Fetches restaurants from `/api/yelp/discovery` with user preferences
- Transforms Yelp data to DiscoveryCard format with match scores
- Queue is refilled when fewer than 5 cards remain

**Discovery Store Actions (discovery.ts - 224 lines):**

The store provides these actions:
- **loadQueue()**: Fetches new restaurants, calculates match scores, populates queue
- **swipe()**: Records swipe direction, syncs likes to backend, advances to next card
- **undo()**: Reverts last swipe by restoring from swipeHistory
- **clearQueue()**: Resets queue to empty state

**Swipe Action with Backend Sync:**

When user swipes right (like):
- Restaurant is added to favorites via POST to `/api/favorites`
- Match score and match reasons are included in favorite record
- Swipe is recorded in history for potential undo
- Current index advances to show next card

**Undo Swipe Functionality:**

Undo allows reversing the last swipe:
- Pops the last entry from swipeHistory
- Decrements currentIndex to show previous card
- If the undone swipe was a like, removes it from favorites
- Undo is disabled when at the first card (index 0)

**Card Stack Rendering with AnimatePresence:**

Cards render in a stacked visual effect:
- Only the current card and next 2 cards are rendered for performance
- AnimatePresence handles enter/exit animations
- Cards behind current have reduced scale and opacity
- Z-index ensures current card is always on top

**First-Time User Instructions:**

New users see swipe instructions overlay:
- Animated hand icons showing swipe left/right gestures
- "Swipe right to like, left to skip" text
- Instructions fade out after first few swipes or can be dismissed

### Restaurant Detail Page (/restaurant/[id])

**File Location:** `src/app/(main)/restaurant/[id]/page.tsx` (289 lines)

**Purpose:** Comprehensive restaurant view with Yelp data integration, menu display, and reservation booking via modal.

**Component Architecture:**

- **RestaurantDetailsPage** - Main page component (lines 32-289)

- **fetchRestaurant** - Async data loading effect (lines 56-71)

- **handleAddToCart** - Cart item addition (lines 73-85)

- **handleHoldCreated** - Hold conversion and navigation (lines 94-127)

**State Management:**

The Restaurant Detail page uses local and store state:
- **restaurant**: The full restaurant object from Yelp API
- **isLoading**: Loading state during data fetch
- **quantities**: Record tracking quantity for each menu item in cart
- **showReservationModal**: Boolean controlling modal visibility
- Zustand stores: useCartStore for cart operations, useReservationStore for hold state

**Yelp API Data Fetching:**

Restaurant data is fetched on component mount:
- Uses dynamic route parameter `[id]` as Yelp business ID
- Calls `/api/yelp/business/${id}` endpoint
- Response includes: name, photos, rating, price, hours, location, categories
- Data is transformed to match app's Restaurant type
- Error handling redirects to discovery if restaurant not found

**Hold Creation Handler:**

When ReservationModal creates a hold:
- Hold object is set in the reservation store via `setActiveHold(hold)`
- User is navigated to `/checkout` page
- Hold contains: holdId, restaurantId, date, time, partySize, depositAmount, expiresAt
- Checkout page reads hold from store to display timer and process payment

**ReservationModal Component (389 lines):**

The modal is a multi-step booking interface:
- **Step 1 (Date)**: Shows next 30 days in horizontal scrollable row, highlights selected date
- **Step 2 (Party Size)**: Plus/minus buttons to select 1-20 guests
- **Step 3 (Time Slots)**: Calls availability API, displays available slots as buttons
- **Step 4 (Confirm)**: Shows summary and creates hold via API
- Back button allows returning to previous steps
- Close button cancels the entire flow

**Availability Check API Call:**

Time slots are fetched based on selections:
- Request includes: restaurantId, date (YYYY-MM-DD format), partySize
- Response returns available TimeSlot objects with time, available flag, and remainingCapacity
- Slots with availableTables of 0 are shown as disabled
- Slots are grouped by meal period (Lunch, Dinner, Late Night)

### Checkout Page (/checkout)

**File Location:** `src/app/(main)/checkout/page.tsx` (573 lines)

**Purpose:** Complete reservation with payment processing, hold timer management, and confirmation display.

**Component Architecture:**

- **CheckoutPage** - Main page component (lines 16-571)

- **loadActiveHold** - Hold retrieval from store/backend (lines 39-73)

- **handleExpired** - Hold expiration handler (lines 75-79)

- **formatCardNumber** - Card number formatting (lines 81-85)

- **formatExpiry** - Expiry date formatting (lines 87-93)

- **validateCardNumber** - Luhn algorithm validation (lines 95-116)

- **validateExpiry** - Date expiration check (lines 118-134)

- **validatePayment** - Full payment validation (lines 136-162)

- **handleConfirmReservation** - Payment processing (lines 164-220)

**State Management:**

The Checkout page manages complex payment state:
- **hold**: Active Hold object retrieved from store or backend
- **reservation**: Confirmed Reservation object after payment
- **paymentData**: Object with cardNumber, expiry, cvv, name fields
- **validationErrors**: Record of field-level validation errors
- **isProcessing**: Boolean during payment submission
- **isConfirmed**: Boolean after successful confirmation

**Luhn Algorithm Implementation:**

Credit card numbers are validated using the Luhn algorithm:
- Remove all non-digit characters from input
- Starting from rightmost digit, double every second digit
- If doubling results in number > 9, subtract 9
- Sum all digits
- Card is valid if sum is divisible by 10
- This catches most typing errors and invalid card numbers

**Expiry Date Validation:**

Expiry dates are checked for validity:
- Input is parsed as MM/YY format
- Month must be 01-12
- Year is converted to 4-digit format (24 → 2024)
- Date is compared against current date
- Cards expiring this month are still valid
- Returns false for expired cards

**Payment Confirmation Flow:**

When user confirms reservation:
1. Validate all payment fields (card number, expiry, CVV)
2. Show processing spinner
3. Call `confirmReservation()` API with holdId and payment method
4. On success: receive reservation object with confirmationCode
5. Clear hold from store
6. Display confirmation screen with details
7. On failure: display error message, allow retry

**HoldTimer Component (154 lines):**

The timer shows countdown until hold expiration:
- Calculates remaining time from hold.expiresAt minus current time
- Updates every second using setInterval
- Displays in MM:SS format
- Progress bar shows visual representation of time remaining
- Calls onExpired callback when timer reaches zero

**Timer Visual States:**

The timer appearance changes based on urgency:
- **Normal (>3 min)**: Green color, calm appearance
- **Warning (1-3 min)**: Yellow/orange color, subtle pulse animation
- **Critical (<1 min)**: Red color, stronger pulse, larger text
- **Expired**: Red with "Expired" text, triggers redirect

**Deposit Calculation:**

The deposit amount shown is calculated:
- Based on $25 per person × party size
- Displayed prominently before payment
- Shown again on confirmation screen
- Deposit is applied toward final bill at restaurant

### Cart Page (/cart)

**File Location:** `src/app/(main)/cart/page.tsx`

**Purpose:** Shopping cart management for restaurant orders.

**Features:**

- Cart items display with restaurant grouping

- Quantity adjustment controls

- Item removal functionality

- Price calculations with tax

- Delivery fee calculation

- Special instructions per item

- Checkout navigation

- Empty cart state handling

**Technical Implementation:**

- Zustand store for cart state management

- Item grouping by restaurant

- Real-time price calculations

- Persistence across sessions

### Favorites Page (/favorites)

**File Location:** `src/app/(main)/favorites/page.tsx`

**Purpose:** User’s saved restaurants management.

**Features:**

- Favorite restaurants grid display

- Remove from favorites functionality

- Quick reservation booking

- Restaurant search within favorites

- Favorite count display

- Empty state with discovery suggestions

**Technical Implementation:**

- API integration with `/api/favorites/[userId]`

- Optimistic UI updates

- Caching for performance

### Reservations Page (/reservations)

**File Location:** `src/app/(main)/reservations/page.tsx`

**Purpose:** User’s reservation history and management.

**Features:**

- Upcoming reservations list

- Past reservations history

- Reservation modification

- Cancellation with refund calculation

- Reservation details modal

- Status indicators (confirmed, cancelled, completed)

**Technical Implementation:**

- Tabbed interface for different reservation states

- API integration with reservation endpoints

- Real-time status updates

### Profile Page (/profile)

**File Location:** `src/app/(main)/profile/page.tsx`

**Purpose:** User profile management and statistics.

**Features:**

- Profile photo upload and display

- Personal information editing

- Account statistics (likes, reservations, account age)

- Recent order history

- Preferences management

- Account settings access

**Technical Implementation:**

- Real-time statistics calculation from multiple APIs

- Profile photo upload to S3

- Form validation and error handling

**Statistics Calculation:**\n\nProfile statistics are aggregated from multiple sources:\n- **Total Likes**: Count of items in user's favorites list\n- **Total Reservations**: Count from getUserReservations API call\n- **Account Age**: Calculated from user.createdAt timestamp\n- **Recent Orders**: Last 5 orders filtered from order history\n- Statistics update on page load and after related actions\n\n### Settings Page (/settings)

**File Location:** `src/app/(main)/settings/page.tsx`

**Purpose:** Application and account settings management.

**Features:**

- Notification preferences

- Privacy settings

- Account deletion

- Password change

- Data export options

- Theme preferences

- Language selection

**Technical Implementation:**

- Settings persistence in user profile

- API integration for password changes

- Form validation and confirmation dialogs

### History Page (/history)

**File Location:** `src/app/(main)/history/page.tsx`

**Purpose:** Comprehensive order and dining history.

**Features:**

- Complete dining history

- Order details with receipts

- Reservation history

- Favorite restaurants timeline

- Search and filter capabilities

- Export functionality

**Technical Implementation:**

- Pagination and infinite scroll

- Date-based grouping

- Local storage caching

# Backend Architecture

## Technology Stack

The backend is built with Django REST Framework and deployed on AWS infrastructure:

- **Framework:** Django REST Framework with function-based views

- **Database:** Amazon DynamoDB (NoSQL)

- **Storage:** Amazon S3 for file uploads

- **Authentication:** bcrypt password hashing

- **API File:** `FoodTok_Backend/api/views.py` (1546 lines)

## API Design

The backend follows RESTful API design principles with comprehensive endpoint coverage. All endpoints are defined in `FoodTok_Backend/api/urls.py`.

### Authentication Endpoints

**POST /api/auth/login**

*Purpose:* Authenticate user with email/password, return user profile.

*Request Body:*
- email (string, required): User's email address
- password (string, required): User's password

*Implementation Highlights:*
- Email lookup via DynamoDB scan with FilterExpression on email field
- Password verification using bcrypt.checkpw() for hashed passwords
- Legacy password migration: plain text passwords are automatically hashed on successful login
- Response includes full user profile data excluding password hash
- Session management via JWT tokens stored in localStorage

**POST /api/auth/signup**

*Purpose:* Register new user with bcrypt password hashing.

*Request Body:*
- firstName (string, required): User's first name
- lastName (string, required): User's last name
- email (string, required): Valid email address
- password (string, required): Minimum 8 characters with complexity requirements

*Implementation Highlights:*
- Email uniqueness check before registration
- Password hashing using bcrypt.hashpw() with salt generation
- User ID generated with uuid.uuid4() hex prefix
- Default preferences initialized on account creation
- Returns user object for immediate auto-login

**PATCH /api/auth/preferences**

*Purpose:* Update user preferences and profile information with dynamic UpdateExpression.

*Request Body:*
- preferences object containing: cuisines, priceRange, dietary, location
- Any subset of fields can be updated

*Implementation Highlights:*
- Dynamic UpdateExpression construction for partial updates
- Only provided fields are updated in DynamoDB
- ExpressionAttributeValues/Names prevent injection
- Returns updated user object

**POST /api/auth/change-password**

*Purpose:* Securely change user password with current password verification.

*Implementation:*


### Favorites Endpoints

**GET /api/favorites/userId**

- User’s favorite restaurants list

- Restaurant details with match scores

- Pagination support

**POST /api/favorites**

- Add restaurant to favorites

- Duplicate prevention

- Match score calculation

**DELETE /api/favorites**

- Remove restaurant from favorites

- Optimistic updates

**GET /api/favorites/check**

- Check if restaurant is favorited

- User-specific validation

### Reservation Endpoints

The reservation system implements a hold-based booking flow to prevent double-bookings.

**POST /api/reservations/availability**

*Purpose:* Check available time slots for a given date and party size.


**POST /api/reservations/hold**

*Purpose:* Create a 10-minute reservation hold before payment.


**GET /api/reservations/hold/active**

*Purpose:* Retrieve user’s active (non-expired) hold.


**POST /api/reservations/confirm**

*Purpose:* Convert hold to confirmed reservation with payment.


**GET /api/reservations/user/userId**

*Purpose:* Get user’s reservation history with filtering.

*Query Parameters:*

- `filter` - “upcoming”, “past”, or “all”


### Match Score Algorithm

The match score algorithm calculates a compatibility score (0-100) between a restaurant and user preferences.

**Scoring Breakdown:**

- **Cuisine Match (40 points):** 40 if cuisine matches preferences, 10 for new cuisine, 20 if no preference set

- **Price Range Match (30 points):** 30 for exact match, 15 if within 1 price level

- **Dietary Options (20 points):** 20 if dietary needs are met, 5 if no restrictions listed

- **Base Popularity (10 points):** Rating $`\times`$ 2, capped at 10


## Database Schema

### DynamoDB Tables

**Users Table**

- Primary Key: `userId` (String)

- Attributes: email, passwordHash, profile, preferences, createdAt

- GSI: None required

**Favorites Table**

- Primary Key: `userId` (HASH), `restaurantId` (RANGE)

- Attributes: restaurantName, matchScore, favoritedAt

**Reservations Table**

- Primary Key: `reservationId` (String)

- Attributes: userId, restaurantId, date, time, partySize, status

- GSI: UserReservations (userId + date)

**Holds Table**

- Primary Key: `holdId` (String)

- Attributes: userId, restaurantId, date, time, partySize, expiresAt

## Testing Infrastructure

### Unit Tests

- Frontend: Jest + React Testing Library

- Backend: pytest with coverage reporting

- API Tests: Comprehensive endpoint testing

- Component Tests: UI interaction testing

### Load Testing

- Locust framework for performance testing

- 200 concurrent user simulation

- API endpoint stress testing

- Response time monitoring

### CI/CD Pipeline

- GitHub Actions workflows

- Automated testing on push/PR

- Code coverage reporting

- Multi-environment deployment

# Data Flow Architecture

## Reservation Flow

1.  User discovers restaurant via Yelp API integration

2.  Frontend fetches real-time availability from backend

3.  User selects date/time, system creates 10-minute hold

4.  Hold stored in DynamoDB with expiration timestamp

5.  User proceeds to checkout with active hold

6.  Payment processing converts hold to confirmed reservation

7.  Reservation record created, hold deleted

## Authentication Flow

1.  User submits login credentials

2.  Backend validates against DynamoDB Users table

3.  JWT token generated and returned

4.  Frontend stores token in localStorage

5.  Subsequent requests include Authorization header

6.  Token validation on protected endpoints

## Favorites Management

1.  User favorites restaurant from discovery or detail page

2.  Frontend calls POST /api/favorites

3.  Backend stores in Favorites table with userId + restaurantId

4.  Optimistic UI updates for immediate feedback

5.  Real-time sync with backend state

# Performance Optimizations

## Frontend Optimizations

- Code splitting with Next.js dynamic imports

- Image optimization with Next.js Image component

- API response caching with React Query

- Lazy loading for non-critical components

- Bundle analysis and tree shaking

## Backend Optimizations

- DynamoDB query optimization with proper indexing

- API response caching with Redis (planned)

- Database connection pooling

- Asynchronous task processing

## Infrastructure Optimizations

- Docker multi-stage builds for smaller images

- CDN integration for static assets

- Database read replicas for high availability

- Auto-scaling configurations

# Security Measures

## Authentication Security

- Password hashing with bcrypt

- JWT token expiration and refresh

- Secure cookie settings

- Rate limiting on auth endpoints

## API Security

- Input validation and sanitization

- SQL injection prevention

- XSS protection

- CORS configuration

## Data Protection

- Encryption at rest for sensitive data

- Secure S3 bucket configurations

- GDPR compliance considerations

- Data export capabilities

# Docker Infrastructure

## Docker Compose Configuration

**File:** `docker-compose.backend.yml` (131 lines)

The backend development environment uses Docker Compose with 5 services:

### Services Overview

| **Service** | **Image** | **Port** | **Purpose** |
|:---|:---|:---|:---|
| dynamo | amazon/dynamodb-local | 8000 | Local DynamoDB database |
| localstack | localstack/localstack:3.2.0 | 4566 | S3 simulation |
| backend | Custom (Python 3.12) | 8080 | Django backend API |
| local_config | Custom | \- | Table/bucket initialization |
| dynamodb-admin | aaronshaf/dynamodb-admin | 8001 | DynamoDB GUI |

### DynamoDB Local Service


### LocalStack S3 Service


### Backend Application Service


## Dockerfile

**File:** `FoodTok_Backend/Dockerfile.backend` (16 lines)


## Makefile Commands

**File:** `Makefile` (221 lines)

### Docker Commands

**Primary Workflow (Recommended):**

| **Command**           | **Description**                                              |
|:----------------------|:-------------------------------------------------------------|
| **`make build-all`**  | **Build both backend and frontend Docker images**            |
| **`make up-all`**     | **Start all services (backend + frontend) in detached mode** |
| **`make ps-all`**     | **List all running containers (backend + frontend)**         |
| **`make down-all`**   | **Stop and remove all containers and volumes**               |

**Individual Service Commands (Advanced):**

| **Command**           | **Description**                    |
|:----------------------|:-----------------------------------|
| `make backend-build`  | Build backend Docker images only   |
| `make backend-up`     | Start backend services only        |
| `make backend-down`   | Stop backend containers only       |
| `make backend-ps`     | List backend containers only       |
| `make frontend-build` | Build frontend Docker images only  |
| `make frontend-up`    | Start frontend services only       |
| `make frontend-down`  | Stop frontend containers only      |
| `make frontend-ps`    | List frontend containers only      |

**Note:** For local development, use the combined `*-all` targets to ensure both frontend and backend are running together.

### Testing Commands

| **Command**                   | **Description**                  |
|:------------------------------|:---------------------------------|
| `make backend-test`           | Run pytest with full trace       |
| `make backend-test-coverage`  | Run tests with HTML coverage     |
| `make frontend-test`          | Run Jest frontend tests          |
| `make frontend-test-coverage` | Frontend tests with coverage     |
| `make load-test`              | Run Locust load tests (20 users) |
| `make load-test-local`        | Load test against localhost      |

### AWS CDK Commands

| **Command**          | **Description**                    |
|:---------------------|:-----------------------------------|
| `make install`       | Install CDK dependencies           |
| `make bootstrap`     | Bootstrap CDK environment          |
| `make synth`         | Synthesize CloudFormation template |
| `make deploy`        | Deploy stack to AWS                |
| `make destroy`       | Tear down AWS stack                |

### Example: Full Local Development Setup


## Environment Variables

| **Variable**             | **Value/Purpose**              |
|:-------------------------|:-------------------------------|
| `IS_LOCAL`               | true (enables local endpoints) |
| `AWS_ACCESS_KEY_ID`      | test (LocalStack credential)   |
| `AWS_SECRET_ACCESS_KEY`  | test (LocalStack credential)   |
| `AWS_REGION`             | us-east-1                      |
| `DDB_USERS_TABLE`        | Users table name               |
| `DDB_FAVORITES_TABLE`    | Favorites table name           |
| `DDB_RESERVATIONS_TABLE` | Reservations table name        |
| `DDB_HOLDS_TABLE`        | Holds table name               |
| `LOCAL_DYNAMO_ENDPOINT`  | http://dynamo:8000             |
| `LOCAL_S3_ENDPOINT`      | http://localstack:4566         |

## Production Deployment

- AWS ECS with Fargate for container orchestration

- Application Load Balancer for traffic distribution

- Amazon DynamoDB for data persistence

- Amazon S3 for file storage

- CloudWatch for monitoring and logging

### Reservation Flow Test


### Test Utilities


## Load Testing with Locust

**Location:** `load_tests/locustfile.py` (62 lines)

Load testing simulates realistic user traffic patterns using Locust.

### User Behavior Simulation


### Load Test Ramp-Up Configuration


**Running Load Tests:**


# CI/CD Pipeline

## GitHub Actions Workflow

**Location:** `.github/workflows/ci.yml` (164 lines)

The CI pipeline runs automatically on pushes and pull requests to `main` and `develop` branches.

### Pipeline Stages

1.  **Checkout** - Clone repository

2.  **Python Setup** - Install Python 3.11 and dependencies

3.  **Docker Setup** - Build backend services with Docker Compose

4.  **Infrastructure Wait** - Wait for DynamoDB and LocalStack

5.  **Table Initialization** - Create DynamoDB tables and S3 buckets

6.  **Backend Health Check** - Wait for /api/helloECS to respond

7.  **Seed Data Wait** - Ensure test data is available

8.  **Run Tests** - Execute pytest with 75% coverage minimum

9.  **Coverage Upload** - Upload to Codecov

10. **Cleanup** - Tear down Docker services

### Infrastructure Readiness Check


### Test Execution with Coverage


### Environment Variables

| **Variable**                 | **Purpose**                     |
|:-----------------------------|:--------------------------------|
| `COVERAGE_MIN`               | Minimum code coverage (75%)     |
| `CODECOV_TOKEN`              | Token for Codecov uploads       |
| `FOODTOK_SMOKE_BASE_URL`     | Backend API URL for tests       |
| `FOODTOK_SMOKE_MANAGE_STACK` | Control Docker stack management |

# Frontend API Integration Layer

## API Module Overview

**Location:** `FoodTok_Frontend/src/lib/api/`

| **Module**        | **Size** | **Purpose**                     |
|:------------------|:---------|:--------------------------------|
| `auth.ts`         | 2.8 KB   | Login, signup, logout API calls |
| `favorites.ts`    | 2.3 KB   | Favorite CRUD operations        |
| `reservations.ts` | 6.5 KB   | Reservation management          |
| `restaurants.ts`  | 4.7 KB   | Restaurant data fetching        |
| `yelp.ts`         | 14.2 KB  | Yelp Fusion API integration     |
| `stats.ts`        | 1.7 KB   | User statistics                 |
| `index.ts`        | 6.5 KB   | Central API request handler     |

## Core API Request Handler


## Yelp API Integration

**File:** `yelp.ts` (14,213 bytes)


## Mock Data Modules

For development and testing, mock data modules simulate backend responses:

- `mock-auth.ts` (4.8 KB) - Mock authentication responses

- `mock-reservations.ts` (30.3 KB) - Mock reservation data

- `mock-restaurants.ts` (11.2 KB) - Mock restaurant catalog

# AWS CDK Infrastructure

## Infrastructure as Code Overview

**Location:** `cdk/lib/main-stack.ts` (108 lines)

FoodTok uses AWS CDK (Cloud Development Kit) to define cloud infrastructure as TypeScript code.

### Stack Constructs

| **Construct** | **Purpose** |
|:---|:---|
| S3Construct | Image storage bucket |
| DdbConstruct | DynamoDB tables (Users, Favorites, Reservations, Holds) |
| BackendECSConstruct | Django API on ECS Fargate |
| FrontendECSConstruct | Next.js app on ECS Fargate |
| CognitoConstruct | User pool authentication (optional) |

### Main Stack Architecture


### CDK Deployment Commands

| **Command**          | **Purpose**                       |
|:---------------------|:----------------------------------|
| `make bootstrap`     | Initialize CDK environment in AWS |
| `make synth`         | Generate CloudFormation template  |
| `make deploy`        | Deploy stack to AWS               |
| `make destroy`       | Tear down all AWS resources       |

### Production Architecture

- **VPC:** Shared VPC for backend and frontend services

- **ECS Fargate:** Serverless container orchestration

- **Application Load Balancer:** Traffic distribution with health checks

- **DynamoDB:** Fully managed NoSQL database

- **S3:** Image and asset storage

- **CloudWatch:** Logging and monitoring

# Conclusion

FoodTok represents a comprehensive restaurant reservation platform with modern web technologies, robust backend architecture, and excellent user experience. The application successfully integrates real restaurant data with user management, reservations, and social features.

The codebase demonstrates best practices in:

- Modern React/Next.js development

- RESTful API design

- Database optimization

- Testing and quality assurance

- DevOps and deployment
