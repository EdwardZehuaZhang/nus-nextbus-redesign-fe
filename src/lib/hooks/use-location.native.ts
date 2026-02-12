import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

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
  heading?: number | null;
  speed?: number | null;
  accuracy?: number;
};

export type LocationState = {
  coords: LocationCoords | null;
  error: string | null;
  loading: boolean;
};

// Test location for simulator (NUS Campus)
const TEST_LOCATION = {
  latitude: 1.279547,
  longitude: 103.785275,
};

// Simulated heading for testing (animates from 0 to 360 degrees)
// This is only used when heading data is not available
let simulatedHeading = 0;
const HEADING_ANIMATION_SPEED = 1; // degrees per update

// Default San Francisco mock location that simulators return
const SF_MOCK_LOCATION = {
  latitude: 37.785834,
  longitude: -122.406417,
};

// Global singleton watcher
let globalWatchSubscription: Location.LocationSubscription | null = null;
let activeSubscribers = 0;
let initializationStarted = false;

/**
 * Check if location is the default simulator mock location
 */
const isSimulatorMockLocation = (lat: number, lng: number): boolean => {
  return (
    Math.abs(lat - SF_MOCK_LOCATION.latitude) < 0.0001 &&
    Math.abs(lng - SF_MOCK_LOCATION.longitude) < 0.0001
  );
};

/**
 * Initialize the global location watcher (only once)
 */
const initializeLocationWatcher = async () => {
  // If already initialized or already started, don't do it again
  if (initializationStarted || globalWatchSubscription !== null) {
    debugLog('[Location] Initialization already started/completed, skipping');
    return;
  }

  initializationStarted = true;
  const store = useLocationStore.getState();

  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    debugLog('[Location] Permission status:', status);
    
    if (status !== 'granted') {
      store.setError('Location permission denied. Please enable it in settings.');
      debugWarn('[Location] Permission not granted:', status);
      return;
    }
    
    // Clear any previous errors now that we have permission
    debugLog('[Location] Permission granted, clearing any previous errors');
    
    // Only set loading if we don't have a location yet
    if (!store.coords) {
      store.setLoading(true);
    }

    try {
      debugLog('[Location] Requesting current position...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeoutMs: 10000,
      });
      
      debugLog('[Location] Got current position:', currentLocation.coords);
      
      let latitude = currentLocation.coords.latitude;
      let longitude = currentLocation.coords.longitude;
      let heading = currentLocation.coords.heading;
      
      // Check if it's the simulator mock location and replace with test location
      if (isSimulatorMockLocation(latitude, longitude)) {
        latitude = TEST_LOCATION.latitude;
        longitude = TEST_LOCATION.longitude;
        debugLog('[Location] Replaced simulator mock location with test location');
      }
      
      // Simulate heading if not available
      if (!heading || heading < 0) {
        heading = simulatedHeading;
      }
      
      store.setLocation({
        latitude,
        longitude,
        heading: heading,
        speed: currentLocation.coords.speed,
        accuracy: currentLocation.coords.accuracy ?? undefined,
      });
      
      debugLog('[Location] Location set successfully', {
        lat: latitude,
        lng: longitude,
      });
    } catch (err) {
      debugWarn('[Location] Error getting current position:', err);
      // Don't set error here - the watch will try to get location
      // Only set loading to false to prevent infinite loading state
      store.setLoading(false);
    }

    // Then start watching for continuous updates
    debugLog('[Location] Starting location watch...');
    globalWatchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        let latitude = location.coords.latitude;
        let longitude = location.coords.longitude;
        let heading = location.coords.heading;
        
        if (isSimulatorMockLocation(latitude, longitude)) {
          latitude = TEST_LOCATION.latitude;
          longitude = TEST_LOCATION.longitude;
        }
        
        if (!heading || heading < 0) {
          simulatedHeading = (simulatedHeading + HEADING_ANIMATION_SPEED) % 360;
          heading = simulatedHeading;
        }
        
        store.setLocation({
          latitude,
          longitude,
          heading: heading,
          speed: location.coords.speed,
          accuracy: location.coords.accuracy ?? undefined,
        });
        debugLog('[Location] Location watch updated');
      },
      (error) => {
        // Don't set error for watch position errors - these are transient issues
        // that shouldn't prevent the user from seeing the map.
        // Only getCurrentPositionAsync errors indicate a real problem.
        debugWarn('[Location] Watch position error (non-critical):', error);
      }
    );
    
    debugLog('[Location] Location watcher started successfully');

  } catch (err) {
    debugWarn('[Location] Location initialization error:', err);
    // Only set error if permission was actually denied
    // For other errors, the watch might still work
    if (err instanceof Error && err.message?.includes('permission')) {
      store.setError('Location permission denied');
    }
    store.setLoading(false);
  }
};

/**
 * Hook to get user's current location using expo-location
 * Uses global Zustand store to persist location across navigation
 * 
 * IMPORTANT NOTES:
 * - On simulators: Mock location detection is enabled
 *   When San Francisco mock location (37.785834, -122.406417) is detected,
 *   it's automatically replaced with NUS Campus test location (1.279547, 103.785275)
 * - On physical devices: Real GPS location is used
 * - Expo Go app has some limitations with location services
 *   Consider using a Development Build (expo build) for production
 * 
 * To disable mock location replacement and use real location on device:
 * Comment out the isSimulatorMockLocation() check in this file
 */
export const useLocation = () => {
  const { coords, error, loading } = useLocationStore();

  useEffect(() => {
    activeSubscribers++;
    debugLog('[Location] Subscriber count:', activeSubscribers);

    // Initialize watcher on first mount
    initializeLocationWatcher().catch((err) => {
      debugWarn('[Location] Init error:', err);
    });

    return () => {
      activeSubscribers--;
      debugLog('[Location] Subscriber unmounted, count:', activeSubscribers);

      // Clean up watcher when all subscribers are gone
      if (activeSubscribers === 0) {
        setTimeout(() => {
          if (activeSubscribers === 0 && globalWatchSubscription !== null) {
            debugLog('[Location] Cleaning up watcher');
            globalWatchSubscription.remove();
            globalWatchSubscription = null;
            initializationStarted = false; // Allow re-initialization if app remounts
          }
        }, 300);
      }
    };
  }, []);

  return { coords, error, loading };
};
