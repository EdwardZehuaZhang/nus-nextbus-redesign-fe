import { create } from 'zustand';

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
  lastUpdated: number | null;
};

type LocationStore = LocationState & {
  setLocation: (coords: LocationCoords) => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  clearLocation: () => void;
};

/**
 * Global location store using Zustand
 * Persists location data across navigation and component unmounts
 */
export const useLocationStore = create<LocationStore>((set) => ({
  coords: null,
  error: null,
  loading: true,
  lastUpdated: null,

  setLocation: (coords: LocationCoords) =>
    set({
      coords,
      error: null,
      loading: false,
      lastUpdated: Date.now(),
    }),

  setError: (error: string) =>
    set({
      error,
      loading: false,
    }),

  setLoading: (loading: boolean) => set({ loading }),

  clearLocation: () =>
    set({
      coords: null,
      error: null,
      loading: true,
      lastUpdated: null,
    }),
}));
