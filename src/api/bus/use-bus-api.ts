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
  return useQuery({
    queryKey: ['busStops'],
    queryFn: getBusStops,
    staleTime: 10 * 60 * 1000, // 10 minutes - bus stops rarely change
  });
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
 */
export const useShuttleService = (busStopName: string, enabled = true) => {
  return useQuery({
    queryKey: ['shuttleService', busStopName],
    queryFn: () => getShuttleService(busStopName),
    enabled: enabled && !!busStopName,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
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
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
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
