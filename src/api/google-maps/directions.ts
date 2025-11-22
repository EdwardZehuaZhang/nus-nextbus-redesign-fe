import { Env } from '@env';
import axios from 'axios';

import type { DirectionsRequest, DirectionsResponse, LatLng } from './types';

// Use backend gateway for all Google Maps API calls
const BACKEND_API_URL = Env.BACKEND_API_URL;

const formatLocation = (location: string | LatLng): string => {
  if (typeof location === 'string') {
    return location;
  }
  return `${location.lat},${location.lng}`;
};

export const getDirections = async (
  params: DirectionsRequest
): Promise<DirectionsResponse> => {
  // Minimal logging to validate integration path
  try {
    // eslint-disable-next-line no-console
    console.log('[google-directions] →', `${BACKEND_API_URL}/api/google/directions`, params);
  } catch {}
  const { data } = await axios.get<DirectionsResponse>(
    `${BACKEND_API_URL}/api/google/directions`,
    {
      params: {
        origin: formatLocation(params.origin),
        destination: formatLocation(params.destination),
        waypoints: params.waypoints?.map((wp) => formatLocation(wp)).join('|'),
        mode: params.mode || 'driving',
        alternatives: params.alternatives || false,
        departure_time: params.departure_time,
      },
    }
  );

  if (data.status !== 'OK') {
    throw new Error(
      data.error_message || `Directions API error: ${data.status}`
    );
  }

  return data;
};
