/**
 * NUS Internal Shuttle Bus Route Finding Algorithm
 * 
 * This module implements a smart route finding algorithm that prioritizes
 * NUS internal shuttle buses over public/external transportation.
 * 
 * Strategy:
 * 1. Find all internal bus routes that can get from origin to destination
 * 2. Calculate walking time to nearest bus stops
 * 3. Get real-time bus arrival information
 * 4. Check if user can catch upcoming buses
 * 5. Calculate total journey time including waiting and travel
 * 6. Compare with Google Maps routes and prioritize internal buses when faster
 */

import { 
  getBusStops, 
  getPickupPoints, 
  getShuttleService, 
  getCheckpoints,
  type RouteCode 
} from '@/api/bus';
import type { LatLng, Route as GoogleRoute } from '@/api/google-routes';
import { getWalkingRoute } from '@/api/google-routes';

// Average walking speed in meters per second (1.4 m/s = ~5 km/h)
const WALKING_SPEED = 1.4;

// Time buffer for catching a bus (in seconds)
const BUS_CATCH_BUFFER = 120; // 2 minutes

// All NUS shuttle bus routes
const SHUTTLE_ROUTES: RouteCode[] = ['A1', 'A2', 'D1', 'D2', 'BTC'];

export interface BusStop {
  name: string; // API code (e.g., 'YIH', 'CLB')
  caption: string; // Display name (e.g., 'Yusof Ishak House', 'Prince George\'s Park')
  code: string; // Short name (e.g., 'YIH', 'Opp UHC')
  location: LatLng;
}

export interface InternalBusRoute {
  routeCode: RouteCode;
  departureStop: BusStop;
  arrivalStop: BusStop;
  intermediateStops: string[]; // list of stop names between departure and arrival
  walkToStopTime: number; // seconds
  walkToStopDistance: number; // meters
  walkToStopRoute?: GoogleRoute; // actual walking directions from Google Maps
  waitingTime: number; // seconds - arrival time of the selected bus we're taking
  busArrivalTime: string; // when bus arrives at departure stop
  busTravelTime: number; // estimated travel time on bus
  walkFromStopTime: number; // walking time from arrival stop to final destination
  walkFromStopDistance: number; // meters
  walkFromStopRoute?: GoogleRoute; // actual walking directions to final destination
  totalTime: number; // total journey time in seconds
  canCatchBus: boolean; // whether user can make it in time
  selectedBusVehiclePlate?: string; // vehicle plate of the bus we're taking
  allBusArrivals?: { arrivalTime: number; vehiclePlate: string }[]; // all available bus timings
}

export interface RouteComparison {
  internalRoutes: InternalBusRoute[];
  bestInternalRoute: InternalBusRoute | null;
  googleMapsTime: number | null; // in seconds
  recommendInternal: boolean; // whether to recommend internal bus over Google Maps
}

/**
 * Calculate the distance between two coordinates using Haversine formula
 */
export function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate walking time based on distance
 */
export function calculateWalkingTime(distanceMeters: number): number {
  return Math.ceil(distanceMeters / WALKING_SPEED);
}

/**
 * Find the nearest bus stop to a given location
 */
export async function findNearestBusStop(
  location: LatLng,
  maxDistance: number = 1000 // max 1km walking distance by default
): Promise<BusStop | null> {
  try {
    const busStopsData = await getBusStops();
    const stops = busStopsData.BusStopsResult.busstops;

    let nearestStop: BusStop | null = null;
    let minDistance = maxDistance;

    for (const stop of stops) {
      const stopLocation: LatLng = {
        latitude: stop.latitude,
        longitude: stop.longitude,
      };

      const distance = calculateDistance(location, stopLocation);

      if (distance < minDistance) {
        minDistance = distance;
        nearestStop = {
          name: stop.name,
          caption: stop.caption,
          code: stop.ShortName,
          location: stopLocation,
        };
      }
    }

    return nearestStop;
  } catch (error) {
    console.error('Error finding nearest bus stop:', error);
    return null;
  }
}

/**
 * Find all bus stops within a certain radius
 */
