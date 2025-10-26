import { useEffect, useState } from 'react';

export type LocationCoords = {
  latitude: number;
  longitude: number;
};

export type LocationState = {
  coords: LocationCoords | null;
  error: string | null;
  loading: boolean;
};

/**
 * Get error message from GeolocationPositionError
 */
const getLocationErrorMessage = (error: GeolocationPositionError): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable';
    case error.TIMEOUT:
      return 'Location request timed out';
    default:
      return 'Failed to get location';
  }
};

/**
 * Hook to get user's current location using Geolocation API
 * Works in both web and React Native environments
 */
export const useLocation = () => {
  const [state, setState] = useState<LocationState>({
    coords: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const handleSuccess = (position: GeolocationPosition) => {
      if (isMounted) {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
          loading: false,
        });
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      if (isMounted) {
        setState({
          coords: null,
          error: getLocationErrorMessage(error),
          loading: false,
        });
      }
    };

    const getLocation = () => {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        if (isMounted) {
          setState({
            coords: null,
            error: 'Geolocation is not supported by your browser',
            loading: false,
          });
        }
        return;
      }

      // Get current position
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      });
    };

    getLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
};
