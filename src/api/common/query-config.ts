/**
 * React Query Configuration for Priority Initialization
 * 
 * This configures React Query to:
 * - Prioritize location and bus stops queries
 * - Retry faster for critical queries
 * - Keep shuttle data fresh with dynamic polling
 * - Reduce refetch intervals during startup
 */

import { DefaultOptions, QueryClient } from '@tanstack/react-query';

/**
 * Default options for React Query
 * These apply to all queries unless overridden
 */
export const queryClientConfig: DefaultOptions = {
  queries: {
    // Standard retry logic: retry failed queries
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Standard cache times
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
  },
};

/**
 * Priority Query Configuration
 * Use for location, bus stops, and nearest stops queries
 */
export const PRIORITY_QUERY_CONFIG = {
  // Location queries
  location: {
    staleTime: Infinity, // Location is fresh as long as it's recent
    gcTime: 1000 * 60 * 10, // Keep for 10 minutes
    retry: true,
    retryDelay: (attemptIndex: number) => attemptIndex * 500, // Faster retry for location
  },

  // Bus stops (fundamental data, rarely changes)
  busStops: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 3,
  },

  // Service descriptions (route colors, metadata)
  serviceDescriptions: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  },

  // Shuttle service (real-time, needs frequent refresh)
  shuttleService: {
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 1000 * 60, // 1 minute
    retry: 2,
    // Don't refetch on window focus for better UX during quick tabs
    refetchOnWindowFocus: false,
  },

  // Pickup points
  pickupPoints: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  },

  // Active buses
  activeBuses: {
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 1000 * 60, // 1 minute
    retry: 1,
  },
};

/**
 * Create a query client with priority configuration
 */
export const createPriorityQueryClient = () => {
  return new QueryClient({
    defaultOptions: queryClientConfig,
  });
};

/**
 * Query Keys for consistent cache management
 */
export const queryKeys = {
  location: {
    all: ['location'] as const,
    current: ['location', 'current'] as const,
  },
  busStops: {
    all: ['busStops'] as const,
    list: ['busStops', 'list'] as const,
  },
  serviceDescriptions: {
    all: ['serviceDescriptions'] as const,
    list: ['serviceDescriptions', 'list'] as const,
  },
  shuttleService: {
    all: ['shuttleService'] as const,
    byStop: (stopId: string) => ['shuttleService', stopId] as const,
  },
  pickupPoints: {
    all: ['pickupPoints'] as const,
    byRoute: (routeCode: string) => ['pickupPoints', routeCode] as const,
  },
  activeBuses: {
    all: ['activeBuses'] as const,
    byRoute: (routeCode: string) => ['activeBuses', routeCode] as const,
  },
};
