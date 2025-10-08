import { Env } from '@env';
import axios from 'axios';

import type { PlaceAutocompleteResponse, PlaceDetailsResponse } from './types';

const AUTOCOMPLETE_API_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_API_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';

export const getPlaceAutocomplete = async (
  input: string,
  sessionToken?: string,
  location?: { lat: number; lng: number },
  radius?: number
): Promise<PlaceAutocompleteResponse> => {
  const { data } = await axios.get<PlaceAutocompleteResponse>(
    AUTOCOMPLETE_API_URL,
    {
      params: {
        input,
        sessiontoken: sessionToken,
        location: location ? `${location.lat},${location.lng}` : undefined,
        radius,
        key: Env.GOOGLE_MAPS_API_KEY,
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
  const { data } = await axios.get<PlaceDetailsResponse>(
    PLACE_DETAILS_API_URL,
    {
      params: {
        place_id: placeId,
        fields: 'geometry,name,formatted_address,place_id',
        key: Env.GOOGLE_MAPS_API_KEY,
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
