import { useEffect } from 'react';
import * as Location from 'expo-location';

import { useLocationStore } from '@/lib/store/location-store';

export type LocationCoords = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number;
};

export type LocationState = {
  coords: LocationCoords | null;
  error: string | null;
  loading: boolean;
};

// Global singleton watcher
let globalWatchSubscription: Location.LocationSubscription | null = null;
let activeSubscribers = 0;

/**
 * Initialize the global location watcher (only once)
 */
const initializeLocationWatcher = async () => {
  if (globalWatchSubscription !== null) {
    return;
  }

  const store = useLocationStore.getState();

  console.log('[useLocation] Requesting location permissions...');
  
  // Request location permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    console.error('[useLocation] Location permission denied');
    store.setError('Location permission denied. Please enable location access in Settings.');
    store.setLoading(false);
    return;
  }

  console.log('[useLocation] Location permission granted, starting watcher...');
  
  // Only set loading if we don't have a location yet
  if (!store.coords) {
    store.setLoading(true);
  }

  try {
    globalWatchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or when user moves 10 meters
      },
      (location) => {
        console.log('[useLocation] Location update:', location.coords);
        store.setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
          accuracy: location.coords.accuracy ?? undefined,
        });
      }
    );

    console.log('[useLocation] Watcher initialized successfully');
  } catch (err) {
    console.error('[useLocation] Failed to start location watcher:', err);
    store.setError('Failed to start location tracking');
    store.setLoading(false);
  }
};

/**
 * Hook to get user's current location using expo-location
 * Uses global Zustand store to persist location across navigation
 */
export const useLocation = () => {
  const { coords, error, loading } = useLocationStore();

  useEffect(() => {
    activeSubscribers++;
    console.log('[useLocation] Component mounted, subscribers:', activeSubscribers);

    // Initialize watcher on first mount
    initializeLocationWatcher();

    return () => {
      activeSubscribers--;
      console.log('[useLocation] Component unmounted, subscribers:', activeSubscribers);

      // Only clean up watcher when ALL components are unmounted
      if (activeSubscribers === 0) {
        setTimeout(() => {
          if (activeSubscribers === 0 && globalWatchSubscription !== null) {
            console.log('[useLocation] Clearing global watcher');
            globalWatchSubscription.remove();
            globalWatchSubscription = null;
          }
        }, 1000); // 1 second delay to handle navigation transitions
      }
    };
  }, []);

  return { coords, error, loading };
};
