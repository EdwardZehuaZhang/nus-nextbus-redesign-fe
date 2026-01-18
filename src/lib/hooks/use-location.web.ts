import { useEffect } from 'react';

import { useLocationStore } from '@/lib/store/location-store';

const debugLog = (...args: any[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const debugWarn = (...args: any[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

export type LocationCoords = {
  latitude: number;
  longitude: number;
  heading?: number | null; // Direction user is facing (0-360 degrees, null if unavailable)
  speed?: number | null; // Speed in meters per second
  accuracy?: number; // Position accuracy in meters
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

// Global singleton watcher
let globalWatchId: number | null = null;
let activeSubscribers = 0;

/**
 * Initialize the global geolocation watcher (only once)
 */
const initializeGeolocationWatcher = () => {
  if (globalWatchId !== null || typeof window === 'undefined' || !navigator.geolocation) {
    return;
  }

  const store = useLocationStore.getState();

  
  // Only set loading if we don't have a location yet
  if (!store.coords) {
    store.setLoading(true);
  }

  globalWatchId = navigator.geolocation.watchPosition(
    (position) => {
      store.setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        accuracy: position.coords.accuracy,
      });
    },
    (err) => {
      // Only set error if we don't have any location yet
      // If we have a cached location, keep using it despite the error
      const currentState = useLocationStore.getState();
      if (!currentState.coords) {
        store.setError(getLocationErrorMessage(err));
      } else {
        // We have a location, just log the error but don't update state
        store.setLoading(false);
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 20000, // Increase timeout to 20 seconds
      maximumAge: 120000, // Accept positions up to 2 minutes old
    }
  );

};

/**
 * Hook to get user's current location using Geolocation API
 * Uses global Zustand store to persist location across navigation
 */
export const useLocation = () => {
  const { coords, error, loading } = useLocationStore();

  useEffect(() => {
    activeSubscribers++;

    // Initialize watcher on first mount
    initializeGeolocationWatcher();

    return () => {
      activeSubscribers--;

      // Only clean up watcher when ALL components are unmounted
      // Keep a small delay to handle quick re-mounts during navigation
      if (activeSubscribers === 0) {
        setTimeout(() => {
          if (activeSubscribers === 0 && globalWatchId !== null) {
            navigator.geolocation.clearWatch(globalWatchId);
            globalWatchId = null;
          }
        }, 1000); // 1 second delay to handle navigation transitions
      }
    };
  }, []);

  return { coords, error, loading };
};