export async function findNearbyBusStops(
  location: LatLng,
  maxDistance: number = 1000
): Promise<BusStop[]> {
  try {
    // console.log(`🔍 [findNearbyBusStops] Searching for stops near:`, location, `within ${maxDistance}m`);
    const busStopsData = await getBusStops();
    const stops = busStopsData.BusStopsResult.busstops;
    // console.log(`📊 [findNearbyBusStops] Total bus stops in database: ${stops.length}`);

    const nearbyStops: BusStop[] = [];

    for (const stop of stops) {
      const stopLocation: LatLng = {
        latitude: stop.latitude,
        longitude: stop.longitude,
      };

      const distance = calculateDistance(location, stopLocation);

      if (distance <= maxDistance) {
        // console.log(`✓ Stop ${stop.ShortName} (${stop.name}) is ${Math.round(distance)}m away`);
        nearbyStops.push({
          name: stop.name,
          caption: stop.caption,
          code: stop.ShortName,
          location: stopLocation,
        });
      }
    }
    
    // console.log(`✅ [findNearbyBusStops] Found ${nearbyStops.length} stops within ${maxDistance}m`);

    // Sort by distance
    nearbyStops.sort((a, b) => {
      const distA = calculateDistance(location, a.location);
      const distB = calculateDistance(location, b.location);
      return distA - distB;
    });

    return nearbyStops;
  } catch (error) {
    console.error('Error finding nearby bus stops:', error);
    return [];
  }
}

/**
 * Check if a route serves both origin and destination stops
 * Uses busstopcode to match against BusStop.name (API code like 'PGP', 'UTOWN')
 */
async function routeConnectsStops(
  routeCode: RouteCode,
  departureStopCode: string,
  arrivalStopCode: string
): Promise<{ connects: boolean; estimatedTravelTime: number; intermediateStops: string[] }> {
  try {
    // console.log(`🚌 Checking if route ${routeCode} connects ${departureStopCode} → ${arrivalStopCode}`);
    const pickupPoints = await getPickupPoints(routeCode);
    const stops = pickupPoints.PickupPointResult.pickuppoint;
    
    // console.log(`📋 Route ${routeCode} stops:`, stops.map(s => `${s.pickupname} (${s.busstopcode})`).join(', '));

    const departureIndex = stops.findIndex(
      (stop) => stop.busstopcode === departureStopCode
    );
    const arrivalIndex = stops.findIndex(
      (stop) => stop.busstopcode === arrivalStopCode
    );
    
    // console.log(`📍 Departure code "${departureStopCode}" index: ${departureIndex}, Arrival code "${arrivalStopCode}" index: ${arrivalIndex}`);

    if (departureIndex === -1 || arrivalIndex === -1) {
      // console.log(`❌ Route ${routeCode} does not serve both stops`);
      return { connects: false, estimatedTravelTime: 0, intermediateStops: [] };
    }

    // Check if arrival stop comes after departure stop in the route
    if (arrivalIndex <= departureIndex) {
      // console.log(`❌ Route ${routeCode}: arrival stop comes before or at same position as departure`);
      return { connects: false, estimatedTravelTime: 0, intermediateStops: [] };
    }

    // Get intermediate stops (excluding departure and arrival)
    // Use ShortName to match the format used by map markers
    const intermediateStops = stops
      .slice(departureIndex + 1, arrivalIndex)
      .map(stop => stop.ShortName);

    // Estimate travel time: ~2 minutes per stop on average
    const stopsInBetween = arrivalIndex - departureIndex;
    const estimatedTravelTime = stopsInBetween * 120; // 2 minutes per stop
    
    // console.log(`✅ Route ${routeCode} connects! ${stopsInBetween} stops, ~${Math.ceil(estimatedTravelTime/60)} min`);

    return { connects: true, estimatedTravelTime, intermediateStops };
  } catch (error) {
    console.error(`❌ Error checking route ${routeCode}:`, error);
    return { connects: false, estimatedTravelTime: 0, intermediateStops: [] };
  }
}

/**
 * Get all bus arrival times at a stop (up to 3 buses)
 */
