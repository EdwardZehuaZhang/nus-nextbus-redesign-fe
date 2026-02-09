/**
 * PRIORITY INITIALIZATION SYSTEM
 * 
 * This system ensures optimal startup performance by prioritizing critical UI elements
 * and API calls in the following sequence:
 * 
 * PRIORITY SEQUENCE:
 * ==================
 * 1. [HIGHEST] Get User Location
 *    - Triggered immediately when app mounts
 *    - Shown: "Getting your location..." loading screen
 *    - Uses: expo-location (native) or Geolocation API (web)
 *    - Stores: Zustand location store (persists across navigation)
 * 
 * 2. Fetch Bus Stops Database
 *    - Starts as soon as location permission is requested
 *    - Shown: "Loading bus stops..." loading screen
 *    - Critical for: Calculating nearest stops, distance calculations
 *    - Caching: 10 minutes (bus stops rarely change)
 * 
 * 3. [CRITICAL] Calculate Nearest Stops (in-memory)
 *    - Uses user location + bus stops database
 *    - Filtered to top 2 nearest stops
 *    - Shows the first UI element: "Nearest Stops" tabs
 * 
 * 4. [URGENT] Prefetch shuttle service data for nearest stops
 *    - Starts immediately after nearest stops calculated
 *    - Runs in background while user is looking at loading screen/tabs
 *    - Ensures bus arrival times are ready when needed
 *    - Polling: 5-30 seconds based on arrival times
 * 
 * 5. Prefetch service descriptions (route colors, metadata)
 *    - Starts early for displaying route colors
 *    - Caching: 10 minutes
 * 
 * 6. [LOWER] Prefetch active buses, checkpoints, announcements
 *    - Secondary data not needed for initial display
 *    - Loads in background after priorities complete
 * 
 * 7. [LOWEST] Other features (search, favorites, etc.)
 *    - Load on-demand when user interacts
 * 
 * COMPONENTS & HOOKS
 * ==================
 * 
 * PriorityLoadingOverlay Component (priority-loading.tsx)
 * - Shows minimal loading screen during phases 1-2
 * - Auto-hides when nearest stops are ready (phase 3)
 * - Only renders when NOT isLocationReady
 * 
 * usePriorityInitialization Hook (use-priority-initialization.ts)
 * - Orchestrates the entire priority sequence
 * - Triggers prefetch queries at right time
 * - Returns state: phase, nearestStops, isReady, isLocationReady
 * 
 * usePriorityNearestStops Hook (priority-loading.tsx)
 * - Quick access to nearest stops from priority system
 * - Returns: { nearestStops, isReady }
 * 
 * Query Configuration (query-config.ts)
 * - Centralized React Query settings for all queries
 * - PRIORITY_QUERY_CONFIG for location, bus stops, shuttle service, etc.
 * - Ensures proper caching, retries, and polling intervals
 * 
 * PERFORMANCE METRICS
 * ===================
 * 
 * Before Optimization:
 * - Loading screen shows: ~3-5 seconds
 * - All queries start in parallel
 * - UI feels blocked/sluggish
 * - User sees generic "Loading..." message
 * 
 * After Optimization (Expected):
 * - Location fetch: ~0.5-1.5 seconds
 * - Bus stops fetch: ~1-2 seconds (cached)
 * - Nearest stops ready: ~2-3 seconds total
 * - Loading screen disappears quickly
 * - User sees specific messages per phase
 * - Background prefetching continues silently
 * 
 * KEY DIFFERENCES FROM PREVIOUS APPROACH
 * ======================================
 * 
 * OLD: All API calls started in parallel
 *  ❌ Network congestion (simultaneous requests)
 *  ❌ Longer perceived loading time
 *  ❌ Generic loading UI
 *  ❌ May not show any UI until all data arrives
 * 
 * NEW: Prioritized sequential with parallel prefetch
 *  ✅ Location first (user immediately engaged)
 *  ✅ Bus stops quickly calculated (relevant to user)
 *  ✅ Specific loading messages per phase
 *  ✅ Nearest stops tab appears quickly
 *  ✅ Background prefetch of shuttle data (invisible)
 *  ✅ Everything else loads silently
 * 
 * USAGE EXAMPLES
 * ==============
 * 
 * 1. In a page/component - use the priority loading overlay:
 *    
 *    import { PriorityLoadingOverlay } from '@/components/priority-loading';
 *    
 *    export default function MyPage() {
 *      return (
 *        <View>
 *          <PriorityLoadingOverlay />
 *          {/* rest of page */}
 *        </View>
 *      );
 *    }
 * 
 * 2. Access nearest stops data:
 *    
 *    import { usePriorityNearestStops } from '@/components/priority-loading';
 *    
 *    function NearestStopsDisplay() {
 *      const { nearestStops, isReady } = usePriorityNearestStops();
 *      
 *      if (!isReady) return <LoadingSpinner />;
 *      return nearestStops.map(stop => <Stop key={stop.id} {...stop} />);
 *    }
 * 
 * 3. Customize loading behavior:
 *    
 *    import { usePriorityInitialization } from '@/lib/hooks/use-priority-initialization';
 *    
 *    function CustomLoader() {
 *      const state = usePriorityInitialization();
 *      
 *      if (state.phase === 'location') {
 *        return <Text>📍 Finding your location...</Text>;
 *      } else if (state.phase === 'bus-stops') {
 *        return <Text>🚌 Loading bus stop database...</Text>;
 *      } else if (state.phase === 'nearest-stops') {
 *        return <Text>✨ Found {state.nearestStops.length} stops near you!</Text>;
 *      }
 *    }
 * 
 * 4. Conditional rendering based on priority state:
 *    
 *    import { useShouldShowPriorityLoading } from '@/components/priority-loading';
 *    
 *    function MyContent() {
 *      const showLoading = useShouldShowPriorityLoading();
 *      
 *      if (showLoading) {
 *        return <PriorityLoadingOverlay />;
 *      }
 *      
 *      // Show actual content
 *      return <YourActualContent />;
 *    }
 * 
 * DEBUGGING
 * =========
 * 
 * To trace the priority initialization:
 * 
 * 1. Watch the console logs in priority-loading.tsx
 * 2. Check React Query DevTools for query order and timing
 * 3. Use React DevTools to inspect:
 *    - usePriorityInitialization state
 *    - phase transitions
 *    - nearestStops updates
 * 
 * FUTURE ENHANCEMENTS
 * ===================
 * 
 * - Add metrics collection (timing, success rates)
 * - Progressive images for nearest stops
 * - Skeleton loading states
 * - Connection speed detection for adaptive loading
 * - Analytics integration for performance monitoring
 * - A/B testing different priority sequences
 * - Offline mode with cached data
 * 
 * FILES INVOLVED
 * ==============
 * 
 * Core:
 * - src/lib/hooks/use-priority-initialization.ts  - Main orchestrator
 * - src/components/priority-loading.tsx           - UI components
 * - src/api/common/query-config.ts               - Query settings
 * 
 * Updated:
 * - src/api/bus/use-bus-api.ts                   - Uses priority config
 * - src/app/(app)/transit.tsx                    - Uses priority overlay
 * - src/lib/store/location-store.ts              - Location persistence
 * 
 * RELATED QUERIES
 * ===============
 * 
 * Priority queries (usePriorityInitialization):
 * - location
 * - busStops
 * - serviceDescriptions (prefetch)
 * - shuttleService (prefetch per stop)
 * 
 * Secondary queries (background):
 * - activeBuses
 * - checkpoints
 * - announcements
 * - tickerTapes
 * - pickupPoints
 * 
 */

export const PRIORITY_SYSTEM_DOCS = '';
