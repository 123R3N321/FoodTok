# 🍔 FoodTok - Restaurant Discovery App

**A TikTok-inspired mobile restaurant discovery application that revolutionizes how people find their next favorite meal through engaging swipe mechanics and AI-powered recommendations.**

FoodTok eliminates decision fatigue by presenting users with a personalized queue of restaurants, allowing them to swipe right to like, swipe left to pass, and tap to explore - all while building a profile of their dining preferences for increasingly better recommendations.

## 🚀 **Quick Start (TL;DR)**

**Want to run this immediately? Here's the express version:**

```bash
# 1. Clone and enter the project
https://github.com/pmxlr8/FoodTok_Frontend.git
cd FoodTok

# 2. Install dependencies  
npm install

# 3. Run the development server
npm run dev

# 4. Open on mobile - replace YOUR_IP with your actual IP address
# On your phone, visit: http://YOUR_IP:3000
```

**Demo Login:** `demo@example.com` / `password123`

**That's it!** 🎉 The app will work immediately with realistic mock data. Read below for detailed setup, features, and development guidance.

> **📝 Note:** This is a development version optimized for learning and exploration. The development server (`npm run dev`) provides the best experience with hot-reloading and all features working perfectly.

## 📱 **Built for Mobile-First Experience**

This is a **smartphone-centric application** designed for touch interactions, gesture-based navigation, and mobile-optimized UI patterns. While it runs in browsers, the experience is crafted for mobile devices.

## 🎯 **Project Status & What's Actually Built**

### ✅ **COMPLETED & FULLY FUNCTIONAL**
- **Authentication System**: Login, signup, session management with Zustand persistence
- **Restaurant Discovery Queue**: TikTok-style swipeable cards with Framer Motion gestures
- **Restaurant Details**: Complete restaurant pages with menus, reviews, and information
- **Shopping Cart**: Add items, manage quantities, price calculations, multi-restaurant handling  
- **Checkout Process**: Full ordering flow with delivery details and mock payment
- **User Profile System**: Favorites, order history, and account management
- **Settings Page**: User preferences, profile editing, app settings, and logout
- **Responsive Design**: Mobile-optimized with bottom navigation and touch-friendly interactions
- **State Management**: Comprehensive Zustand stores with persistence
- **Mock API Layer**: Realistic backend simulation with network latency
- **TypeScript Integration**: Full type safety across the application

### 🔧 **MOCK/SIMULATED FEATURES**
- **Backend API**: Currently using mock data (see `src/lib/api.ts`)
- **Payment Processing**: Simulated payment flow (no real transactions)
- **Real-time Updates**: Mock notifications and order tracking
- **Image Upload**: Static image URLs (not actual uploads)
- **Email Notifications**: Console logs instead of real emails

**Note:** The backend Django API exists but is not yet integrated. See `BACKEND_INTEGRATION_GUIDE.md` for connection instructions.

