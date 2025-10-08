export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DirectionsRequest {
  origin: string | LatLng;
  destination: string | LatLng;
  waypoints?: (string | LatLng)[];
  mode?: TravelMode;
  alternatives?: boolean;
  departure_time?: number;
}

export interface Route {
  summary: string;
  legs: RouteLeg[];
  overview_polyline: {
    points: string;
  };
  bounds: LatLngBounds;
  copyrights: string;
  warnings: string[];
  waypoint_order: number[];
}

export interface RouteLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  end_address: string;
  end_location: LatLng;
  start_address: string;
  start_location: LatLng;
  steps: RouteStep[];
  traffic_speed_entry: any[];
  via_waypoint: any[];
}

export interface RouteStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  end_location: LatLng;
  html_instructions: string;
  polyline: { points: string };
  start_location: LatLng;
  travel_mode: string;
  maneuver?: string;
}

export interface LatLngBounds {
  northeast: LatLng;
  southwest: LatLng;
}

export interface PlaceAutocompleteResult {
  description: string;
  matched_substrings: {
    length: number;
    offset: number;
  }[];
  place_id: string;
  reference: string;
  structured_formatting: {
    main_text: string;
    main_text_matched_substrings: {
      length: number;
      offset: number;
    }[];
    secondary_text: string;
  };
  terms: {
    offset: number;
    value: string;
  }[];
  types: string[];
}

export interface PlaceDetails {
  geometry: {
    location: LatLng;
    viewport: LatLngBounds;
  };
  name: string;
  formatted_address: string;
  place_id: string;
}

export interface DirectionsResponse {
  routes: Route[];
  status: string;
  error_message?: string;
}

export interface PlaceAutocompleteResponse {
  predictions: PlaceAutocompleteResult[];
  status: string;
  error_message?: string;
}

export interface PlaceDetailsResponse {
  result: PlaceDetails;
  status: string;
  error_message?: string;
}
