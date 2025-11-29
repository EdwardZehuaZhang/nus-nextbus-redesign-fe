import { Env } from '@env';
import axios from 'axios';

import type { PlaceAutocompleteResponse, PlaceDetailsResponse } from './types';

// Use backend gateway for all Google Maps API calls
const BACKEND_API_URL = Env.BACKEND_API_URL;

export const getPlaceAutocomplete = async (
  input: string,
  sessionToken?: string,
  location?: { lat: number; lng: number },
  radius?: number
): Promise<PlaceAutocompleteResponse> => {
  // Minimal logging to validate integration path
  try {
    // eslint-disable-next-line no-console
    console.log('[places-autocomplete] →', `${BACKEND_API_URL}/api/google/places/autocomplete`, { input, sessionToken, location, radius });
  } catch {}
  const { data } = await axios.get<PlaceAutocompleteResponse>(
    `${BACKEND_API_URL}/api/google/places/autocomplete`,
    {
      params: {
        input,
        sessiontoken: sessionToken,
        location: location ? `${location.lat},${location.lng}` : undefined,
        radius,
      },
    }
  );

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(
      data.error_message || `Places Autocomplete API error: ${data.status}`
    );
  }

  return data;
};

export const getPlaceDetails = async (
  placeId: string
): Promise<PlaceDetailsResponse> => {
  // Minimal logging to validate integration path
  try {
    // eslint-disable-next-line no-console
    console.log('[places-details] →', `${BACKEND_API_URL}/api/google/places/details`, { placeId });
  } catch {}
  const { data } = await axios.get<PlaceDetailsResponse>(
    `${BACKEND_API_URL}/api/google/places/details`,
    {
      params: {
        place_id: placeId,
        fields: 'geometry,name,formatted_address,place_id,photos,rating,user_ratings_total,price_level,opening_hours,types,vicinity',
      },
    }
  );

  if (data.status !== 'OK') {
    throw new Error(
      data.error_message || `Place Details API error: ${data.status}`
    );
  }

  return data;
};

export const findPlaceFromQuery = async (
  input: string,
  inputtype: 'textquery' | 'phonenumber' = 'textquery',
  fields?: string,
  locationbias?: string
): Promise<any> => {
  try {
    // eslint-disable-next-line no-console
    console.log('[places-findplace] →', `${BACKEND_API_URL}/api/google/places/findplace`, { input, inputtype, fields, locationbias });
  } catch {}
  const { data } = await axios.get(
    `${BACKEND_API_URL}/api/google/places/findplace`,
    {
      params: {
        input,
        inputtype,
        fields: fields || 'place_id,name',
        locationbias,
      },
    }
  );

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(
      `Find Place API error: ${data.status}`
    );
  }

  return data;
};
