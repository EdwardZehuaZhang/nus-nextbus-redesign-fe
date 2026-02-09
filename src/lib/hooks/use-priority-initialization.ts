/**
 * Priority Initialization Hook
 * 
 * This hook manages the startup priority sequence:
 * 1. Get user location (highest priority)
 * 2. Fetch bus stops
 * 3. Calculate nearest stops
 * 4. Fetch shuttle data for nearest stops (with prefetch)
 * 5. All other API calls
 * 
 * This ensures the most critical features load first.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from './use-location';
import { useBusStops, useServiceDescriptions } from '@/api/bus';
import { useShuttleService } from '@/api/bus/use-bus-api';
import { calculateDistance } from '@/api';

export type InitializationPhase = 
  | 'idle'
  | 'location'           // Getting user location
  | 'bus-stops'          // Fetching bus stops
  | 'nearest-stops'      // Calculated nearest stops
  | 'shuttle-data'       // Fetching shuttle data for nearest stops
  | 'complete';

export interface InitializationState {
  phase: InitializationPhase;
  nearestStops: Array<{ id: string; label: string; distance: number }>;
  isReady: boolean; // True when nearest stops and their shuttle data are ready
  isLocationReady: boolean;
}

/**
 * Priority initialization hook for startup sequence
 * Ensures location and nearest stops load first
 */
export const usePriorityInitialization = (): InitializationState => {
  const queryClient = useQueryClient();
  const stateRef = useRef<InitializationState>({
    phase: 'idle',
    nearestStops: [],
    isReady: false,
    isLocationReady: false,
  });

  // 1. Get user location (highest priority)
  const { coords: userLocation, loading: locationLoading, error: locationError } = useLocation();

  // 2. Fetch bus stops
  const { data: busStopsData, isLoading: busStopsLoading } = useBusStops();

  // 3. Calculate nearest stops when we have location + bus stops
  const nearestStops = useCallback((): Array<{ id: string; label: string; distance: number }> => {
    if (!userLocation || !busStopsData?.BusStopsResult?.busstops) {
      return [];
    }

    const stops = busStopsData.BusStopsResult.busstops
      .map((stop) => {
        const distance = calculateDistance({
          lat1: userLocation.latitude,
          lon1: userLocation.longitude,
          lat2: stop.latitude,
          lon2: stop.longitude,
        });

        return {
          id: stop.name,
          label: stop.ShortName,
          distance,
        };
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 2); // Get the 2 nearest stops

    return stops;
  }, [userLocation, busStopsData]);

  const calculatedNearestStops = nearestStops();

  // 4. Prefetch service descriptions early
  useEffect(() => {
    if (calculatedNearestStops.length > 0) {
      // Prefetch service descriptions if not already cached
      const serviceDescKey = ['serviceDescriptions'];
      const cached = queryClient.getQueryData(serviceDescKey);
      if (!cached) {
        queryClient.prefetchQuery({
          queryKey: serviceDescKey,
          queryFn: async () => {
            // This will trigger useServiceDescriptions
            const { getServiceDescriptions } = await import('@/api/bus');
            return getServiceDescriptions();
          },
          staleTime: 10 * 60 * 1000, // 10 minutes
        });
      }
    }
  }, [calculatedNearestStops, queryClient]);

  // 5. Prefetch shuttle data for nearest stops
  useEffect(() => {
    if (calculatedNearestStops.length > 0) {
      calculatedNearestStops.forEach((stop) => {
        // Prefetch shuttle service data
        const key = ['shuttleService', stop.id];
        const cached = queryClient.getQueryData(key);
        if (!cached) {
          queryClient.prefetchQuery({
            queryKey: key,
            queryFn: async () => {
              const { getShuttleService } = await import('@/api/bus');
              return getShuttleService(stop.id);
            },
            staleTime: 5 * 1000, // 5 seconds
          });
        }
      });
    }
  }, [calculatedNearestStops, queryClient]);

  // Update state based on loading phases
  useEffect(() => {
    let newPhase: InitializationPhase = 'idle';
    let isLocationReady = false;
    let isReady = false;

    if (locationLoading) {
      newPhase = 'location';
    } else if (userLocation) {
      isLocationReady = true;
      
      if (busStopsLoading) {
        newPhase = 'bus-stops';
      } else if (calculatedNearestStops.length > 0) {
        newPhase = 'nearest-stops';
        // Consider ready once we have nearest stops (shuttle data will load in background)
        isReady = true;
        // After a short delay to ensure shuttle queries are in-flight, mark as truly ready
        const timer = setTimeout(() => {
          newPhase = 'shuttle-data';
        }, 100);
        return () => clearTimeout(timer);
      }
    }

    stateRef.current = {
      phase: newPhase,
      nearestStops: calculatedNearestStops,
      isReady,
      isLocationReady,
    };
  }, [locationLoading, userLocation, busStopsLoading, calculatedNearestStops]);

  return stateRef.current;
};

/**
 * Get the initialization state for UI display
 * Shows minimal loading messages with highest priority
 */
export const useInitializationUI = () => {
  const state = usePriorityInitialization();

  return {
    showLoadingState: !state.isLocationReady,
    loadingMessage: state.phase === 'location' 
      ? 'Getting your location...' 
      : 'Loading bus stops...',
    isReady: state.isReady,
    nearestStops: state.nearestStops,
  };
};
