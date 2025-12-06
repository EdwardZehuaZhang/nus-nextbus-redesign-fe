import { useEffect, useRef } from 'react';
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
    // First, try to get the current location immediately
    console.log('[useLocation] Getting current location...');
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      let latitude = currentLocation.coords.latitude;
      let longitude = currentLocation.coords.longitude;
      let heading = currentLocation.coords.heading;
      
      // Check if it's the simulator mock location and replace with test location
      if (isSimulatorMockLocation(latitude, longitude)) {
        console.log('[useLocation] ⚠️ Detected simulator mock location (San Francisco)');
        console.log('[useLocation] 🧪 Using test location instead: NUS Campus', TEST_LOCATION);
        latitude = TEST_LOCATION.latitude;
        longitude = TEST_LOCATION.longitude;
      }
      
      // Simulate heading if not available (simulators typically don't have heading)
      if (!heading || heading < 0) {
        heading = simulatedHeading;
        console.log('[useLocation] 🧪 Using simulated heading:', heading);
      }
      
      console.log('[useLocation] Current location obtained:', { latitude, longitude, heading });
      store.setLocation({
        latitude,
        longitude,
        heading: heading,
        speed: currentLocation.coords.speed,
        accuracy: currentLocation.coords.accuracy ?? undefined,
      });
    } catch (err) {
      console.warn('[useLocation] Failed to get current location immediately:', err);
    }

    // Then start watching for continuous updates
    globalWatchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or when user moves 10 meters
      },
      (location) => {
        let latitude = location.coords.latitude;
        let longitude = location.coords.longitude;
        let heading = location.coords.heading;
        
        // Check if it's the simulator mock location and replace with test location
        if (isSimulatorMockLocation(latitude, longitude)) {
          console.log('[useLocation] ⚠️ Detected simulator mock location from watcher');
          console.log('[useLocation] 🧪 Using test location instead: NUS Campus', TEST_LOCATION);
          latitude = TEST_LOCATION.latitude;
          longitude = TEST_LOCATION.longitude;
        }
        
        // Simulate heading if not available (simulators typically don't have heading)
        if (!heading || heading < 0) {
          // Animate heading for visual effect
          simulatedHeading = (simulatedHeading + HEADING_ANIMATION_SPEED) % 360;
          heading = simulatedHeading;
        }
        
        console.log('[useLocation] Location update from watcher:', { latitude, longitude, heading });
        console.log('[useLocation] Location accuracy (in meters):', location.coords.accuracy);
        store.setLocation({
          latitude,
          longitude,
          heading: heading,
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