async function getBusArrivals(
  stopName: string,
  routeCode: RouteCode
): Promise<{ arrivalTime: number; vehiclePlate: string }[]> {
  try {
    const shuttleService = await getShuttleService(stopName);
    const shuttles = shuttleService.ShuttleServiceResult.shuttles;

    const routeShuttle = shuttles.find(
      (shuttle) => shuttle.name === routeCode
    );

    if (!routeShuttle) {
      return [];
    }

    const arrivals: { arrivalTime: number; vehiclePlate: string }[] = [];

    // First bus
    const arrivalMinutes = parseInt(routeShuttle.arrivalTime, 10);
    if (!isNaN(arrivalMinutes) && arrivalMinutes >= 0) {
      arrivals.push({
        arrivalTime: arrivalMinutes * 60, // Convert to seconds
        vehiclePlate: routeShuttle.arrivalTime_veh_plate || '',
      });
    }

    // Second bus
    const nextArrivalMinutes = parseInt(routeShuttle.nextArrivalTime, 10);
    if (!isNaN(nextArrivalMinutes) && nextArrivalMinutes >= 0) {
      arrivals.push({
        arrivalTime: nextArrivalMinutes * 60, // Convert to seconds
        vehiclePlate: routeShuttle.nextArrivalTime_veh_plate || '',
      });
    }

    return arrivals;
  } catch (error) {
    console.error(`Error getting shuttle service for ${stopName}:`, error);
    return [];
  }
}

/**
 * Find all possible internal bus routes between origin and destination
 */
