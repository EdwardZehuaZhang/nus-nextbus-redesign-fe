import { client } from '@/api/common/client';

import type {
  ActiveBusResponse,
  AnnouncementsResponse,
  BusLocationResponse,
  BusStopsResponse,
  CheckPointResponse,
  PickupPointResponse,
  PublicityResponse,
  RouteCode,
  RouteMinMaxTimeResponse,
  ServiceDescriptionResponse,
  ShuttleServiceResponse,
  TickerTapesResponse,
} from './types';

/**
 * Get publicity information including banners and display frequency
 */
export const getPublicity = async (): Promise<PublicityResponse> => {
  const response = await client.get<PublicityResponse>('/publicity');
  return response.data;
};

/**
 * Get information about all bus stops on campus
 */
export const getBusStops = async (): Promise<BusStopsResponse> => {
  const response = await client.get<BusStopsResponse>('/busstops');
  return response.data;
};

/**
 * Get all pickup points (stops) for a specified route
 * @param routeCode - Bus route code (A1, A2, D1, D2, BTC)
 */
export const getPickupPoints = async (
  routeCode: RouteCode
): Promise<PickupPointResponse> => {
  const response = await client.get<PickupPointResponse>('/pickuppoint', {
    params: { route_code: routeCode },
  });
  return response.data;
};

/**
 * Get all oncoming shuttle bus services at a specified stop
 * @param busStopName - Bus stop code from BusStop.name field (e.g., 'YIH', 'CLB', 'UHC-OPP')
 *                      WARNING: Must use BusStop.name, NOT ShortName, caption, or LongName
 */
export const getShuttleService = async (
  busStopName: string
): Promise<ShuttleServiceResponse> => {
  const response = await client.get<ShuttleServiceResponse>('/shuttleservice', {
    params: { busstopname: busStopName },
  });
  return response.data;
};

/**
 * Get all active buses on a specified route with their current positions
 * @param routeCode - Bus route code
 */
export const getActiveBuses = async (
  routeCode: RouteCode
): Promise<ActiveBusResponse> => {
  const response = await client.get<ActiveBusResponse>('/activebus', {
    params: { route_code: routeCode },
  });
  return response.data;
};

/**
 * Get location information about a specific bus by vehicle plate
 * @param vehiclePlate - Vehicle plate number
 */
export const getBusLocation = async (
  vehiclePlate: string
): Promise<BusLocationResponse> => {
  const response = await client.get<BusLocationResponse>('/buslocation', {
    params: { veh_plate: vehiclePlate },
  });
  return response.data;
};

/**
 * Get the minimum and maximum operating time of a route
 * @param routeCode - Bus route code
 */
export const getRouteMinMaxTime = async (
  routeCode: RouteCode
): Promise<RouteMinMaxTimeResponse> => {
  const response = await client.get<RouteMinMaxTimeResponse>(
    '/routeminmaxtime',
    {
      params: { route_code: routeCode },
    }
  );
  return response.data;
};

/**
 * Get brief path descriptions for all routes
 */
export const getServiceDescriptions =
  async (): Promise<ServiceDescriptionResponse> => {
    const response = await client.get<ServiceDescriptionResponse>(
      '/servicedescription'
    );
    return response.data;
  };

/**
 * Get all system announcements
 */
export const getAnnouncements = async (): Promise<AnnouncementsResponse> => {
  const response = await client.get<AnnouncementsResponse>('/announcements');
  return response.data;
};

/**
 * Get all ticker tape messages
 */
export const getTickerTapes = async (): Promise<TickerTapesResponse> => {
  const response = await client.get<TickerTapesResponse>('/tickertapes');
  return response.data;
};

/**
 * Get all checkpoints (waypoints) of a specified route
 * @param routeCode - Bus route code
 */
export const getCheckpoints = async (
  routeCode: RouteCode
): Promise<CheckPointResponse> => {
  const response = await client.get<CheckPointResponse>('/checkpoint', {
    params: { route_code: routeCode },
  });
  return response.data;
};
