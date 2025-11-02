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
import type { LatLng } from '@/api/google-routes';

// Average walking speed in meters per second (1.4 m/s = ~5 km/h)
const WALKING_SPEED = 1.4;

// Time buffer for catching a bus (in seconds)
const BUS_CATCH_BUFFER = 120; // 2 minutes

// All NUS shuttle bus routes
const SHUTTLE_ROUTES: RouteCode[] = ['A1', 'A2', 'D1', 'D2', 'BTC'];

export interface BusStop {
  name: string;
  code: string;
  location: LatLng;
}

export interface InternalBusRoute {
  routeCode: RouteCode;
  departureStop: BusStop;
  arrivalStop: BusStop;
  walkToStopTime: number; // seconds
  walkToStopDistance: number; // meters
  waitingTime: number; // seconds
  busArrivalTime: string; // when bus arrives at departure stop
  busTravelTime: number; // estimated travel time on bus
  walkFromStopTime: number; // walking time from arrival stop to final destination
  walkFromStopDistance: number; // meters
  totalTime: number; // total journey time in seconds
  canCatchBus: boolean; // whether user can make it in time
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
    const busStopsData = await getBusStops();
    const stops = busStopsData.BusStopsResult.busstops;

    const nearbyStops: BusStop[] = [];

    for (const stop of stops) {
      const stopLocation: LatLng = {
        latitude: stop.latitude,
        longitude: stop.longitude,
      };

      const distance = calculateDistance(location, stopLocation);

      if (distance <= maxDistance) {
        nearbyStops.push({
          name: stop.name,
          code: stop.ShortName,
          location: stopLocation,
        });
      }
    }

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
 */
async function routeConnectsStops(
  routeCode: RouteCode,
  departureStopName: string,
  arrivalStopName: string
): Promise<{ connects: boolean; estimatedTravelTime: number }> {
  try {
    const pickupPoints = await getPickupPoints(routeCode);
    const stops = pickupPoints.PickupPointResult.pickuppoint;

    const departureIndex = stops.findIndex(
      (stop) => stop.pickupname === departureStopName
    );
    const arrivalIndex = stops.findIndex(
      (stop) => stop.pickupname === arrivalStopName
    );

    if (departureIndex === -1 || arrivalIndex === -1) {
      return { connects: false, estimatedTravelTime: 0 };
    }

    // Check if arrival stop comes after departure stop in the route
    if (arrivalIndex <= departureIndex) {
      return { connects: false, estimatedTravelTime: 0 };
    }

    // Estimate travel time: ~2 minutes per stop on average
    const stopsInBetween = arrivalIndex - departureIndex;
    const estimatedTravelTime = stopsInBetween * 120; // 2 minutes per stop

    return { connects: true, estimatedTravelTime };
  } catch (error) {
    console.error(`Error checking route ${routeCode}:`, error);
    return { connects: false, estimatedTravelTime: 0 };
  }
}

/**
 * Get next bus arrival time at a stop
 */
async function getNextBusArrival(
  stopName: string,
  routeCode: RouteCode
): Promise<{ arrivalTime: number; vehiclePlate: string } | null> {
  try {
    const shuttleService = await getShuttleService(stopName);
    const shuttles = shuttleService.ShuttleServiceResult.shuttles;

    const routeShuttle = shuttles.find(
      (shuttle) => shuttle.name === routeCode
    );

    if (!routeShuttle || !routeShuttle.arrivalTime) {
      return null;
    }

    const arrivalMinutes = parseInt(routeShuttle.arrivalTime, 10);
    
    // If arrival time is negative or empty, no bus available
    if (isNaN(arrivalMinutes) || arrivalMinutes < 0) {
      return null;
    }

    return {
      arrivalTime: arrivalMinutes * 60, // Convert to seconds
      vehiclePlate: routeShuttle.arrivalTime_veh_plate || '',
    };
  } catch (error) {
    console.error(`Error getting shuttle service for ${stopName}:`, error);
    return null;
  }
}

/**
 * Find all possible internal bus routes between origin and destination
 */
export async function findInternalBusRoutes(
  origin: LatLng,
  destination: LatLng
): Promise<InternalBusRoute[]> {
  const routes: InternalBusRoute[] = [];

  try {
    // Find nearby bus stops from origin (within 800m)
    const nearbyOriginStops = await findNearbyBusStops(origin, 800);
    
    // Find nearby bus stops from destination (within 500m)
    const nearbyDestinationStops = await findNearbyBusStops(destination, 500);

    if (nearbyOriginStops.length === 0 || nearbyDestinationStops.length === 0) {
      return routes;
    }

    // Check all combinations of routes and stops
    for (const routeCode of SHUTTLE_ROUTES) {
      for (const departureStop of nearbyOriginStops) {
        for (const arrivalStop of nearbyDestinationStops) {
          // Check if this route connects these stops
          const { connects, estimatedTravelTime } = await routeConnectsStops(
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

          // Get next bus arrival
          const nextBus = await getNextBusArrival(departureStop.name, routeCode);

          if (!nextBus) continue;

          const waitingTime = nextBus.arrivalTime;
          
          // Check if user can catch the bus
          const canCatchBus = walkToStopTime + BUS_CATCH_BUFFER <= waitingTime;

          const totalTime =
            walkToStopTime + waitingTime + estimatedTravelTime + walkFromStopTime;

          routes.push({
            routeCode,
            departureStop,
            arrivalStop,
            walkToStopTime,
            walkToStopDistance,
            waitingTime,
            busArrivalTime: new Date(Date.now() + nextBus.arrivalTime * 1000).toISOString(),
            busTravelTime: estimatedTravelTime,
            walkFromStopTime,
            walkFromStopDistance,
            totalTime,
            canCatchBus,
          });
        }
      }
    }

    // Sort routes by total time
    routes.sort((a, b) => a.totalTime - b.totalTime);

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
  
  // Filter for routes the user can actually catch
  const catchableRoutes = internalRoutes.filter(route => route.canCatchBus);
  
  const bestInternalRoute = catchableRoutes.length > 0 ? catchableRoutes[0] : null;

  // If no Google Maps time provided, always recommend internal if available
  if (googleMapsTimeSeconds === undefined || googleMapsTimeSeconds === null) {
    return {
      internalRoutes: catchableRoutes,
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
    internalRoutes: catchableRoutes,
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
