import { useQuery } from '@tanstack/react-query';

import {
  getActiveBuses,
  getAnnouncements,
  getBusLocation,
  getBusStops,
  getCheckpoints,
  getPickupPoints,
  getPublicity,
  getRouteMinMaxTime,
  getServiceDescriptions,
  getShuttleService,
  getTickerTapes,
} from './api';
import type { RouteCode } from './types';

/**
 * Hook to fetch publicity banners
 */
export const usePublicity = () => {
  return useQuery({
    queryKey: ['publicity'],
    queryFn: getPublicity,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch all bus stops
 */
export const useBusStops = () => {
  try {
    return useQuery({
      queryKey: ['busStops'],
      queryFn: getBusStops,
      staleTime: 10 * 60 * 1000, // 10 minutes - bus stops rarely change
    });
  } catch (error) {
    console.error('[useBusStops] Error initializing query:', error);
    // Return a default empty result to prevent crashes
    return { data: undefined, error, isLoading: false, isError: true };
  }
};

/**
 * Hook to fetch pickup points for a route
 */
export const usePickupPoints = (routeCode: RouteCode) => {
  return useQuery({
    queryKey: ['pickupPoints', routeCode],
    queryFn: () => getPickupPoints(routeCode),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!routeCode, // Only fetch when routeCode is provided
  });
};

/**
 * Hook to fetch shuttle service at a bus stop
 * Refetches frequently for real-time updates
 * Uses dynamic polling: faster when buses are arriving soon, slower otherwise
 */
export const useShuttleService = (busStopName: string, enabled = true) => {
  return useQuery({
    queryKey: ['shuttleService', busStopName],
    queryFn: () => getShuttleService(busStopName),
    enabled: enabled && !!busStopName,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: (query) => {
      const data = query.state.data;
      
      // If no data yet, use default interval
      if (!data?.ShuttleServiceResult?.shuttles) {
        return 30 * 1000; // 30 seconds default
      }
      
      // Find the minimum arrival time across all shuttles
      let minArrivalTime = Infinity;
      
      for (const shuttle of data.ShuttleServiceResult.shuttles) {
        const arrivalTime = typeof shuttle.arrivalTime === 'string' 
          ? parseInt(shuttle.arrivalTime, 10) 
          : shuttle.arrivalTime;
        
        const nextArrivalTime = typeof shuttle.nextArrivalTime === 'string'
          ? parseInt(shuttle.nextArrivalTime, 10)
          : shuttle.nextArrivalTime;
        
        // Check arrivalTime
        if (!isNaN(arrivalTime) && arrivalTime >= 0 && arrivalTime < minArrivalTime) {
          minArrivalTime = arrivalTime;
        }
        
        // Check nextArrivalTime
        if (!isNaN(nextArrivalTime) && nextArrivalTime >= 0 && nextArrivalTime < minArrivalTime) {
          minArrivalTime = nextArrivalTime;
        }
      }
      
      // Dynamic polling based on closest bus:
      // - If bus arriving in ≤2 minutes: refresh every 5 seconds (to catch "Arr" state)
      // - If bus arriving in 2-5 minutes: refresh every 15 seconds
      // - Otherwise: refresh every 30 seconds
      if (minArrivalTime <= 2) {
        return 5 * 1000; // 5 seconds for imminent arrivals
      } else if (minArrivalTime <= 5) {
        return 15 * 1000; // 15 seconds for soon arrivals
      } else {
        return 30 * 1000; // 30 seconds for distant arrivals
      }
    },
  });
};

/**
 * Hook to fetch active buses on a route
 * Refetches frequently for real-time bus locations
 */
export const useActiveBuses = (routeCode: RouteCode, enabled = true) => {
  return useQuery({
    queryKey: ['activeBuses', routeCode],
    queryFn: () => getActiveBuses(routeCode),
    enabled: enabled && !!routeCode,
    staleTime: 1 * 1000, // 1 second - faster cache invalidation on first route selection
    refetchInterval: 20 * 1000, // Refetch every 20 seconds for live bus tracking
  });
};

/**
 * Hook to fetch a specific bus location
 */
export const useBusLocation = (vehiclePlate: string, enabled = true) => {
  return useQuery({
    queryKey: ['busLocation', vehiclePlate],
    queryFn: () => getBusLocation(vehiclePlate),
    enabled: enabled && !!vehiclePlate,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  });
};

/**
 * Hook to fetch route operating hours
 */
export const useRouteMinMaxTime = (routeCode: RouteCode) => {
  return useQuery({
    queryKey: ['routeMinMaxTime', routeCode],
    queryFn: () => getRouteMinMaxTime(routeCode),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Hook to fetch service descriptions
 */
export const useServiceDescriptions = () => {
  return useQuery({
    queryKey: ['serviceDescriptions'],
    queryFn: getServiceDescriptions,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to fetch announcements
 */
export const useAnnouncements = () => {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

/**
 * Hook to fetch ticker tapes
 */
export const useTickerTapes = () => {
  return useQuery({
    queryKey: ['tickerTapes'],
    queryFn: getTickerTapes,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

/**
 * Hook to fetch checkpoints for a route
 */
export const useCheckpoints = (routeCode: RouteCode) => {
  return useQuery({
    queryKey: ['checkpoints', routeCode],
    queryFn: () => getCheckpoints(routeCode),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: false, // Disable API call, use local data instead
  });
};