### 🔗 **Backend Repository**
The Django backend is maintained separately:
- **GitHub**: [123R3N321/FoodTok](https://github.com/123R3N321/FoodTok)
- **Tech Stack**: Django + Docker + PostgreSQL
- **Status**: Infrastructure ready, API endpoints in development
- **Integration**: See `BACKEND_INTEGRATION_GUIDE.md` and `API_CONTRACT.md`
- **Payment Processing**: Simulated checkout (no real payments)
- **Restaurant Data**: Mock restaurants with Unsplash images
- **User Reviews**: Sample review data
- **Location Services**: Hardcoded NYC locations
- **Order Delivery**: Mock order tracking
- **Push Notifications**: Placeholder functionality

### 🚀 **READY FOR EXTENSION** 
The codebase is architected to easily integrate:
- Real restaurant APIs (Yelp, Google Places)
- Payment processors (Stripe, PayPal)  
- Authentication providers (Firebase, Auth0)
- Push notification services
- Real-time order tracking
- Location-based services

## ✨ Features

### 🎯 Core Functionality
- **Swipeable Discovery Queue**: TikTok-style infinite scroll with restaurant cards
- **Smart Recommendations**: AI-powered suggestions based on user preferences
- **Comprehensive Restaurant Profiles**: Detailed menus, reviews, and information
- **Seamless Ordering**: Full cart and checkout experience
- **User Personalization**: Customizable cuisine and dietary preferences

### 🎨 User Experience
- **Fluid Animations**: Powered by Framer Motion for smooth interactions
- **Responsive Design**: Mobile-first approach with desktop support  
- **Accessible UI**: Built with Radix UI primitives for screen readers
- **Dark/Light Themes**: System-aware theme switching
- **Real-time Updates**: Optimistic UI updates for instant feedback

### 🔐 Authentication & Personalization
- **User Registration & Login**: Secure authentication flow
- **Onboarding Experience**: Captures preferences for personalized recommendations
- **Profile Management**: Update preferences, view history, manage favorites
- **Persistent Sessions**: Zustand-powered state management with persistence

### 🛒 E-commerce Features
- **Shopping Cart**: Add items from multiple restaurants (with smart conflict resolution)
- **Mock Payment**: Complete checkout flow with payment simulation
- **Order Tracking**: Order history and status updates
- **Favorites System**: Save and manage preferred restaurants

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with CSS Variables design system
- **Animations**: Framer Motion for fluid interactions
- **UI Components**: Custom components built on Radix UI primitives
- **Icons**: Lucide React for consistent iconography

### State Management
- **Global State**: Zustand stores with persistence middleware
- **Authentication**: Secure user session management
- **Cart Management**: Optimistic updates with local persistence
- **Discovery Queue**: Swipe history and recommendation state

### Data Layer
- **Mock API**: Comprehensive simulation layer with realistic latency
- **Type Safety**: Complete TypeScript interfaces for all data models
- **Error Handling**: Graceful error states with user-friendly messages
- **Caching**: Smart data fetching with built-in loading states

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/                # User login
│   │   ├── signup/               # User registration  
│   │   ├── onboarding/           # Preference collection
│   │   └── layout.tsx            # Auth layout wrapper
│   ├── (main)/                   # Main application routes
│   │   ├── page.tsx              # Discovery queue
│   │   ├── restaurant/[id]/      # Restaurant details
│   │   ├── cart/                 # Shopping cart
│   │   ├── checkout/             # Order placement
│   │   ├── favorites/            # Liked restaurants
│   │   ├── profile/              # User profile
│   │   └── layout.tsx            # Main layout with navigation
│   ├── globals.css               # Global styles and CSS variables
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root page (routing logic)
├── components/
│   ├── features/                 # Feature-specific components
│   │   └── RestaurantCard.tsx    # Swipeable restaurant card
│   └── ui/                       # Reusable UI components
│       ├── button.tsx            # Button variations
│       ├── input.tsx             # Form inputs
│       ├── card.tsx              # Card containers
│       └── dialog.tsx            # Modal dialogs
├── lib/
│   ├── stores/                   # Zustand store definitions
│   │   ├── auth.ts               # Authentication state
│   │   ├── cart.ts               # Shopping cart state
│   │   ├── discovery.ts          # Discovery queue state
│   │   ├── app.ts                # General app state
│   │   └── index.ts              # Store exports
│   ├── api.ts                    # Mock API implementation
│   └── utils.ts                  # Utility functions
├── types/
│   └── index.ts                  # TypeScript type definitions
└── tailwind.config.ts            # Tailwind configuration
```

## 🚀 **Local Setup Instructions**

### **Prerequisites**

#### **macOS Setup**
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 18+ and npm
brew install node

# Verify installation
node --version  # Should be 18.0.0 or higher
npm --version
```

#### **Linux (Ubuntu/Debian) Setup**
```bash
# Update package index
sudo apt update

# Install Node.js 18+ via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.0.0 or higher
npm --version
```

#### **Linux (CentOS/RHEL/Fedora) Setup**
```bash
# Install Node.js 18+ via NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # or dnf install nodejs

# Verify installation
node --version
npm --version
```

### **Installation & Running**

1. **Clone this repository**
   ```bash
   https://github.com/pmxlr8/FoodTok_Frontend.git
   cd FoodTok
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - **Desktop**: [http://localhost:3000](http://localhost:3000) (or 3001 if 3000 is busy)
   - **Mobile**: `http://[YOUR_IP]:3000` (replace with your computer's IP address)

### **📱 Mobile Testing Setup**

#### **Find Your Computer's IP Address**

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Linux:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# or
hostname -I
```

#### **Access from Mobile Device**
1. Ensure your phone and computer are on the same WiFi network
2. Open your phone's browser
3. Navigate to `http://[YOUR_IP]:3000` (e.g., `http://192.168.1.100:3000`)
4. **Add to Home Screen** for full app experience:
   - **iOS**: Safari → Share button → "Add to Home Screen"
   - **Android**: Chrome → Menu → "Add to Home Screen"

### **🔐 Demo Credentials**
- **Email**: `john@example.com`
- **Password**: `password123`

### **🛠️ Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## 🎮 Usage Guide

### First Time Setup
1. **Create Account**: Register with email and password
2. **Personalize**: Complete onboarding to set food preferences
3. **Discover**: Start swiping through restaurant recommendations

### Discovery Queue
- **Swipe Right**: Like a restaurant (adds to favorites)
- **Swipe Left**: Pass on a restaurant 
- **Tap Card**: View detailed restaurant information
- **Undo**: Use the undo button to reverse your last swipe

### Ordering Flow
1. **Browse Menu**: Tap a restaurant card to view details
2. **Add Items**: Select items and add to cart
3. **Review Cart**: Modify quantities or remove items
4. **Checkout**: Enter delivery details and payment info
5. **Confirm**: Complete order with mock payment

### Profile Management
- **View Statistics**: See your activity and preferences
- **Update Preferences**: Modify cuisine and dietary settings
- **Manage Favorites**: View and organize liked restaurants
- **Order History**: Track previous orders and reorder

## 🎨 Design System

### Color Palette
- **Primary**: Blue (`#3B82F6`) - Main actions and branding
- **Accent**: Orange (`#F59E0B`) - Secondary actions and highlights  
- **Success**: Green (`#10B981`) - Positive actions and confirmations
- **Destructive**: Red (`#EF4444`) - Negative actions and warnings
- **Muted**: Gray scale for secondary content

### Typography
- **Headings**: Inter font family, various weights
- **Body Text**: Inter regular for optimal readability
- **UI Text**: Inter medium for buttons and labels

### Component Principles
- **Accessibility First**: WCAG 2.1 compliance with proper ARIA labels
- **Mobile Responsive**: Touch-friendly targets and responsive layouts
- **Consistent Spacing**: 4px base unit system
- **Semantic Colors**: Meaning-driven color usage

## 🔧 Mock API Documentation

The application includes a comprehensive mock API that simulates real backend interactions:

### Authentication Endpoints
- `loginUser(email, password)` - User authentication
- `signupUser(userData)` - User registration
- `updateUserPreferences(userId, preferences)` - Preference updates

### Discovery Endpoints  
- `getDiscoveryQueue(userId, limit)` - Personalized restaurant recommendations
- `getRestaurantById(id)` - Detailed restaurant information
- `getRestaurants(filters)` - Restaurant search and filtering

### Order Endpoints
- `createOrder(orderData)` - Place new orders
- `getOrderById(orderId)` - Order details
- `getUserOrders(userId)` - Order history

### User Endpoints
- `getUserProfile(userId)` - User profile data
- `addFavoriteRestaurant(userId, restaurantId)` - Manage favorites
- `removeFavoriteRestaurant(userId, restaurantId)` - Remove favorites

### Mock Data Features
- **Realistic Latency**: Simulated network delays (200-800ms)
- **Error Simulation**: Handles various error conditions
- **Rich Dataset**: Comprehensive restaurant, menu, and user data
- **Type Safety**: Full TypeScript integration

## 🔄 State Management

### Store Architecture

**Authentication Store** (`auth.ts`)
- User session management
- Login/logout functionality  
- Preference updates
- Persistent authentication state

**Cart Store** (`cart.ts`)
- Shopping cart items
- Price calculations
- Restaurant conflict resolution
- Persistent cart state

**Discovery Store** (`discovery.ts`)
- Restaurant queue management
- Swipe history tracking
- Recommendation state
- Undo functionality

**App Store** (`app.ts`)
- Global UI state
- Theme management
- Notification system
- Loading states

### Data Flow
1. **User Actions**: UI components dispatch actions to stores
2. **Store Updates**: Zustand manages state transitions
3. **API Calls**: Stores handle async operations
4. **UI Updates**: Components react to store changes
5. **Persistence**: Critical state saved to localStorage

## 🎯 Key Features Deep Dive

### 🍽️ Restaurant Discovery Algorithm
The mock recommendation system considers:
- **User Preferences**: Cuisine types and dietary restrictions
- **Location**: Distance from user's location  
- **Price Range**: Budget compatibility
- **Rating**: Restaurant quality scores
- **Behavioral Data**: Previous swipe patterns

### 👆 Swipe Mechanics
Built with Framer Motion for natural TikTok-style feel:
- **Gesture Recognition**: Touch and mouse drag support
- **Physics**: Realistic momentum and spring animations
- **Visual Feedback**: Real-time swipe direction indicators
- **Haptic Feedback**: Mobile vibration on swipe actions
- **Stack Management**: Smooth card transitions and memory optimization

### 🛒 Cart Conflict Resolution
Smart handling of multi-restaurant orders:
- **Single Restaurant**: Maintains order consistency
- **Restaurant Switch**: Clear cart confirmation dialog
- **Price Updates**: Real-time total calculations with tax
- **Item Management**: Easy quantity adjustments and removal
- **Persistence**: Cart survives app restarts via localStorage

### 🔐 Authentication System
Complete user management with mock backend:
- **Registration**: Email validation and secure signup flow
- **Login**: Persistent sessions with automatic token refresh
- **Profile Management**: Editable user information and preferences
- **Security**: Protected routes with automatic redirects
- **Logout**: Clean session termination and state reset

### 📱 Mobile-First Design
Optimized for smartphone usage:
- **Bottom Navigation**: Thumb-friendly interface
- **Touch Targets**: Minimum 44px tap areas
- **Responsive Layout**: Scales from mobile to desktop
- **Performance**: Optimized images and lazy loading
- **Gestures**: Native mobile interaction patterns

### 🎨 Design System
Consistent UI/UX throughout:
- **Color Palette**: Brand-consistent theme with dark mode
- **Typography**: Readable font hierarchy
- **Components**: Reusable UI elements with variants
- **Icons**: Lucide React icon library
- **Spacing**: Tailwind's systematic spacing scale
- **Animations**: Subtle micro-interactions for better UX

### 💾 State Management Architecture
Zustand-powered global state:
- **Auth Store**: User session and authentication state
- **Cart Store**: Shopping cart with persistence
- **Discovery Store**: Restaurant queue and preferences
- **App Store**: UI state and user interactions
- **Middleware**: Automatic localStorage synchronization

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)  
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended configuration
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages

