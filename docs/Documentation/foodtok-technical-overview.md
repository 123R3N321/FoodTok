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

```
const SLOT_LOCKS = new Map<string, boolean>();

async function acquireLock(lockKey: string, timeoutMs = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (!SLOT_LOCKS.get(lockKey)) {
      SLOT_LOCKS.set(lockKey, true);
      return true;  // Lock acquired
    }
    await delay(50);  // Retry every 50ms
  }
  
  return false;  // Timeout - slot being reserved by another user
}

function releaseLock(lockKey: string): void {
  SLOT_LOCKS.delete(lockKey);
}
```

**Usage in Hold Creation:**

```
export async function createHold(request) {
  const lockKey = `${restaurantId}:${date}:${time}`;
  const lockAcquired = await acquireLock(lockKey);
  
  if (!lockAcquired) {
    throw new Error('This time slot is currently being reserved by another user.');
  }

  try {
    // Check availability and create hold atomically
    const reserved = reserveSlot(restaurantId, date, time, holdId, true);
    if (!reserved) throw new Error('Slot no longer available.');
    // ... create hold ...
  } finally {
    releaseLock(lockKey);  // ALWAYS release lock
  }
}
```

## Idempotency Guarantees

**Problem:** User clicking “Confirm” multiple times could cause double charges.

**Solution:** Idempotency checks at multiple levels.

### Hold Idempotency

```
// User can only have ONE active hold at a time
const existingHold = Array.from(MOCK_HOLDS.values()).find(
  h => h.userId === userId && h.status === 'held' && h.expiresAt > Date.now()
);

if (existingHold) {
  throw new Error('You already have an active reservation in progress.');
}
```

### Confirmation Idempotency

```
// Check if already confirmed before processing payment
const existingReservation = Array.from(MOCK_RESERVATIONS.values()).find(
  r => r.userId === userId && 
       r.restaurantId === hold.restaurantId && 
       r.date === hold.date && 
       r.time === hold.time &&
       ['confirmed', 'modified'].includes(r.status)
);

if (existingReservation) {
  // Already confirmed - return existing reservation (idempotent)
  return {
    reservation: existingReservation,
    message: `Reservation already confirmed! Code: ${existingReservation.confirmationCode}`,
  };
}
```

## Inventory Management and Slot Capacity

**Problem:** Need to track available tables in real-time across holds and reservations.

**Solution:** Capacity tracking with separation of holds vs confirmed reservations.

```
interface SlotCapacity {
  totalTables: number;        // e.g., 10 tables per slot
  availableTables: number;    // Real-time count
  holds: Set<string>;         // Active hold IDs (pending payment)
  reservations: Set<string>;  // Confirmed reservation IDs
  lastUpdated: number;
}
```

**Key Operations:**

1.  **reserveSlot()** - Decrement available tables, add to holds/reservations

2.  **releaseSlot()** - Increment available tables when hold expires or reservation cancels

3.  **convertHoldToReservation()** - Move ID from holds to reservations (no capacity change)

## 10-Minute Hold System with Auto-Expiry

**Problem:** Users need time to enter payment details without blocking others indefinitely.

**Solution:** 10-minute temporary hold with automatic cleanup.

```
const hold = {
  holdId,
  userId,
  restaurantId,
  expiresAt: Date.now() + (10 * 60 * 1000),  // 10 minutes
  status: 'held',
};

MOCK_HOLDS.set(holdId, hold);

// AUTO-EXPIRY: Simulate DynamoDB TTL
setTimeout(() => {
  const expiredHold = MOCK_HOLDS.get(holdId);
  if (expiredHold && expiredHold.status === 'held') {
    // Release table back to inventory
    releaseSlot(restaurantId, date, time, holdId);
    MOCK_HOLDS.delete(holdId);
    console.log(`[HOLD EXPIRED] ${holdId} - Table released`);
  }
}, 10 * 60 * 1000);
```

## Yelp Fusion API Integration

FoodTok uses real restaurant data from Yelp’s Fusion API to provide accurate, up-to-date information.

### API Endpoints Used

| **Endpoint**         | **Purpose**                                      |
|:---------------------|:-------------------------------------------------|
| `/businesses/search` | Discover restaurants by location, cuisine, price |
| `/businesses/{id}`   | Get detailed restaurant information              |

### Integration Architecture

```
// FoodTok_Frontend/src/app/api/yelp/search/route.ts
const YELP_API_BASE = 'https://api.yelp.com/v3';
const YELP_API_KEY = process.env.YELP_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const yelpUrl = new URL(`${YELP_API_BASE}/businesses/search`);
  yelpUrl.searchParams.set('term', searchParams.get('term') || 'restaurants');
  yelpUrl.searchParams.set('location', searchParams.get('location') || 'NYC');
  yelpUrl.searchParams.set('limit', '20');
  
  const response = await fetch(yelpUrl, {
    headers: {
      'Authorization': `Bearer ${YELP_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  return NextResponse.json(await response.json());
}
```

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

```
const hoursUntilReservation = 
  (reservationDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

let refundAmount = 0;
let refundMessage = '';

if (hoursUntilReservation >= 24) {
  // Full refund - 24+ hours notice
  refundAmount = reservation.depositAmount;
  refundMessage = 'Full refund processed.';
} else if (hoursUntilReservation >= 4) {
  // 50% refund - 4-24 hours notice
  refundAmount = reservation.depositAmount * 0.5;
  refundMessage = '50% refund processed.';
} else {
  // No refund - less than 4 hours
  refundAmount = 0;
  refundMessage = 'No refund for last-minute cancellations.';
}
```

| **Cancellation Time** | **Refund** |
|:----------------------|:----------:|
| 24+ hours before      |    100%    |
| 4-24 hours before     |    50%     |
| $`<`$ 4 hours before  |     0%     |

## NYC-Style Deposit Pricing

Deposits are calculated at \$25 per person, reflecting NYC restaurant norms:

```
const depositPerPerson = 25;
const totalDeposit = depositPerPerson * partySize;

// Example: Party of 4 = $100 deposit
```

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

```
interface CartState {
  cart: Cart | null;
  isOpen: boolean;
}

interface CartActions {
  addItem: (restaurant, menuItem, quantity?, customizations?) => void;
  removeItem: (menuItemId: string) => void;
  updateItemQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setCartOpen: (isOpen: boolean) => void;
  calculateTotals: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: null,
      isOpen: false,

      addItem: (restaurant, menuItem, quantity = 1) => {
        // Clear cart if switching restaurants
        if (cart && cart.restaurantId !== restaurant.id) {
          get().clearCart();
        }
        
        // Add item and recalculate totals
        // ... item addition logic ...
        get().calculateTotals();
      },

      calculateTotals: () => {
        const subtotal = cart.items.reduce((total, item) => {
          const itemPrice = item.menuItem.price;
          const customizationPrice = item.customizations?.reduce(
            (sum, c) => sum + (c.selected ? c.price : 0), 0
          ) || 0;
          return total + ((itemPrice + customizationPrice) * item.quantity);
        }, 0);
        
        // NYC Sales Tax: 8.875%
        const tax = subtotal * 0.08875;
        
        // Standard delivery fee
        const deliveryFee = 3.99;
        
        const total = subtotal + tax + deliveryFee;
        set({ cart: { ...cart, subtotal, tax, total } });
      }
    }),
    { name: 'foodtok-cart' }  // localStorage key
  )
);
```

**Reservation Store Implementation** (26 lines):

```
interface ReservationState {
  activeHold: Hold | null;
  setActiveHold: (hold: Hold | null) => void;
  clearHold: () => void;
}

