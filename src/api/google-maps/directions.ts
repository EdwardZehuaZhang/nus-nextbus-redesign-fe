import { Env } from '@env';
import axios from 'axios';

import type { DirectionsRequest, DirectionsResponse, LatLng } from './types';

const DIRECTIONS_API_URL =
  'https://maps.googleapis.com/maps/api/directions/json';

const formatLocation = (location: string | LatLng): string => {
  if (typeof location === 'string') {
    return location;
  }
  return `${location.lat},${location.lng}`;
};

export const getDirections = async (
  params: DirectionsRequest
): Promise<DirectionsResponse> => {
  const { data } = await axios.get<DirectionsResponse>(DIRECTIONS_API_URL, {
    params: {
      origin: formatLocation(params.origin),
      destination: formatLocation(params.destination),
      waypoints: params.waypoints?.map((wp) => formatLocation(wp)).join('|'),
      mode: params.mode || 'driving',
      alternatives: params.alternatives || false,
      departure_time: params.departure_time,
      key: Env.GOOGLE_MAPS_API_KEY,
    },
  });

  if (data.status !== 'OK') {
    throw new Error(
      data.error_message || `Directions API error: ${data.status}`
    );
  }

  return data;
};