export async function findInternalBusRoutes(
  origin: LatLng,
  destination: LatLng
): Promise<InternalBusRoute[]> {
  console.log('🚌 [INTERNAL ROUTE FINDER] Starting route search...');
  console.log('📍 Origin:', origin);
  console.log('📍 Destination:', destination);
  
  const routes: InternalBusRoute[] = [];

  try {
    // Find nearby bus stops from origin (within 800m)
    // console.log('🔍 Finding nearby bus stops from origin (within 800m)...');
    const nearbyOriginStops = await findNearbyBusStops(origin, 800);
    // console.log(`✅ Found ${nearbyOriginStops.length} bus stops near origin:`, nearbyOriginStops.map(s => s.code).join(', '));
    
    // Find nearby bus stops from destination (within 500m)
    // console.log('🔍 Finding nearby bus stops from destination (within 500m)...');
    const nearbyDestinationStops = await findNearbyBusStops(destination, 500);
    // console.log(`✅ Found ${nearbyDestinationStops.length} bus stops near destination:`, nearbyDestinationStops.map(s => s.code).join(', '));

    if (nearbyOriginStops.length === 0 || nearbyDestinationStops.length === 0) {
      console.warn('⚠️ No nearby bus stops found!');
      return routes;
    }

    // Check all combinations of routes and stops
    // OPTIMIZATION: Only check the nearest 3 stops from origin to reduce API calls
    const nearestOriginStops = nearbyOriginStops.slice(0, 3);
    // console.log(`🎯 Checking only ${nearestOriginStops.length} nearest origin stops:`, nearestOriginStops.map(s => s.code).join(', '));
    
    const nearestDestStops = nearbyDestinationStops.slice(0, 3);
    // console.log(`🎯 Checking only ${nearestDestStops.length} nearest destination stops:`, nearestDestStops.map(s => s.code).join(', '));
    
    for (const routeCode of SHUTTLE_ROUTES) {
      for (const departureStop of nearestOriginStops) {
        for (const arrivalStop of nearestDestStops) {
          // Check if this route connects these stops
          // Use API codes (name field) to match with pickup point busstopcode
          const { connects, estimatedTravelTime, intermediateStops } = await routeConnectsStops(
            routeCode,
            departureStop.name,
            arrivalStop.name
          );

          if (!connects) continue;

          // Calculate walking distances
          const walkToStopDistance = calculateDistance(origin, departureStop.location);
          const walkToStopTime = calculateWalkingTime(walkToStopDistance);

          const walkFromStopDistance = calculateDistance(
            arrivalStop.location,
            destination
          );
          const walkFromStopTime = calculateWalkingTime(walkFromStopDistance);

          // Fetch actual walking routes from Google Maps
          let walkToStopRoute: GoogleRoute | undefined;
          let walkFromStopRoute: GoogleRoute | undefined;
          let actualWalkToStopTime = walkToStopTime;
          let actualWalkFromStopTime = walkFromStopTime;

          try {
            // Get walking directions to the bus stop
            // console.log(`🚶 Fetching walking route from origin to ${departureStop.code}...`);
            const walkToStopResponse = await getWalkingRoute(
              { location: { latLng: origin } },
              { location: { latLng: departureStop.location } }
            );
            
            if (walkToStopResponse.routes && walkToStopResponse.routes.length > 0) {
              walkToStopRoute = walkToStopResponse.routes[0];
              // console.log('✅ Got walking route to stop:', {
              //   duration: walkToStopRoute.duration,
              //   distance: walkToStopRoute.distanceMeters,
              //   hasPolyline: !!walkToStopRoute.polyline?.encodedPolyline
              // });
              // Update walking time with actual Google Maps estimate
              const durationSeconds = parseInt(walkToStopRoute.duration.replace('s', ''), 10);
              if (!isNaN(durationSeconds)) {
                actualWalkToStopTime = durationSeconds;
                // console.log(`⏱️ Updated walk time: ${actualWalkToStopTime}s (${Math.ceil(actualWalkToStopTime / 60)} min)`);
              }
            }
          } catch (error) {
            console.error('❌ Error fetching walking route to stop:', error);
            // Continue with Haversine estimate if Google Maps fails
          }

          try {
            // Get walking directions from bus stop to destination
            // console.log(`🚶 Fetching walking route from ${arrivalStop.code} to destination...`);
            const walkFromStopResponse = await getWalkingRoute(
              { location: { latLng: arrivalStop.location } },
              { location: { latLng: destination } }
            );
            
            if (walkFromStopResponse.routes && walkFromStopResponse.routes.length > 0) {
              walkFromStopRoute = walkFromStopResponse.routes[0];
              // console.log('✅ Got walking route from stop:', {
              //   duration: walkFromStopRoute.duration,
              //   distance: walkFromStopRoute.distanceMeters,
              //   hasPolyline: !!walkFromStopRoute.polyline?.encodedPolyline
              // });
              // Update walking time with actual Google Maps estimate
              const durationSeconds = parseInt(walkFromStopRoute.duration.replace('s', ''), 10);
              if (!isNaN(durationSeconds)) {
                actualWalkFromStopTime = durationSeconds;
                // console.log(`⏱️ Updated walk time: ${actualWalkFromStopTime}s (${Math.ceil(actualWalkFromStopTime / 60)} min)`);
              }
            }
          } catch (error) {
            console.error('❌ Error fetching walking route from stop:', error);
            // Continue with Haversine estimate if Google Maps fails
          }

          // Get all bus arrivals (up to 2 buses)
          const busArrivals = await getBusArrivals(departureStop.name, routeCode);

          if (busArrivals.length === 0) continue;

          // Find the first bus the user can actually catch
          // User needs walk time + buffer (2 min) to catch a bus
          const minTimeNeeded = actualWalkToStopTime + BUS_CATCH_BUFFER;
          
          let selectedBus = busArrivals[0]; // Default to first bus
          let canCatchBus = minTimeNeeded <= busArrivals[0].arrivalTime;
          
          // If can't catch first bus, or if there's a better option, check next buses
          if (!canCatchBus && busArrivals.length > 1) {
            // Try to find a catchable bus
            for (let i = 1; i < busArrivals.length; i++) {
              if (minTimeNeeded <= busArrivals[i].arrivalTime) {
                selectedBus = busArrivals[i];
                canCatchBus = true;
                break;
              }
            }
            // If still can't catch any bus, use the last available bus (at least show realistic timing)
            if (!canCatchBus) {
              selectedBus = busArrivals[busArrivals.length - 1];
            }
          }

          const waitingTime = selectedBus.arrivalTime;
          
          // FIXED: Total time should be max(walk, wait) + bus + walk, not walk + wait + bus
          // If you walk 15 mins and bus arrives in 26 mins, you wait 11 mins (26-15), not 26 mins
          // Total = max(15, 26) + bus + walkFromStop = 26 + bus + walkFromStop
          const totalTime = Math.max(actualWalkToStopTime, waitingTime) + estimatedTravelTime + actualWalkFromStopTime;

          const route = {
            routeCode,
            departureStop,
            arrivalStop,
            intermediateStops, // Include intermediate stops
            walkToStopTime: actualWalkToStopTime, // Use actual Google Maps time
            walkToStopDistance,
            walkToStopRoute, // Include Google Maps walking directions
            waitingTime,
            busArrivalTime: new Date(Date.now() + selectedBus.arrivalTime * 1000).toISOString(),
            busTravelTime: estimatedTravelTime,
            walkFromStopTime: actualWalkFromStopTime, // Use actual Google Maps time
            walkFromStopDistance,
            walkFromStopRoute, // Include Google Maps walking directions
            totalTime,
            canCatchBus,
            selectedBusVehiclePlate: selectedBus.vehiclePlate, // Track which bus we're taking
            allBusArrivals: busArrivals, // Include all bus timings for display
          };
          
          console.log(`✅ Created route ${routeCode} (${departureStop.code} → ${arrivalStop.code}):`, {
            totalTime: `${Math.ceil(totalTime / 60)} min (${totalTime}s)`,
            walkToStop: `${Math.ceil(actualWalkToStopTime / 60)} min (${actualWalkToStopTime}s)`,
            wait: `${Math.ceil(waitingTime / 60)} min (${waitingTime}s)`,
            actualWait: `${Math.ceil(Math.max(0, waitingTime - actualWalkToStopTime) / 60)} min`,
            busRide: `${Math.ceil(estimatedTravelTime / 60)} min (${estimatedTravelTime}s)`,
            walkFromStop: `${Math.ceil(actualWalkFromStopTime / 60)} min (${actualWalkFromStopTime}s)`,
            canCatch: canCatchBus,
            hasWalkingRoute: !!walkToStopRoute
          });
          
          routes.push(route);
        }
      }
    }

    // Sort routes by total time
    routes.sort((a, b) => a.totalTime - b.totalTime);
    
    console.log(`🎯 Found ${routes.length} total internal routes`);
    if (routes.length > 0) {
      console.log('🏆 Top 3 routes by time:');
      routes.slice(0, 3).forEach((route, idx) => {
        console.log(`  ${idx + 1}. ${route.routeCode} (${route.departureStop.code} → ${route.arrivalStop.code}): ${Math.ceil(route.totalTime / 60)} min total`);
        console.log(`     - Walk to stop: ${Math.ceil(route.walkToStopTime / 60)} min`);
        console.log(`     - Bus wait: ${Math.ceil(route.waitingTime / 60)} min (actual wait after walking: ${Math.ceil(Math.max(0, route.waitingTime - route.walkToStopTime) / 60)} min)`);
        console.log(`     - Bus ride: ${Math.ceil(route.busTravelTime / 60)} min`);
        console.log(`     - Walk from stop: ${Math.ceil(route.walkFromStopTime / 60)} min`);
      });
    }

    return routes;
  } catch (error) {
    console.error('Error finding internal bus routes:', error);
    return routes;
  }
}

