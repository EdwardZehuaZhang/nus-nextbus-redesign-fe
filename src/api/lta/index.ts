import { ltaClient } from './client';
import type {
  LTABusArrivalResponse,
  LTABusRoute,
  LTABusRoutesResponse,
  LTABusRouteWithStop,
  LTABusStop,
  LTABusStopsResponse,
} from './types';

/**
 * Get all bus stops in Singapore
 * Note: LTA API uses pagination (500 records per page)
 */
export const getAllBusStops = async (): Promise<LTABusStop[]> => {
  const allStops: LTABusStop[] = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await ltaClient.get<LTABusStopsResponse>('/busstops', {
      params: { skip: skip },
    });

    allStops.push(...data.value);
    hasMore = data.value.length === 500; // LTA returns max 500 per page
    skip += 500;
  }

  return allStops;
};

/**
 * Get bus stop by code
 */
export const getBusStopByCode = async (
  busStopCode: string
): Promise<LTABusStop | null> => {
  try {
    const { data } = await ltaClient.get<LTABusStopsResponse>('/busstops', {
      params: {
        BusStopCode: busStopCode,
      },
    });

    return data.value.length > 0 ? data.value[0] : null;
  } catch (error) {
    console.error('Error fetching bus stop:', error);
    return null;
  }
};

/**
 * Get all stops for a specific bus service in order
 * @param serviceNo - Bus number (e.g., "95", "190")
 * @param direction - 1 or 2 (optional, returns both if not specified)
 */
export const getBusRoute = async (
  serviceNo: string,
  direction?: 1 | 2
): Promise<LTABusRoute[]> => {
  const { data } = await ltaClient.get<LTABusRoutesResponse>('/busroutes', {
    params: {
      serviceNo: serviceNo,
      ...(direction && { direction: direction }),
    },
  });

  let routes: LTABusRoute[] = data.value;

  // Filter by direction if specified
  if (direction) {
    routes = routes.filter((r) => r.Direction === direction);
  }

  // Sort by stop sequence to get correct order
  return routes.sort((a, b) => a.StopSequence - b.StopSequence);
};

/**
 * Get all stops for a specific bus service with stop details
 */
export const getBusRouteWithStopDetails = async (
  serviceNo: string,
  direction?: 1 | 2
): Promise<LTABusRouteWithStop[]> => {
  const routes = await getBusRoute(serviceNo, direction);

  // Fetch all unique bus stops
  const uniqueStopCodes = [...new Set(routes.map((r) => r.BusStopCode))];
  const stopDetailsMap = new Map<string, LTABusStop>();

  // Fetch stop details in batches (to avoid too many requests)
  for (const stopCode of uniqueStopCodes) {
    const stopDetails = await getBusStopByCode(stopCode);
    if (stopDetails) {
      stopDetailsMap.set(stopCode, stopDetails);
    }
  }

  // Combine route data with stop details
  return routes.map((route) => ({
    ...route,
    stopDetails: stopDetailsMap.get(route.BusStopCode),
  }));
};

/**
 * Get real-time bus arrival for a specific stop
 * @param busStopCode - Bus stop code (e.g., "83139")
 * @param serviceNo - Optional: filter by specific bus service
 */
export const getBusArrival = async (
  busStopCode: string,
  serviceNo?: string
): Promise<LTABusArrivalResponse> => {
  const { data } = await ltaClient.get<LTABusArrivalResponse>(
    '/busarrival',
    {
      params: {
        busStopCode: busStopCode,
        ...(serviceNo && { serviceNo: serviceNo }),
      },
    }
  );

  return data;
};

/**
 * Get stops between two points for a specific bus line
 * @param serviceNo - Bus number
 * @param fromStopCode - Starting bus stop code
 * @param toStopCode - Ending bus stop code
 * @param direction - Which direction (1 or 2)
 * @returns Array of stops in between (inclusive)
 */
export const getStopsBetween = async (
  serviceNo: string,
  fromStopCode: string,
  toStopCode: string,
  direction: 1 | 2
): Promise<LTABusRouteWithStop[]> => {
  const allStops = await getBusRouteWithStopDetails(serviceNo, direction);

  const fromIndex = allStops.findIndex((s) => s.BusStopCode === fromStopCode);
  const toIndex = allStops.findIndex((s) => s.BusStopCode === toStopCode);

  if (fromIndex === -1 || toIndex === -1) {
    throw new Error('Stop not found on this route');
  }

  // Return stops in between (inclusive)
  return allStops.slice(fromIndex, toIndex + 1);
};

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Find nearest LTA bus stop to given coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @param maxDistance - Maximum search radius in meters (default: 100m)
 */
export const findNearestBusStop = async (
  lat: number,
  lng: number,
  maxDistance: number = 100
): Promise<LTABusStop | null> => {
  try {
    const allStops = await getAllBusStops();
    
    let nearestStop: LTABusStop | null = null;
    let minDistance = maxDistance;

    for (const stop of allStops) {
      const distance = calculateDistance(
        lat,
        lng,
        stop.Latitude,
        stop.Longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStop = stop;
      }
    }

    return nearestStop;
  } catch (error) {
    console.error('Error finding nearest bus stop:', error);
    return null;
  }
};

/**
 * Search for bus routes that connect two stops
 * @param fromStopCode - Starting bus stop code
 * @param toStopCode - Ending bus stop code
 * @returns Array of service numbers that connect the two stops
 */
export const findRoutesConnectingStops = async (
  fromStopCode: string,
  toStopCode: string
): Promise<string[]> => {
  try {
    // Get all routes passing through the origin stop
    const { data: fromRoutesData } = await ltaClient.get<LTABusRoutesResponse>(
      '/BusRoutes'
    );
    const routesAtOrigin = fromRoutesData.value.filter(
      (r) => r.BusStopCode === fromStopCode
    );

    // Check which of these routes also pass through the destination
    const connectingRoutes: string[] = [];

    for (const originRoute of routesAtOrigin) {
      const destRoute = fromRoutesData.value.find(
        (r) =>
          r.ServiceNo === originRoute.ServiceNo &&
          r.Direction === originRoute.Direction &&
          r.BusStopCode === toStopCode &&
          r.StopSequence > originRoute.StopSequence // Ensure destination comes after origin
      );

      if (destRoute) {
        const routeKey = `${originRoute.ServiceNo}-${originRoute.Direction}`;
        if (!connectingRoutes.includes(routeKey)) {
          connectingRoutes.push(routeKey);
        }
      }
    }

    return connectingRoutes;
  } catch (error) {
    console.error('Error finding connecting routes:', error);
    return [];
  }
};