### Component Guidelines
- **React Patterns**: Use hooks and functional components exclusively
- **TypeScript**: Implement proper interfaces and strict typing
- **Accessibility**: Follow WCAG guidelines and ARIA best practices
- **Documentation**: Include JSDoc comments for complex functions
- **Performance**: Implement React.memo for expensive re-renders
- **Testing**: Write unit tests for critical business logic

### Architecture Patterns
- **Separation of Concerns**: Clear distinction between UI, business logic, and data
- **Component Composition**: Favor composition over inheritance
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Error Boundaries**: Implement error handling for robust UX
- **Code Splitting**: Use dynamic imports for performance optimization

### Extending the Application
Want to add new features? Here's how:

#### Adding a New Page
1. Create page component in `src/app/(main)/[page-name]/`
2. Add route to bottom navigation in `src/components/layout/BottomNav.tsx`
3. Update TypeScript types in `src/types/`
4. Add any new state to appropriate Zustand store

#### Adding New Restaurant Data
1. Update `src/lib/mock-data.ts` with new restaurant objects
2. Follow existing data structure for consistency
3. Add new cuisine types to `src/types/restaurant.ts`
4. Update filters in discovery algorithm

#### Integrating Real API
1. Replace mock functions in `src/lib/api/` with real HTTP calls
2. Update authentication to use real JWT tokens
3. Replace mock data with API endpoints
4. Add proper error handling and loading states