/**
 * Find best route option considering both internal buses and Google Maps
 */
export async function findBestRoute(
  origin: LatLng,
  destination: LatLng,
  googleMapsTimeSeconds?: number
): Promise<RouteComparison> {
  const internalRoutes = await findInternalBusRoutes(origin, destination);
  
  // For now, show ALL routes even if user can't catch them (for testing/demonstration)
  // In production, you might want to filter by canCatchBus or show with warnings
  const allRoutes = internalRoutes;
  
  // Prefer catchable routes, but fall back to showing any route if none are catchable
  const catchableRoutes = internalRoutes.filter(route => route.canCatchBus);
  const bestInternalRoute = catchableRoutes.length > 0 
    ? catchableRoutes[0] 
    : (internalRoutes.length > 0 ? internalRoutes[0] : null);

  // If no Google Maps time provided, always recommend internal if available
  if (googleMapsTimeSeconds === undefined || googleMapsTimeSeconds === null) {
    return {
      internalRoutes: allRoutes,
      bestInternalRoute,
      googleMapsTime: null,
      recommendInternal: bestInternalRoute !== null,
    };
  }

  // Compare times and recommend internal if it's faster or within 5 minutes
  const recommendInternal = bestInternalRoute 
    ? bestInternalRoute.totalTime <= googleMapsTimeSeconds + 300 // 5-minute tolerance
    : false;

  return {
    internalRoutes: allRoutes,
    bestInternalRoute,
    googleMapsTime: googleMapsTimeSeconds,
    recommendInternal,
  };
}

/**
 * Format time duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
}
