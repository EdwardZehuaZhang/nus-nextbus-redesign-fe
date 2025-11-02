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
}: UseInternalRouteFinderParams): UseInternalRouteFinderResult {
  const [routes, setRoutes] = useState<InternalBusRoute[]>([]);
  const [bestRoute, setBestRoute] = useState<InternalBusRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recommendInternal, setRecommendInternal] = useState(false);
  const [googleMapsTime, setGoogleMapsTime] = useState<number | null>(null);

  const fetchRoutes = async () => {
    if (!origin || !destination || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result: RouteComparison = await findBestRoute(
        origin,
        destination,
        googleMapsTimeSeconds
      );

      setRoutes(result.internalRoutes);
      setBestRoute(result.bestInternalRoute);
      setRecommendInternal(result.recommendInternal);
      setGoogleMapsTime(result.googleMapsTime);
    } catch (err) {
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