export const useReservationStore = create<ReservationState>((set) => ({
  activeHold: null,
  
  setActiveHold: (hold) => {
    console.log('Store: Setting active hold:', hold);
    set({ activeHold: hold });
  },
  
  clearHold: () => {
    console.log('Store: Clearing active hold');
    set({ activeHold: null });
  },
}));
```

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

```
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

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

```
const router = useRouter();
const { login, isLoading, error, clearError } = useAuthStore();

const [formData, setFormData] = useState({
  email: '',
  password: ''
});
const [showPassword, setShowPassword] = useState(false);
const [validationErrors, setValidationErrors] = 
  useState<Record<string, string>>({});
```

**Form Validation Logic:**

```
const validateForm = () => {
  const errors: Record<string, string> = {};
  
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Please enter a valid email';
  }
  
  if (!formData.password) {
    errors.password = 'Password is required';
  }
  
  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**Authentication Flow:**

1.  User enters email and password in controlled input components

2.  `handleSubmit` validates form data using regex pattern `/§+@§+§̇+/`

3.  Auth store’s `login()` method is called with credentials

4.  Store makes POST request to `/api/auth/login`

5.  On success: user data persisted to localStorage, redirect to home

6.  On failure: error message displayed with animated appearance

**UI Features:**

- **Password visibility toggle** - Eye/EyeOff icons from Lucide

- **Loading state** - Loader2 spinner animation during API call

- **Error animation** - Framer Motion scale + opacity transition

- **Demo credentials display** - Pre-filled credentials for testing

- **Card-based layout** - Using custom Card component with header/content sections

**Error Handling Pattern:**

```
{error && (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="p-3 text-sm text-destructive 
      bg-destructive/10 rounded-md border 
      border-destructive/20"
  >
    {error}
  </motion.div>
)}
```

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

```
const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
});
```

**Password Validation Rules:**

```
const getPasswordValidation = () => {
  const password = formData.password;
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
};
```

**Comprehensive Form Validation:**

```
const validateForm = () => {
  const errors: Record<string, string> = {};
  
  // Name validation
  if (!formData.firstName.trim()) {
    errors.firstName = 'First name is required';
  }
  if (!formData.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }
  
  // Email validation using utility function
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email';
  }
  
  // Password validation using utility function
  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (!isValidPassword(formData.password)) {
    errors.password = 'Password must be 8+ chars with 
      uppercase, lowercase, and number';
  }
  
  // Confirm password match
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};
```

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

```
const cuisineOptions = [
  { value: 'italian', label: 'Italian', emoji: '\emoji{pizza}' },
  { value: 'japanese', label: 'Japanese', emoji: '\emoji{sushi}' },
  { value: 'mexican', label: 'Mexican', emoji: '\emoji{taco}' },
  { value: 'chinese', label: 'Chinese', emoji: '\emoji{takeout}' },
  { value: 'indian', label: 'Indian', emoji: '\emoji{curry}' },
  { value: 'thai', label: 'Thai', emoji: '\emoji{bowl}' },
  { value: 'french', label: 'French', emoji: '\emoji{croissant}' },
  { value: 'mediterranean', label: 'Mediterranean', emoji: '\emoji{falafel}' },
  { value: 'american', label: 'American', emoji: '\emoji{hamburger}' },
  { value: 'korean', label: 'Korean', emoji: '\emoji{hotpot}' },
  { value: 'vietnamese', label: 'Vietnamese', emoji: '\emoji{noodles}' },
  { value: 'greek', label: 'Greek', emoji: '\emoji{stuffed-flatbread}' },
];
```

**Dietary Restriction Options:**

```
const dietaryOptions = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'nut-free', label: 'Nut-free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];
```

**Price Range Options:**

```
const priceOptions = [
  { value: '$', label: 'Budget', description: 'Under $15 per person' },
  { value: '$$', label: 'Moderate', description: '$15-30 per person' },
  { value: '$$$', label: 'Upscale', description: '$30-60 per person' },
  { value: '$$$$', label: 'Fine dining', description: '$60+ per person' },
];
```

**Geolocation Integration:**

```
const requestLocation = () => {
  if (!navigator.geolocation) {
    setLocationError('Geolocation not supported');
    return;
  }

  setIsRequestingLocation(true);
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Reverse geocode to get city name
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client
           ?latitude=${latitude}&longitude=${longitude}`
        );
        const data = await response.json();
        setLocation({
          coordinates: { lat: latitude, lng: longitude },
          city: data.city || data.locality,
          state: data.principalSubdivision
        });
      } catch (err) {
        setLocation({
          coordinates: { lat: latitude, lng: longitude },
          city: 'Unknown',
          state: ''
        });
      }
      setIsRequestingLocation(false);
    },
    (error) => {
      setLocationError(error.message);
      setIsRequestingLocation(false);
    }
  );
};
```

**Preference Persistence:**

```
const handleComplete = async () => {
  if (!user) return;

  setIsSaving(true);
  try {
    const preferences = {
      cuisineTypes: selectedCuisines,
      priceRange: selectedPrice,
      dietaryRestrictions: selectedDietary,
      location: location
    };

    await updatePreferences(preferences);
    router.push('/'); // Navigate to discovery
  } catch (error) {
    console.error('Failed to save preferences:', error);
  } finally {
    setIsSaving(false);
  }
};
```

**Step Validation Logic:**

```
const canProceed = () => {
  switch (currentStep) {
    case 0:
      return selectedCuisines.length >= 1;
    case 1:
      return selectedPrice !== '';
    case 2:
      return true; // Dietary is optional
    case 3:
      return location !== null || locationError !== '';
    default:
      return false;
  }
};
```

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

```
const { user } = useAuthStore();
const {
  queue,           // Array of DiscoveryCard objects
  currentIndex,    // Current card position in queue
  isLoading,       // Loading state for API calls
  error,           // Error message if any
  loadQueue,       // Load/reload restaurant queue
  swipeCard,       // Handle swipe action
  getCurrentCard,  // Get current visible card
  hasMoreCards,    // Check if more cards available
  undoSwipe        // Undo last swipe action
} = useDiscoveryStore();

const [cardKey, setCardKey] = useState(0);
const [isDragging, setIsDragging] = useState(false);
const [lastSwipeDirection, setLastSwipeDirection] = 
  useState<'left' | 'right'>('left');
```

**Swipe Mechanics Implementation:**

```
const handleSwipe = (direction: 'left' | 'right') => {
  const currentCard = getCurrentCard();
  if (!currentCard) return;
  
  // Set direction first for exit animation
  setLastSwipeDirection(direction);
  
  // Use requestAnimationFrame to ensure state updates
  // before card key changes trigger re-render
  requestAnimationFrame(() => {
    swipeCard(direction, currentCard.restaurant.id);
    setCardKey(prev => prev + 1);
  });
};
```

**Discovery Queue Loading:**

```
useEffect(() => {
  // Load initial queue when component mounts
  if (user && queue.length === 0) {
    loadQueue(user.id, user.preferences);
  }
}, [user, queue.length, loadQueue]);
```

**Discovery Store Actions (discovery.ts - 224 lines):**

```
loadQueue: async (userId?: string, preferences?: any) => {
  set({ isLoading: true, error: null });
  
  try {
    // Get favorited restaurant IDs to exclude
    let excludeIds: string[] = [];
    if (userId) {
      const favorites = await getUserFavorites(userId);
      excludeIds = favorites.map(f => f.restaurantId);
    }
    
    // Fetch from Yelp API with preferences
    const response = await getDiscoveryRestaurants(
      userId || 'default',
      20, // Fetch 20 restaurants for variety
      preferences
    );
    
    // Filter out already favorited restaurants
    const filteredQueue = response.filter(
      card => !excludeIds.includes(card.restaurant.id)
    );
    
    set({
      queue: filteredQueue,
      currentIndex: 0,
      isLoading: false
    });
  } catch (error) {
    set({ error: 'Network error', isLoading: false });
  }
}
```

**Swipe Action with Backend Sync:**

```
swipeCard: (direction: 'left' | 'right', restaurantId: string) => {
  const { currentIndex, queue, swipeHistory } = get();
  
  // Record swipe action for undo
  const swipeAction = {
    direction,
    restaurantId,
    timestamp: new Date()
  };
  
  set({
    currentIndex: currentIndex + 1,
    swipeHistory: [...swipeHistory, swipeAction],
    likedRestaurants: direction === 'right' 
      ? [...get().likedRestaurants, restaurantId]
      : get().likedRestaurants
  });
  
  // Persist favorite to backend (fire and forget)
  if (direction === 'right') {
    const card = queue[currentIndex];
    addFavorite(
      userId,
      restaurantId,
      card.restaurant.name,
      card.matchScore,
      card.restaurant.images?.[0] || ''
    );
  }
  
  // Refill queue if running low
  if (currentIndex + 2 >= queue.length) {
    get().refillQueue();
  }
}
```

**Undo Swipe Functionality:**

```
undoSwipe: () => {
  const { currentIndex, swipeHistory } = get();
  
  if (currentIndex > 0 && swipeHistory.length > 0) {
    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    
    set(state => ({
      currentIndex: currentIndex - 1,
      swipeHistory: swipeHistory.slice(0, -1),
      likedRestaurants: state.likedRestaurants
        .filter(id => id !== lastSwipe.restaurantId),
      passedRestaurants: state.passedRestaurants
        .filter(id => id !== lastSwipe.restaurantId)
    }));
  }
}
```

**Card Stack Rendering with AnimatePresence:**

```
<AnimatePresence mode="wait">
  {currentCard && (
    <RestaurantCard
      key={`card-${currentIndex}-${cardKey}`}
      card={currentCard}
      onSwipe={handleSwipe}
      onCardClick={handleCardClick}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      isTopCard={true}
      swipeDirection={lastSwipeDirection}
    />
  )}
</AnimatePresence>
```

**UI States:**

- **Loading State** - Centered Loader2 spinner with message

- **Error State** - Error icon with retry button

- **Empty Queue State** - Celebration emoji with "View Liked" button

- **Active State** - Card stack with header controls

**Header Controls:**

- **Undo Button** - RotateCcw icon, disabled at index 0

- **Refresh Button** - RefreshCw icon with spin animation when loading

- **Queue Counter** - Shows remaining cards in queue

**First-Time User Instructions:**

```
{currentIndex === 0 && !isLoading && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 1 }}
    className="absolute bottom-4 left-4 right-4 
      bg-primary/90 text-primary-foreground 
      p-3 rounded-lg text-center text-sm"
  >
    <p>Swipe right to like, left to pass, 
       or tap to view details</p>
  </motion.div>
)}
```

### Restaurant Detail Page (/restaurant/\[id\])

**File Location:** `src/app/(main)/restaurant/[id]/page.tsx` (289 lines)

**Purpose:** Comprehensive restaurant view with Yelp data integration, menu display, and reservation booking via modal.

**Component Architecture:**

- **RestaurantDetailsPage** - Main page component (lines 32-289)

- **fetchRestaurant** - Async data loading effect (lines 56-71)

- **handleAddToCart** - Cart item addition (lines 73-85)

- **handleHoldCreated** - Hold conversion and navigation (lines 94-127)

**State Management:**

```
const params = useParams();
const router = useRouter();
const { user } = useAuthStore();
const { cart, addItem, setCartOpen } = useCartStore();

const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [selectedCategory, setSelectedCategory] = useState('all');
const [itemQuantities, setItemQuantities] = 
  useState<Record<string, number>>({});
const [reservationModalOpen, setReservationModalOpen] = useState(false);
```

**Yelp API Data Fetching:**

```
useEffect(() => {
  const fetchRestaurant = async () => {
    if (!params.id) return;
    
    setIsLoading(true);
    try {
      const response = await getRestaurantById(params.id as string);
      setRestaurant(response as any);
    } catch (err) {
      setError('Failed to load restaurant details');
    } finally {
      setIsLoading(false);
    }
  };

  fetchRestaurant();
}, [params.id]);
```

**Hold Creation Handler:**

```
const handleHoldCreated = (holdData: any) => {
  // Backend expiresAt is incorrect - calculate correct expiry
  const correctExpiresAt = Date.now() + (10 * 60 * 1000);
  
  // Convert backend format to frontend Hold type
  const hold: Hold = {
    holdId: holdData.hold.holdId,
    userId: holdData.hold.userId,
    restaurantId: holdData.hold.restaurantId,
    restaurantName: holdData.restaurantName || restaurant?.name,
    restaurantImage: holdData.restaurantImage || 
      restaurant?.images?.[0] || '',
    date: holdData.hold.date,
    time: holdData.hold.time,
    partySize: holdData.hold.partySize,
    status: 'held',
    depositAmount: holdData.totalDeposit || 50,
    createdAt: Date.now(),
    expiresAt: correctExpiresAt
  };
  
  // Store in Zustand global state
  useReservationStore.getState().setActiveHold(hold);
  
  // Navigate to checkout
  router.push('/checkout');
};
```

**UI Sections:**

- **Hero Image** - Full-width image with gradient overlay

- **Back Button** - Navigate to previous page

- **Favorite Button** - Heart icon for bookmarking

- **Name Overlay** - Restaurant name, rating, price range on image

- **Description** - Restaurant description text

- **Cuisine Tags** - Pill badges for each cuisine type

- **Address Section** - MapPin icon with full address

- **Hours Section** - Clock icon with operating hours

- **Yelp Link** - External link button to Yelp page

- **Reserve Button** - Orange CTA button opening modal

**ReservationModal Component (389 lines):**

```
interface ReservationModalProps {
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  isOpen: boolean;
  onClose: () => void;
  onHoldCreated: (holdData: any) => void;
}
```

**Modal Step Flow:**

1.  **Date Selection** - 30-day calendar picker with generated dates

2.  **Party Size** - Increment/decrement buttons (1-20 guests)

3.  **Time Slot Selection** - Available slots from backend

4.  **Confirmation** - Summary and "Confirm Hold" button

**Availability Check API Call:**

```
const handleCheckAvailability = async () => {
  if (!selectedDate) return;
  
  setCheckingAvailability(true);
  try {
    const response = await checkAvailability({
      restaurantId,
      date: selectedDate.toISOString().split('T')[0],
      partySize,
      timeRange: { start: '17:00', end: '22:00' }
    });
    
    setAvailableSlots(response.availableSlots);
  } catch (err) {
    setError('Failed to check availability');
  } finally {
    setCheckingAvailability(false);
  }
};
```

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

```
const router = useRouter();
const { user } = useAuthStore();
const clearHold = useReservationStore((state) => state.clearHold);

const [hold, setHold] = useState<Hold | null>(null);
const [loading, setLoading] = useState(true);
const [processing, setProcessing] = useState(false);
const [error, setError] = useState('');
const [reservation, setReservation] = useState<Reservation | null>(null);

// Payment form state
const [cardNumber, setCardNumber] = useState('');
const [expiry, setExpiry] = useState('');
const [cvv, setCvv] = useState('');
const [name, setName] = useState('');
const [specialRequests, setSpecialRequests] = useState('');
```

**Luhn Algorithm Implementation:**

```
const validateCardNumber = (num: string): boolean => {
  const cleaned = num.replace(/\s/g, '');
  if (!/^\d{16}$/.test(cleaned)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};
```

**Expiry Date Validation:**

```
const validateExpiry = (exp: string): boolean => {
  if (exp.length !== 5) return false;
  
  const [month, year] = exp.split('/').map(Number);
  if (!month || !year) return false;
  if (month < 1 || month > 12) return false;
  
  // Check if card is expired
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
};
```

**Payment Confirmation Flow:**

```
const handleConfirmReservation = async () => {
  if (!hold || !user?.id) return;
  if (!validatePayment()) return;

  setProcessing(true);
  try {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = await confirmReservation({
      holdId: hold.holdId,
      userId: user.id,
      paymentMethod: {
        type: 'credit-card',
        last4: cardNumber.replace(/\s/g, '').slice(-4),
        cardholderName: name,
        expiryMonth: expiry.split('/')[0],
        expiryYear: '20' + expiry.split('/')[1],
      },
      specialRequests: specialRequests || undefined,
    });

    setReservation(result.reservation);
    clearHold(); // Clear from Zustand store
  } catch (err) {
    setError(err.message || 'Payment failed');
  } finally {
    setProcessing(false);
  }
};
```

**HoldTimer Component (154 lines):**

```
interface HoldTimerProps {
  hold: Hold;
  onExpired: () => void;
}

export default function HoldTimer({ hold, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!hold.expiresAt || isNaN(hold.expiresAt)) {
        // Default to 10 minutes from now
        const fallback = Date.now() + (10 * 60 * 1000);
        setTimeLeft(fallback - Date.now());
        return;
      }

      const remaining = Math.max(0, hold.expiresAt - Date.now());
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        onExpired();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [hold.expiresAt, onExpired]);
}
```

**Timer Visual States:**

```
const totalSeconds = Math.floor(timeLeft / 1000);
const minutes = Math.floor(totalSeconds / 60);
const seconds = totalSeconds % 60;
const percentage = Math.min(100, 
  Math.max(0, (timeLeft / (10 * 60 * 1000)) * 100));

const isUrgent = minutes < 2;   // Orange warning
const isCritical = minutes < 1;  // Red critical
```

**Confirmation Success Screen:**

- Animated green checkmark with spring animation

- Confirmation code in large monospace font

- Reservation details (date, time, party size)

- Deposit amount paid

- Navigation buttons to home and reservations

**Deposit Calculation:**

```
const depositPerPerson = hold?.depositAmount 
  ? (hold.depositAmount / (hold.partySize || 1)) 
  : 25;
const totalDeposit = hold?.depositAmount 
  || (depositPerPerson * (hold?.partySize || 1));

// Refund policy displayed:
// - 100% refund: 24+ hours before
// - 50% refund: 4-24 hours before  
// - No refund: within 4 hours
```

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

**Statistics Calculation:**

```
// Calculate stats from real data sources
const [favoritesRes, reservationsRes] = await Promise.allSettled([
  apiRequest(`/favorites/${userId}`),
  apiRequest(`/reservations/user/${userId}?filter=all`)
]);

const totalLikes = favoritesRes.value?.length || 0;
const totalReservations = reservationsRes.value?.reservations?.length || 0;
```

### Settings Page (/settings)

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

```
{
  "email": "user@example.com",
  "password": "password123"
}
```

*Implementation Highlights:*

```
@api_view(["POST"])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")
    
    if not email or not password:
        return Response({"error": "Email and password required"}, 
                        status=400)
    
    # Query DynamoDB by email using FilterExpression
    table = dynamodb.Table(TABLE_USERS)
    response = table.scan(
        FilterExpression="email = :email",
        ExpressionAttributeValues={":email": email}
    )
    
    users = response.get("Items", [])
    if not users:
        return Response({"error": "Invalid credentials"}, status=401)
    
    user = users[0]
    stored_password = user.get("password", "")
    
    # Check hashed password with bcrypt
    if stored_password.startswith("$2b$"):
        if not bcrypt.checkpw(
            password.encode('utf-8'), 
            stored_password.encode('utf-8')
        ):
            return Response({"error": "Invalid credentials"}, status=401)
    else:
        # Legacy plain text - migrate on login
        if stored_password != password:
            return Response({"error": "Invalid credentials"}, status=401)
        # Hash and update password
        hashed = bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        table.update_item(
            Key={"userId": user.get("userId")},
            UpdateExpression="SET password = :pwd",
            ExpressionAttributeValues={":pwd": hashed}
        )
    
    # Return user data (remove password)
    user_data = {
        "id": user.get("userId"),
        "email": user.get("email"),
        "firstName": user.get("firstName", ""),
        "lastName": user.get("lastName", ""),
        "preferences": user.get("preferences", {
            "cuisines": [],
            "dietaryRestrictions": [],
            "priceRange": "$$",
            "maxDistance": 10
        })
    }
    
    return Response({"user": user_data}, status=200)
```

**POST /api/auth/signup**

*Purpose:* Register new user with bcrypt password hashing.

*Request Body:*

```
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

*Implementation Highlights:*

```
@api_view(["POST"])
def signup(request):
    email = request.data.get("email")
    password = request.data.get("password")
    first_name = request.data.get("firstName", "")
    last_name = request.data.get("lastName", "")
    
    # Check if user already exists
    table = dynamodb.Table(TABLE_USERS)
    response = table.scan(
        FilterExpression="email = :email",
        ExpressionAttributeValues={":email": email}
    )
    
    if response.get("Items"):
        return Response({"error": "User already exists"}, status=400)
    
    # Create new user with UUID
    user_id = f"user_{uuid.uuid4().hex[:8]}"
    
    new_user = {
        "userId": user_id,
        "email": email,
        "password": bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8'),
        "firstName": first_name,
        "lastName": last_name,
        "preferences": {
            "cuisines": [],
            "dietaryRestrictions": [],
            "priceRange": "$$",
            "maxDistance": 10,
            "favoriteRestaurants": []
        },
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat()
    }
    
    table.put_item(Item=new_user)
    
    # Return user data (remove password)
    user_data = {k: v for k, v in new_user.items() if k != "password"}
    user_data["id"] = user_data.pop("userId")
    
    return Response({"user": user_data}, status=201)
```

**PATCH /api/auth/preferences**

*Purpose:* Update user preferences and profile information with dynamic UpdateExpression.

*Request Body:*

```
{
  "userId": "user_001",
  "preferences": {
    "cuisines": ["italian", "japanese"],
    "priceRange": "$$$",
    "dietaryRestrictions": ["vegetarian"]
  },
  "firstName": "John",  // optional
  "lastName": "Doe",    // optional
  "email": "new@email.com",  // optional
  "bio": "Food lover"   // optional
}
```

*Implementation Highlights:*

```
@api_view(["PATCH"])
def update_preferences(request):
    user_id = request.data.get("userId")
    preferences = request.data.get("preferences", {})
    
    # Validate email format if provided
    if email := request.data.get("email"):
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return Response({"error": "Invalid email format"}, status=400)
    
    # Convert floats to Decimal for DynamoDB
    preferences = convert_floats_to_decimal(preferences)
    
    # Build update expression dynamically
    update_expr = "SET updatedAt = :updated"
    expr_values = {":updated": datetime.now().isoformat()}
    
    if preferences:
        update_expr += ", preferences = :prefs"
        expr_values[":prefs"] = preferences
    
    if first_name := request.data.get("firstName"):
        update_expr += ", firstName = :firstName"
        expr_values[":firstName"] = first_name
    
    # ... additional fields ...
    
    response = table.update_item(
        Key={"userId": user_id},
        UpdateExpression=update_expr,
        ExpressionAttributeValues=expr_values,
        ReturnValues="ALL_NEW"
    )
    
    return Response({"user": response.get("Attributes")}, status=200)
```

**POST /api/auth/change-password**

*Purpose:* Securely change user password with current password verification.

*Implementation:*

```
@api_view(["POST"])
def change_password(request):
    user_id = request.data.get("userId")
    current_password = request.data.get("currentPassword")
    new_password = request.data.get("newPassword")
    
    if len(new_password) < 8:
        return Response({
            "error": "New password must be at least 8 characters"
        }, status=400)
    
    # Get user and verify current password
    table = dynamodb.Table(TABLE_USERS)
    user = table.get_item(Key={"userId": user_id}).get("Item")
    
    stored_password = user.get("password", "")
    if not bcrypt.checkpw(
        current_password.encode('utf-8'), 
        stored_password.encode('utf-8')
    ):
        return Response({
            "error": "Current password is incorrect"
        }, status=401)
    
    # Hash and update to new password
    hashed_password = bcrypt.hashpw(
        new_password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')
    
    table.update_item(
        Key={"userId": user_id},
        UpdateExpression="SET password = :pwd, updatedAt = :updated",
        ExpressionAttributeValues={
            ":pwd": hashed_password,
            ":updated": datetime.now().isoformat()
        }
    )
    
    return Response({"message": "Password changed successfully"}, status=200)
```

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

```
@api_view(["POST"])
def check_availability(request):
    restaurant_id = request.data.get("restaurantId")
    date = request.data.get("date")
    party_size = request.data.get("partySize", 2)
    
    # Generate available time slots (18:00 - 22:00)
    available_slots = []
    for hour in range(18, 22):
        for minute in [0, 30]:
            time_str = f"{hour:02d}:{minute:02d}"
            available_slots.append({
                "time": time_str,
                "available": True,
                "tablesAvailable": random.randint(1, 5)
            })
    
    return Response({
        "restaurantId": restaurant_id,
        "date": date,
        "availableSlots": available_slots
    }, status=200)
```

**POST /api/reservations/hold**

*Purpose:* Create a 10-minute reservation hold before payment.

```
@api_view(["POST"])
def create_hold(request):
    user_id = request.data.get("userId")
    restaurant_id = request.data.get("restaurantId")
    date = request.data.get("date")
    time = request.data.get("time")
    party_size = request.data.get("partySize", 2)
    
    # Generate unique hold ID
    hold_id = f"hold_{uuid.uuid4().hex[:8]}"
    
    # Set expiration to 10 minutes from now
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    
    hold = {
        "holdId": hold_id,
        "userId": user_id,
        "restaurantId": restaurant_id,
        "date": date,
        "time": time,
        "partySize": party_size,
        "expiresAt": expires_at,
        "status": "active",
        "createdAt": datetime.utcnow().isoformat()
    }
    
    # Store in DynamoDB
    table = dynamodb.Table(TABLE_HOLDS)
    table.put_item(Item=hold)
    
    return Response({
        "success": True,
        "hold": hold
    }, status=201)
```

**GET /api/reservations/hold/active**

*Purpose:* Retrieve user’s active (non-expired) hold.

```
@api_view(["GET"])
def get_active_hold(request):
    user_id = request.GET.get("userId")
    
    table = dynamodb.Table(TABLE_HOLDS)
    response = table.scan(
        FilterExpression="userId = :uid AND #st = :status",
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":uid": user_id,
            ":status": "active"
        }
    )
    
    holds = response.get("Items", [])
    
    # Filter out expired holds
    now = datetime.utcnow()
    active_holds = []
    for hold in holds:
        expires_at_str = hold.get("expiresAt", "")
        expires_at = datetime.fromisoformat(expires_at_str)
        if expires_at > now:
            active_holds.append(hold)
    
    if active_holds:
        # Return most recent
        active_holds.sort(key=lambda x: x.get("createdAt"), reverse=True)
        return Response({"hold": active_holds[0]}, status=200)
    
    return Response({"hold": None}, status=200)
```

**POST /api/reservations/confirm**

*Purpose:* Convert hold to confirmed reservation with payment.

```
@api_view(["POST"])
def confirm_reservation(request):
    hold_id = request.data.get("holdId")
    user_id = request.data.get("userId")
    payment_method = request.data.get("paymentMethod")
    special_requests = request.data.get("specialRequests", "")
    
    # Fetch the hold
    table = dynamodb.Table(TABLE_HOLDS)
    hold = table.get_item(Key={"holdId": hold_id}).get("Item", {})
    
    # Generate reservation ID and confirmation code
    reservation_id = f"res_{uuid.uuid4().hex[:8]}"
    confirmation_code = f"{random.randint(100, 999)}" \
                       f"{chr(random.randint(65, 90))}" \
                       f"{chr(random.randint(65, 90))}" \
                       f"{chr(random.randint(65, 90))}"
    
    reservation = {
        "reservationId": reservation_id,
        "userId": user_id,
        "holdId": hold_id,
        "restaurantId": hold.get("restaurantId"),
        "date": hold.get("date"),
        "time": hold.get("time"),
        "partySize": hold.get("partySize"),
        "status": "confirmed",
        "confirmationCode": confirmation_code,
        "depositAmount": 100,  # Fixed deposit
        "paymentMethod": payment_method,
        "specialRequests": special_requests,
        "createdAt": datetime.utcnow().isoformat()
    }
    
    # Save to Reservations table
    reservations_table = dynamodb.Table(TABLE_RESERVATIONS)
    reservations_table.put_item(Item=reservation)
    
    return Response({
        "success": True,
        "reservation": reservation
    }, status=201)
```

**GET /api/reservations/user/userId**

*Purpose:* Get user’s reservation history with filtering.

*Query Parameters:*

- `filter` - “upcoming”, “past”, or “all”

```
@api_view(["GET"])
def get_user_reservations(request, user_id):
    filter_type = request.GET.get('filter', 'upcoming')
    
    table = dynamodb.Table(TABLE_RESERVATIONS)
    response = table.scan(
        FilterExpression='userId = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    reservations = response.get("Items", [])
    today = date.today().isoformat()
    
    # Apply date filter
    if filter_type == 'upcoming':
        reservations = [r for r in reservations if r.get("date") >= today]
    elif filter_type == 'past':
        reservations = [r for r in reservations if r.get("date") < today]
    
    # Sort by date
    reservations.sort(
        key=lambda x: x.get("date", ""), 
        reverse=(filter_type == 'past')
    )
    
    return Response({
        "reservations": reservations,
        "filter": filter_type
    }, status=200)
```

### Match Score Algorithm

The match score algorithm calculates a compatibility score (0-100) between a restaurant and user preferences.

**Scoring Breakdown:**

- **Cuisine Match (40 points):** 40 if cuisine matches preferences, 10 for new cuisine, 20 if no preference set

- **Price Range Match (30 points):** 30 for exact match, 15 if within 1 price level

- **Dietary Options (20 points):** 20 if dietary needs are met, 5 if no restrictions listed

- **Base Popularity (10 points):** Rating $`\times`$ 2, capped at 10

```
def calculate_match_score(restaurant, preferred_cuisines, 
                          preferred_price, dietary_restrictions):
    score = 0
    reasons = []
    
    # 1. Cuisine matching (40 points)
    restaurant_cuisines = restaurant.get("cuisine", [])
    if isinstance(restaurant_cuisines, str):
        restaurant_cuisines = [restaurant_cuisines]
    
    if preferred_cuisines:
        cuisine_matches = [c for c in restaurant_cuisines 
                          if c in preferred_cuisines]
        if cuisine_matches:
            score += 40
            reasons.append(f"Loves {cuisine_matches[0]}")
        else:
            score += 10  # Points for trying new cuisines
    else:
        score += 20  # No preference = neutral
    
    # 2. Price range matching (30 points)
    restaurant_price = restaurant.get("priceRange", 2)
    if isinstance(restaurant_price, str):
        restaurant_price = len(restaurant_price)  # $$ -> 2
    
    if restaurant_price in preferred_price:
        score += 30
        price_labels = {
            1: "Budget-friendly", 
            2: "Moderate", 
            3: "Upscale", 
            4: "Fine dining"
        }
        reasons.append(price_labels.get(restaurant_price))
    else:
        if any(abs(restaurant_price - p) == 1 for p in preferred_price):
            score += 15  # Partial points if close
    
    # 3. Dietary options (20 points)
    restaurant_dietary = restaurant.get("dietaryOptions", [])
    if dietary_restrictions:
        matches = [d for d in dietary_restrictions 
                   if d in restaurant_dietary]
        if matches:
            score += 20
            reasons.append(f"Has {matches[0]} options")
        elif not restaurant_dietary:
            score += 5
    else:
        score += 10
    
    # 4. Base popularity from rating (10 points)
    rating = float(restaurant.get("rating", 0))
    score += min(10, int(rating * 2))
    
    if rating >= 4.5:
        reasons.append(f"Highly rated ({rating} stars)")
    
    return {
        "score": min(100, score),  # Cap at 100
        "reasons": reasons[:3]      # Top 3 reasons
    }
```

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

```
dynamo:
  image: amazon/dynamodb-local
  container_name: dynamo
  command: "-jar DynamoDBLocal.jar -sharedDb -dbPath /data2"
  ports:
    - "8000:8000"
  volumes:
    - ./local/dynamo:/data2
  healthcheck:
    test: ["CMD-SHELL", "curl -s -o /dev/null -w '%{http_code}' 
           http://localhost:8000 | grep -q 400 || exit 1"]
    interval: 5s
    timeout: 3s
    retries: 10
    start_period: 5s
  networks:
    - localstack-net
```

### LocalStack S3 Service

```
localstack:
  image: localstack/localstack:3.2.0
  container_name: localstack
  ports:
    - "4566:4566"
    - "4571:4571"
  environment:
    - SERVICES=s3
    - DEBUG=1
    - PERSISTENCE=1
  volumes:
    - ./local/localstack:/var/lib/localstack
    - /var/run/docker.sock:/var/run/docker.sock
  healthcheck:
    test: ["CMD", "curl", "-f", 
           "http://localhost:4566/_localstack/health"]
```

### Backend Application Service

```
backend:
  build:
    context: ./FoodTok_Backend            
    dockerfile: Dockerfile.backend
  container_name: backend
  environment:
    - IS_LOCAL=true
    - AWS_ACCESS_KEY_ID=test
    - AWS_SECRET_ACCESS_KEY=test
    - AWS_REGION=us-east-1
    - DDB_USERS_TABLE=Users
    - DDB_RESTAURANTS_TABLE=Restaurants
    - DDB_FAVORITES_TABLE=Favorites
    - DDB_RESERVATIONS_TABLE=Reservations
    - DDB_HOLDS_TABLE=Holds
    - S3_IMAGES_BUCKET=foodtok-local-images
    - LOCAL_DYNAMO_ENDPOINT=http://dynamo:8000
    - LOCAL_S3_ENDPOINT=http://localstack:4566
  ports:
    - "8080:8080"       
  command: >
    sh -c "python manage.py runserver 0.0.0.0:8080"
  depends_on:
    - dynamo
    - localstack
    - local_config
```

## Dockerfile

**File:** `FoodTok_Backend/Dockerfile.backend` (16 lines)

```
FROM python:3.12-slim

# Set working directory inside the container
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Django project
COPY . .

EXPOSE 8080

CMD ["python", "manage.py", "runserver", "0.0.0.0:8080"]
```

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

**Quick Start (Recommended):**

``` bash
# Build and start everything
make build-all
make up-all

# Check that all services are running
make ps-all

# Access the application
# Backend API: http://localhost:8080/api/helloECS
# Frontend: http://localhost:3000
# DynamoDB Admin: http://localhost:8001

# Run tests for both services
make backend-test
make frontend-test

# View logs for all services
docker compose -p foodtok-backend -f docker-compose.backend.yml logs -f &
docker compose -p foodtok-frontend -f docker-compose.frontend.yml logs -f &

# Stop everything when done
make down-all
```

**Advanced: Individual Service Control:**

``` bash
# Start only backend for API development
make backend-build
make backend-up
make backend-test

# Or start only frontend for UI development
make frontend-build
make frontend-up
make frontend-test

# Stop individual services
make backend-down
make frontend-down
```

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

```
def test_reservations_full_flow():
    _require_backend()
    user = _signup_test_user("res")
    restaurant_id = _ensure_restaurant()
    future_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    try:
        # 1. Check availability
        availability_resp = requests.post(
            f"{BASE_URL}/reservations/availability",
            json={"restaurantId": restaurant_id, "date": future_date}
        )
        slots = availability_resp.json()["availableSlots"]
        time_choice = slots[0]["time"]

        # 2. Create hold
        hold_resp = requests.post(
            f"{BASE_URL}/reservations/hold",
            json={"userId": user["id"], "restaurantId": restaurant_id,
                  "date": future_date, "time": time_choice}
        )
        hold_id = hold_resp.json()["hold"]["holdId"]

        # 3. Confirm reservation
        confirm_resp = requests.post(
            f"{BASE_URL}/reservations/confirm",
            json={"holdId": hold_id, "userId": user["id"]}
        )
        reservation_id = confirm_resp.json()["reservation"]["reservationId"]

        # 4. Modify reservation
        requests.patch(
            f"{BASE_URL}/reservations/{reservation_id}/modify",
            json={"userId": user["id"], "time": "20:00"}
        )

        # 5. Cancel reservation
        requests.delete(
            f"{BASE_URL}/reservations/{reservation_id}/cancel",
            json={"userId": user["id"]}
        )
    finally:
        _cleanup_test_user(user["id"])
```

### Test Utilities

```
def _cleanup_test_user(user_id: str) -> None:
    dynamodb = boto3.resource("dynamodb", endpoint_url=DYNAMO_ENDPOINT)
    dynamodb.Table(DDB_USERS_TABLE).delete_item(Key={"userId": user_id})

def _delete_reservation(reservation_id: str) -> None:
    dynamodb = boto3.resource("dynamodb", endpoint_url=DYNAMO_ENDPOINT)
    dynamodb.Table(DDB_RESERVATIONS_TABLE).delete_item(
        Key={"reservationId": reservation_id}
    )

def _delete_hold(hold_id: str) -> None:
    dynamodb = boto3.resource("dynamodb", endpoint_url=DYNAMO_ENDPOINT)
    dynamodb.Table(DDB_HOLDS_TABLE).delete_item(Key={"holdId": hold_id})
```

## Load Testing with Locust

**Location:** `load_tests/locustfile.py` (62 lines)

Load testing simulates realistic user traffic patterns using Locust.

### User Behavior Simulation

```
from locust import HttpUser, task, between, LoadTestShape

class FrontendUser(HttpUser):
    wait_time = between(0.5, 1)  # seconds between requests

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.restaurant_ids = [str(i) for i in range(1, 51)]

    @task(2)
    def load_home(self):
        self.client.get("/", name="GET /")

    @task(2)
    def load_login(self):
        self.client.get("/login", name="GET /login")

    @task(4)  # Higher weight - most common action
    def load_restaurant_detail(self):
        restaurant_id = random.choice(self.restaurant_ids)
        self.client.get(f"/restaurant/{restaurant_id}")

    @task(1)
    def load_favorites(self):
        self.client.get("/favorites", name="GET /favorites")

    @task(1)
    def load_profile(self):
        self.client.get("/profile", name="GET /profile")
```

### Load Test Ramp-Up Configuration

```
class LoadTestRampUp(LoadTestShape):
    """
    Ramps up from 1 to 200 users over 60 seconds,
    holds for 120 seconds.
    """
    stages = [
        {"duration": 60, "users": 200, "spawn_rate": 3},
        {"duration": 120, "users": 200, "spawn_rate": 1},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
```

**Running Load Tests:**

``` bash
cd load_tests
locust -f locustfile.py --host=http://localhost:3000
# Access web UI at http://localhost:8089
```

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

``` bash
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
  # Check DynamoDB - returns 400 for empty requests when up
  dynamo_code=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:8000 2>/dev/null || echo "000")
  
  # Check LocalStack health endpoint  
  localstack_code=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:4566/_localstack/health 2>/dev/null || echo "000")
  
  if [ "$dynamo_code" = "400" ] && [ "$localstack_code" = "200" ]; then
    echo "DynamoDB and LocalStack are ready!"
    break
  fi
  
  echo "Waiting... (DynamoDB: $dynamo_code, LocalStack: $localstack_code)"
  sleep 3
  elapsed=$((elapsed + 3))
done
```

### Test Execution with Coverage

``` bash
cd FoodTok_Backend && pytest tests/api/ -v \
  --cov=. \
  --cov-report=term \
  --cov-report=xml \
  --cov-report=html \
  --cov-fail-under=75
```

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

```
// index.ts
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api/backend';
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}
```

## Yelp API Integration

**File:** `yelp.ts` (14,213 bytes)

```
export async function getDiscoveryRestaurants(
  userId: string,
  limit: number = 20,
  preferences?: UserPreferences
): Promise<DiscoveryCard[]> {
  const params = new URLSearchParams({
    userId,
    limit: limit.toString(),
    ...(preferences?.cuisines?.length && 
        { cuisines: preferences.cuisines.join(',') }),
    ...(preferences?.priceRange && 
        { price: preferences.priceRange }),
  });
  
  const response = await fetch(`/api/yelp/discovery?${params}`);
  const data = await response.json();
  
  return data.restaurants.map((r: any) => ({
    restaurant: transformYelpRestaurant(r),
    matchScore: calculateClientMatchScore(r, preferences),
    matchReasons: generateMatchReasons(r, preferences)
  }));
}
```

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

```
import * as cdk from 'aws-cdk-lib';
import { S3Construct } from './constructs/s3';
import { DdbConstruct } from './constructs/ddb';
import { BackendECSConstruct } from './constructs/backend-ecs';
import { FrontendECSConstruct } from './constructs/frontend-ecs';

export class MainStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const projectPrefix = 'FoodTok';

    // Storage layer
    const s3 = new S3Construct(this, 'S3Construct', { projectPrefix });
    const ddb = new DdbConstruct(this, 'DdbConstruct', { projectPrefix });
    
    // Backend service
    const backendEcs = new BackendECSConstruct(this, 'BackendECSConstruct', {
      users: ddb.users,
      favorites: ddb.favorites,
      reservations: ddb.reservations,
      holds: ddb.holds,
      imageBucket: s3.imageBucket,
      projectPrefix,     
    });

    // Frontend service (connects to backend)
    const frontendEcs = new FrontendECSConstruct(this, 'FrontendECSConstruct', {
      vpc: backendEcs.vpc,
      backendLoadBalancerDns: backendEcs.loadBalancerDns,
      projectPrefix,
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ECSLoadBalancerDNS', {
      value: backendEcs.loadBalancerDns,
      description: 'Public ALB endpoint for ECS Flask app',
    });

    new cdk.CfnOutput(this, 'FrontendLoadBalancerDNS', {
      value: frontendEcs.loadBalancerDns,
      exportName: `${projectPrefix}-FrontendLoadBalancerDNS`,
      description: 'Public ALB endpoint for Frontend Next.js app',
    });
  }
}
```

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
