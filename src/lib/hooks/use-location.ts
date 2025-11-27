// This file is used by TypeScript for type checking
// The actual implementation is in use-location.native.ts and use-location.web.ts

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

// This export is implemented in platform-specific files
export declare const useLocation: () => LocationState;
