import { Env } from '@/lib/env';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Location {
  latLng: LatLng;
}

export interface Waypoint {
  location?: Location;
  address?: string;
}

export interface TransitDetails {
  stopDetails: {
    arrivalStop: {
      name: string;
      location: Location;
    };
    departureStop: {
      name: string;
      location: Location;
    };
    arrivalTime: string;
    departureTime: string;
  };
  localizedValues?: {
    arrivalTime: {
      time: {
        text: string;
      };
    };
    departureTime: {
      time: {
        text: string;
      };
    };
  };
  headsign: string;
  headway?: string;
  transitLine: {
    agencies: Array<{
      name: string;
      phoneNumber?: string;
      uri?: string;
    }>;
    name: string;
    color: string;
    nameShort?: string;
    textColor?: string;
    vehicle: {
      name: {
        text: string;
      };
      type: string;
      iconUri?: string;
    };
  };
  stopCount: number;
}

export interface RouteStep {
  distanceMeters: number;
  staticDuration: string;
  polyline: {
    encodedPolyline: string;
  };
  startLocation: Location;
  endLocation: Location;
  navigationInstruction?: {
    maneuver?: string;
    instructions?: string;
  };
  travelMode: 'WALK' | 'TRANSIT' | 'DRIVE' | 'BICYCLE' | 'TWO_WHEELER';
  transitDetails?: TransitDetails;
}

export interface RouteLeg {
  distanceMeters: number;
  duration: string;
  staticDuration: string;
  polyline: {
    encodedPolyline: string;
  };
  startLocation: Location;
  endLocation: Location;
  steps: RouteStep[];
  stepsOverview?: {
    multiModalSegments?: Array<{
      navigationInstruction?: {
        instructions?: string;
      };
      travelMode: string;
      stepStartIndex: number;
      stepEndIndex: number;
    }>;
  };
}

export interface Route {
  legs: RouteLeg[];
  distanceMeters: number;
  duration: string;
  staticDuration: string;
  polyline: {
    encodedPolyline: string;
  };
  description?: string;
  warnings?: string[];
  viewport?: {
    low: LatLng;
    high: LatLng;
  };
  travelAdvisory?: {
    transitFare?: {
      currencyCode: string;
      units: string;
      nanos: number;
    };
  };
  localizedValues?: {
    distance?: {
      text: string;
    };
    duration?: {
      text: string;
    };
    staticDuration?: {
      text: string;
    };
    transitFare?: {
      text: string;
    };
  };
}

export interface ComputeRoutesRequest {
  origin: Waypoint;
  destination: Waypoint;
  travelMode?: 'DRIVE' | 'BICYCLE' | 'WALK' | 'TRANSIT' | 'TWO_WHEELER';
  routingPreference?:
    | 'TRAFFIC_UNAWARE'
    | 'TRAFFIC_AWARE'
    | 'TRAFFIC_AWARE_OPTIMAL';
  computeAlternativeRoutes?: boolean;
  routeModifiers?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
  };
  languageCode?: string;
  units?: 'METRIC' | 'IMPERIAL';
  departureTime?: string; // RFC3339 format
  arrivalTime?: string; // RFC3339 format
  transitPreferences?: {
    allowedTravelModes?: Array<
      'BUS' | 'SUBWAY' | 'TRAIN' | 'LIGHT_RAIL' | 'RAIL'
    >;
    routingPreference?: 'LESS_WALKING' | 'FEWER_TRANSFERS';
  };
}

export interface ComputeRoutesResponse {
  routes: Route[];
}

/**
 * Compute routes using Google Maps Routes API
 * @param request - The route request parameters
 * @returns Promise with route data
 */
export async function computeRoutes(
  request: ComputeRoutesRequest
): Promise<ComputeRoutesResponse> {
  const apiKey = Env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  // Field mask to specify which fields to return
  const fieldMask = [
    'routes.duration',
    'routes.distanceMeters',
    'routes.polyline.encodedPolyline',
    'routes.legs.steps.distanceMeters',
    'routes.legs.steps.staticDuration',
    'routes.legs.steps.polyline',
    'routes.legs.steps.startLocation',
    'routes.legs.steps.endLocation',
    'routes.legs.steps.navigationInstruction',
    'routes.legs.steps.travelMode',
    'routes.legs.steps.transitDetails',
    'routes.legs.stepsOverview',
    'routes.travelAdvisory.transitFare',
    'routes.localizedValues',
    'routes.description',
  ].join(',');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Routes API error: ${response.status} - ${errorText}`
      );
    }

    const data: ComputeRoutesResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error computing routes:', error);
    throw error;
  }
}

/**
 * Get transit route from current location to destination
 * @param origin - Starting location (lat/lng or address)
 * @param destination - Ending location (lat/lng or address)
 * @param departureTime - Optional departure time in RFC3339 format
 * @returns Promise with route data
 */
export async function getTransitRoute(
  origin: Waypoint,
  destination: Waypoint,
  departureTime?: string
): Promise<ComputeRoutesResponse> {
  return computeRoutes({
    origin,
    destination,
    travelMode: 'TRANSIT',
    computeAlternativeRoutes: true,
    languageCode: 'en-US',
    units: 'METRIC',
    departureTime: departureTime || new Date().toISOString(),
    transitPreferences: {
      routingPreference: 'FEWER_TRANSFERS',
      allowedTravelModes: ['BUS', 'SUBWAY', 'TRAIN', 'LIGHT_RAIL', 'RAIL'],
    },
  });
}

/**
 * Get walking route from current location to destination
 */
export async function getWalkingRoute(
  origin: Waypoint,
  destination: Waypoint
): Promise<ComputeRoutesResponse> {
  return computeRoutes({
    origin,
    destination,
    travelMode: 'WALK',
    languageCode: 'en-US',
    units: 'METRIC',
  });
}

/**
 * Convert duration string (e.g., "165s") to minutes
 */
export function durationToMinutes(duration: string): number {
  const seconds = parseInt(duration.replace('s', ''), 10);
  return Math.round(seconds / 60);
}

/**
 * Convert distance in meters to kilometers with one decimal
 */
export function metersToKilometers(meters: number): string {
  return (meters / 1000).toFixed(1);
}

/**
 * Format time from ISO string to display format (e.g., "11:45 AM")
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
