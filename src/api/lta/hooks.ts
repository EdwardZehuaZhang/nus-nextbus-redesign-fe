import { useQuery } from '@tanstack/react-query';

import {
  getAllBusStops,
  getBusArrival,
  getBusRoute,
  getBusRouteWithStopDetails,
  getBusStopByCode,
  getStopsBetween,
  findNearestBusStop,
} from './index';

export const useAllBusStops = () => {
  return useQuery({
    queryKey: ['lta-bus-stops'],
    queryFn: getAllBusStops,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (stops don't change often)
  });
};

export const useBusStopByCode = (busStopCode: string) => {
  return useQuery({
    queryKey: ['lta-bus-stop', busStopCode],
    queryFn: () => getBusStopByCode(busStopCode),
    enabled: !!busStopCode,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useBusRoute = (serviceNo: string, direction?: 1 | 2) => {
  return useQuery({
    queryKey: ['lta-bus-route', serviceNo, direction],
    queryFn: () => getBusRoute(serviceNo, direction),
    enabled: !!serviceNo,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useBusRouteWithStopDetails = (
  serviceNo: string,
  direction?: 1 | 2
) => {
  return useQuery({
    queryKey: ['lta-bus-route-with-stops', serviceNo, direction],
    queryFn: () => getBusRouteWithStopDetails(serviceNo, direction),
    enabled: !!serviceNo,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useBusArrival = (busStopCode: string, serviceNo?: string) => {
  return useQuery({
    queryKey: ['lta-bus-arrival', busStopCode, serviceNo],
    queryFn: () => getBusArrival(busStopCode, serviceNo),
    enabled: !!busStopCode,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });
};

export const useStopsBetween = (
  serviceNo: string,
  fromStopCode: string,
  toStopCode: string,
  direction: 1 | 2,
  enabled = true
) => {
  return useQuery({
    queryKey: [
      'lta-stops-between',
      serviceNo,
      fromStopCode,
      toStopCode,
      direction,
    ],
    queryFn: () =>
      getStopsBetween(serviceNo, fromStopCode, toStopCode, direction),
    enabled: enabled && !!(serviceNo && fromStopCode && toStopCode),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useNearestBusStop = (
  lat: number,
  lng: number,
  maxDistance?: number,
  enabled = true
) => {
  return useQuery({
    queryKey: ['lta-nearest-stop', lat, lng, maxDistance],
    queryFn: () => findNearestBusStop(lat, lng, maxDistance),
    enabled: enabled && !!lat && !!lng,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