### Performance Optimization Tips
- **Image Optimization**: Use Next.js Image component with proper sizing
- **Bundle Analysis**: Run `npm run analyze` to check bundle size
- **Lighthouse Audits**: Regularly test performance scores
- **Memory Management**: Monitor for memory leaks in development
- **Network Requests**: Implement proper caching strategies

## � Troubleshooting

### Common Issues

#### Build Errors
- **"Cannot resolve module"**: Run `npm install` to ensure all dependencies are installed
- **TypeScript errors**: Check that you're using Node.js 18+ and TypeScript 5+
- **Out of memory**: Increase Node.js memory with `export NODE_OPTIONS="--max-old-space-size=4096"`

#### Development Server Issues  
- **Port already in use**: Change port with `npm run dev -- -p 3001`
- **Hot reload not working**: Clear Next.js cache with `rm -rf .next`
- **Styling issues**: Restart dev server after Tailwind config changes

#### Mobile Testing Problems
- **App not accessible on mobile**: Ensure your computer and phone are on same WiFi network
- **Gestures not working**: Check that you're testing on actual mobile device, not desktop browser
- **Performance issues**: Use production build (`npm run build && npm start`) for testing

#### State/Data Issues
- **Login not persisting**: Check browser's localStorage isn't disabled
- **Cart items disappearing**: Verify localStorage has sufficient space
- **Recommendations not updating**: Clear localStorage and restart app

