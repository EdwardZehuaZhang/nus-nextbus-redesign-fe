import { useState, useEffect } from 'react';
import type { LatLng } from '@/api/google-routes';
import { 
  findBestRoute, 
  type InternalBusRoute, 
  type RouteComparison 
} from '@/lib/route-finding';

export interface UseInternalRouteFinderParams {
  origin: LatLng | null;
  destination: LatLng | null;
  googleMapsTimeSeconds?: number;
  enabled?: boolean;
  arrivalTime?: Date | null; // Desired arrival time at destination
}

export interface UseInternalRouteFinderResult {
  routes: InternalBusRoute[];
  bestRoute: InternalBusRoute | null;
  isLoading: boolean;
  error: Error | null;
  recommendInternal: boolean;
  googleMapsTime: number | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to find and compare internal shuttle bus routes with Google Maps routes
 */
export function useInternalRouteFinder({
  origin,
  destination,
  googleMapsTimeSeconds,
  enabled = true,
  arrivalTime = null,
}: UseInternalRouteFinderParams): UseInternalRouteFinderResult {
  const [routes, setRoutes] = useState<InternalBusRoute[]>([]);
  const [bestRoute, setBestRoute] = useState<InternalBusRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recommendInternal, setRecommendInternal] = useState(false);
  const [googleMapsTime, setGoogleMapsTime] = useState<number | null>(null);

  const fetchRoutes = async () => {
    if (!origin || !destination || !enabled) {
      console.log('⏸️ [useInternalRouteFinder] Skipping fetch:', { 
        hasOrigin: !!origin, 
        hasDestination: !!destination, 
        enabled 
      });
      return;
    }

    console.log('🔄 [useInternalRouteFinder] Fetching internal routes...');
    setIsLoading(true);
    setError(null);

    try {
      const result: RouteComparison = await findBestRoute(
        origin,
        destination,
        googleMapsTimeSeconds
      );

      // Filter routes based on arrival time if specified
      let filteredRoutes = result.internalRoutes;
      let filteredBestRoute = result.bestInternalRoute;
      
      if (arrivalTime) {
        const arrivalTimeMs = arrivalTime.getTime();
        const nowMs = Date.now();
        const maxTravelTimeSeconds = (arrivalTimeMs - nowMs) / 1000;
        
        console.log('⏰ [useInternalRouteFinder] Filtering by arrival time:', {
          arrivalTime: arrivalTime.toLocaleTimeString(),
          maxTravelTime: `${Math.ceil(maxTravelTimeSeconds / 60)} min`,
        });
        
        // Filter routes that arrive before the desired time
        filteredRoutes = result.internalRoutes.filter(route => {
          const arrivesByTime = route.totalTime <= maxTravelTimeSeconds;
          return arrivesByTime;
        });
        
        filteredBestRoute = filteredRoutes.length > 0 ? filteredRoutes[0] : null;
        
        console.log(`✅ [useInternalRouteFinder] Filtered to ${filteredRoutes.length} routes that arrive by ${arrivalTime.toLocaleTimeString()}`);
      }

      console.log('✅ [useInternalRouteFinder] Route search complete:', {
        routesFound: filteredRoutes.length,
        hasBestRoute: !!filteredBestRoute,
        recommendInternal: result.recommendInternal,
        bestRouteDetails: filteredBestRoute ? {
          code: filteredBestRoute.routeCode,
          totalTime: `${Math.ceil(filteredBestRoute.totalTime / 60)} min`,
          hasWalkingRoute: !!filteredBestRoute.walkToStopRoute
        } : null
      });

      setRoutes(filteredRoutes);
      setBestRoute(filteredBestRoute);
      setRecommendInternal(filteredBestRoute !== null && result.recommendInternal);
      setGoogleMapsTime(result.googleMapsTime);
    } catch (err) {
      console.error('❌ [useInternalRouteFinder] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to find routes'));
      setRoutes([]);
      setBestRoute(null);
      setRecommendInternal(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [
    origin?.latitude,
    origin?.longitude,
    destination?.latitude,
    destination?.longitude,
    googleMapsTimeSeconds,
    enabled,
    arrivalTime?.getTime(),
  ]);

  return {
    routes,
    bestRoute,
    isLoading,
    error,
    recommendInternal,
    googleMapsTime,
    refetch: fetchRoutes,
  };
}
