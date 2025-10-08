import { useMutation, useQuery } from '@tanstack/react-query';

import { getDirections } from './directions';
import { getPlaceAutocomplete, getPlaceDetails } from './places';
import type { DirectionsRequest } from './types';

export const useDirections = (params: DirectionsRequest, enabled = true) => {
  return useQuery({
    queryKey: ['google-directions', params],
    queryFn: () => getDirections(params),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePlaceAutocomplete = () => {
  return useMutation({
    mutationFn: ({
      input,
      sessionToken,
      location,
      radius,
    }: {
      input: string;
      sessionToken?: string;
      location?: { lat: number; lng: number };
      radius?: number;
    }) => getPlaceAutocomplete(input, sessionToken, location, radius),
  });
};

export const usePlaceDetails = () => {
  return useMutation({
    mutationFn: (placeId: string) => getPlaceDetails(placeId),
  });
};