### Getting Help
1. **Check the logs**: Look at browser console for error messages
2. **Clear cache**: Try `rm -rf .next node_modules package-lock.json && npm install`
3. **Version check**: Ensure you're using the correct Node.js version (18+)
4. **Network issues**: Check if you're behind a corporate firewall blocking localhost

### Debug Mode
Enable debug logging by adding to your `.env.local`:
```bash
NEXT_PUBLIC_DEBUG=true
```

This will show additional console logs for:
- State management operations
- API call simulations  
- User interaction tracking
- Performance metrics

## 📦 **Sharing This Project**

To share this project with friends:

### Method 1: Simple Zip
1. **Copy the entire FoodTok folder**
2. **Compress to ZIP** (right-click → compress on macOS)
3. **Share the ZIP file** - they can extract and run `npm install && npm run dev`

### Method 2: Clean Distribution
1. **Run the distribution script**: `./prepare-distribution.sh`
2. **Compress the cleaned folder** to ZIP
3. **Share with friends** - perfectly clean for sharing!

### What Your Friends Get:
- ✅ **Complete working app** with all features
- ✅ **Realistic mock data** for immediate testing
- ✅ **Mobile-optimized experience** 
- ✅ **Comprehensive documentation**
- ✅ **Zero setup complexity** - just npm install and run!

## �📝 License

This project is part of an academic assignment for NYU Software Engineering coursework. All rights reserved.

## 👥 Team

- **Matthew Boubin** (mjb9353) - Product Owner
- **Pranjal Mishra** - Frontend Architect  
- **Jiyuan Ren** (jr5887) - Team Member
- **Yuxuan Wang** (yw5343) - Team Member
- **Aaron Benochea** (ab6503) - Team Member

## 📞 Support

For questions or issues:
1. **Check Documentation**: Review this README thoroughly
2. **Search Issues**: Look through existing GitHub issues
3. **Create Issue**: Submit detailed bug reports or feature requests
4. **Contact Team**: Reach out to team members for urgent matters

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies.**
