# Internal Shuttle Bus Route Finding System

## Overview

This document describes the internal shuttle bus route finding system that has been implemented to compete with Google Maps route finding API within the NUS campus ground.

## Problem Statement

When navigating within NUS campus, Google Maps often suggests routes using external public buses or long walking distances. However, NUS has internal shuttle buses (A1, A2, D1, D2, BTC) that can provide faster and more convenient routes for campus navigation.

**Example Scenario**: 
- From PGP (Prince George's Park) to UTown (University Town)
- Google Maps might suggest: Walk to Japanese Primary School → Take external bus → Walk 12 minutes to UTown
- Better internal route: Walk to Museum bus stop → Take D2 → Direct to UTown

## Strategy

The route finding algorithm prioritizes internal shuttle buses by:

1. **Finding nearby bus stops** - Identifies bus stops within walking distance from origin (max 800m) and destination (max 500m)
2. **Checking route connectivity** - Verifies which shuttle routes connect the origin and destination stops
3. **Real-time bus arrivals** - Fetches actual bus arrival times from the NUS NextBus API
4. **Catchability check** - Determines if the user can reach the bus stop in time (with 2-minute buffer)
5. **Total time calculation** - Sums up walking + waiting + riding + final walking times
6. **Google Maps comparison** - Compares internal routes with Google Maps and recommends the fastest option

## Implementation

### Core Files Created

#### 1. `src/lib/route-finding.ts`
The main route finding algorithm that:
- Calculates distances using Haversine formula
- Finds nearest/nearby bus stops
- Checks if routes connect specific stops
- Gets real-time bus arrival information
- Computes total journey times
- Compares with Google Maps routes

**Key Functions:**
```typescript
findNearestBusStop(location: LatLng, maxDistance?: number): Promise<BusStop | null>
findNearbyBusStops(location: LatLng, maxDistance?: number): Promise<BusStop[]>
findInternalBusRoutes(origin: LatLng, destination: LatLng): Promise<InternalBusRoute[]>
findBestRoute(origin: LatLng, destination: LatLng, googleMapsTimeSeconds?: number): Promise<RouteComparison>
```

#### 2. `src/lib/hooks/use-internal-route-finder.ts`
React hook that integrates the route finding into components:
```typescript
useInternalRouteFinder({
  origin: LatLng | null,
  destination: LatLng | null,
  googleMapsTimeSeconds?: number,
  enabled?: boolean
}): UseInternalRouteFinderResult
```

Returns:
- `routes`: All catchable internal bus routes
- `bestRoute`: The fastest internal route
- `recommendInternal`: Whether internal bus is faster than Google Maps
- `isLoading`: Loading state
- `error`: Any errors encountered

#### 3. `src/components/internal-route-card.tsx`
UI components to display internal route options:

**`InternalRouteCard`** - Displays a single internal bus route with:
- Route badge (A1, A2, D1, D2, BTC)
- Total journey time
- Step-by-step breakdown:
  - Walk to bus stop (with time and distance)
  - Wait time for bus
  - Bus ride (route number and duration)
  - Walk from bus stop to destination
- Warning if user can't catch the bus
- Recommended badge for fastest route

**`InternalRoutesSection`** - Container that displays:
- Section header
- Comparison message when internal is faster
- All available internal routes
- Loading/empty states

### Integration

The route finding is integrated into the navigation page (`src/app/(app)/navigation.tsx`):

1. Hook is initialized with user location and destination
2. Automatically fetches Google Maps route first
3. Simultaneously searches for internal shuttle routes
4. Compares both options
5. Displays internal routes with recommendation badge if faster

## Algorithm Details

### Distance Calculation
Uses the Haversine formula to calculate great-circle distance between two GPS coordinates:
```typescript
R = 6371e3 // Earth's radius in meters
distance = R × 2 × atan2(√a, √(1−a))
```

### Walking Time Estimation
- Average walking speed: 1.4 m/s (5 km/h)
- Walking time = distance / walking speed

### Bus Catchability
User can catch a bus if:
```typescript
walkingTimeToStop + bufferTime(120s) <= busArrivalTime
```

### Travel Time Estimation
- Assumes ~2 minutes per bus stop
- Travel time = (number of stops between) × 120 seconds

### Total Journey Time
```typescript
totalTime = walkToStopTime + waitingTime + busTravelTime + walkFromStopTime
```

### Recommendation Logic
Internal route is recommended if:
```typescript
bestInternalTime <= googleMapsTime + 300 // 5-minute tolerance
```

This ensures we prioritize internal buses even if they're slightly slower, as they're more convenient within campus.

## API Usage

The system uses the following NUS NextBus API endpoints:

1. **`/BusStops`** - Get all bus stop locations
2. **`/PickupPoint?route_code=X`** - Get stops served by a specific route
3. **`/ShuttleService?busstopname=X`** - Get real-time bus arrivals at a stop
4. **`/CheckPoint?route_code=X`** - Get route waypoints (for future enhancements)

## User Experience

### Scenario 1: Internal Bus is Faster
```
🚌 Internal Shuttle Routes

✅ Taking the internal shuttle is faster than external transport!

┌─────────────────────────────────┐
│ ⚡ Fastest with Internal Bus     │
│                                  │
│ A2  Internal Shuttle      15 min│
│                                  │
│ 🚶 Walk 3 min to PGP             │
│ ⏰ Wait 2 min for bus            │
│ 🚌 A2 bus • 8 min to UTOWN       │
│ 🚶 Walk 2 min to destination     │
└─────────────────────────────────┘

Google: 23 min
```

### Scenario 2: Multiple Options
Shows all catchable routes sorted by total time, allowing users to choose based on:
- Fastest option
- Shortest walk
- Least waiting time
- Preferred route

### Scenario 3: Can't Catch Bus
```
┌─────────────────────────────────┐
│ D2  Internal Shuttle      12 min│
│                                  │
│ 🚶 Walk 5 min to Museum          │
│ ⏰ Wait 1 min for bus            │
│ 🚌 D2 bus • 4 min to UTOWN       │
│ 🚶 Walk 2 min to destination     │
│                                  │
│ ⚠️ You may not reach the bus    │
│    stop in time for this bus    │
└─────────────────────────────────┘
```

## Configuration

### Constants (can be tuned in `route-finding.ts`)
```typescript
WALKING_SPEED = 1.4 // m/s (adjustable for different walking paces)
BUS_CATCH_BUFFER = 120 // seconds (safety margin to catch bus)
MAX_ORIGIN_WALK = 800 // meters (max walk to first bus stop)
MAX_DESTINATION_WALK = 500 // meters (max walk from last bus stop)
```

### Shuttle Routes
```typescript
SHUTTLE_ROUTES = ['A1', 'A2', 'D1', 'D2', 'BTC']
```

## Future Enhancements

### 1. Multi-Transfer Routes
Currently only supports direct routes. Could add support for:
- One transfer (e.g., A1 → walk → D2)
- Multiple segments

### 2. Time-Based Routing
- Consider operating hours from `/RouteMinMaxTime`
- Show "Service not operating" for routes outside hours
- Predict next available bus time

### 3. Real-Time Delays
- Integrate bus location data from `/ActiveBus`
- Calculate more accurate ETAs
- Show bus delays/traffic conditions

### 4. Preference Learning
- Remember user's favorite routes
- Learn from route selections
- Personalize recommendations

### 5. Accessibility Options
- Wheelchair-accessible routes
- Covered walkway preferences
- Shelter availability at stops

### 6. Weather Integration
- Prioritize routes with more shelter during rain
- Adjust walking speed estimates based on weather

### 7. Historical Data
- Learn average bus travel times by time of day
- More accurate wait time predictions
- Peak hour route suggestions

## Testing

To test the route finding:

1. Navigate to the navigation page with a destination
2. Ensure location permissions are enabled
3. The system will automatically:
   - Fetch Google Maps route
   - Search for internal shuttle options
   - Display both with recommendations

Example test cases:
- PGP to UTown
- COM3 to Museum
- Kent Ridge MRT to Science Block
- UTown to Engineering

## Performance Considerations

- API calls are made in parallel where possible
- Results are cached during the component lifecycle
- Distance calculations use optimized Haversine formula
- Only searches nearby stops to reduce computation

## Known Limitations

1. **No multi-transfer support** - Only shows direct routes
2. **Estimated travel times** - Uses average 2min/stop, not real-time
3. **Static operating hours** - Doesn't check if service is running
4. **Weather-agnostic** - Doesn't adjust for rain/weather conditions
5. **No reverse direction** - Only checks if arrival stop comes after departure in route sequence

## Conclusion

This internal route finding system provides NUS students with smart, campus-optimized navigation that prioritizes the convenience and speed of internal shuttle buses over external transport options. It integrates seamlessly with Google Maps while offering better routes for intra-campus travel.
