import polyline from '@mapbox/polyline';
import React, { useEffect, useRef, useState, useMemo } from 'react';

import type { ActiveBus, BusStop, RouteCode } from '@/api/bus';
import {
  useActiveBuses,
  useBusStops,
  useCheckpoints,
  usePickupPoints,
  useServiceDescriptions,
} from '@/api/bus';
import type { LatLng } from '@/api/google-maps';
import { findPlaceFromQuery } from '@/api/google-maps/places';
import type { RouteStep } from '@/api/google-routes';
import { createBusMarkerSVG, svgToDataURL } from '@/components/bus-marker-icon';
import {
  getLandmarkMarkerSVG,
  getLandmarkColor,
  NUS_LANDMARKS,
} from '@/components/landmark-marker-icons';
import { MapTypeSelector } from '@/components/map-type-selector';
import { NUS_PRINTERS, type Printer } from '@/data/printer-locations';
import type { CanteenVenue } from '@/data/canteens';
import { NUS_SPORTS_FACILITIES, type SportsFacility, getSportsFacilityColor } from '@/data/sports-facilities';
import { createCircularMarkerSVG, svgToDataURL as circularSvgToDataURL } from '@/components/circular-marker-icon';
import routeCheckpointsData from '@/data/route-checkpoints.json';
import { getBusArrowRotation } from '@/lib/bus-direction';
import { Env } from '@/lib/env';
import { useLocation } from '@/lib/hooks/use-location';
import { getTransitLineColor, PUBLIC_BUS_COLOR } from '@/lib/transit-colors';

// Route fit bounds padding - adjust these to change map zoom and position
const ROUTE_FIT_BOUNDS_PADDING = {
  top: 280,
  right: 220,
  bottom: 520,
  left: 220,
};

// Extend HTMLElement for Google Places UI Kit custom elements
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-details-compact': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-details-place-request': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-content-config': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-standard-content': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-display-name': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-formatted-address': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-rating': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-opening-hours': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'gmp-place-photo-gallery': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export type MapPlaceSelection = {
  name: string;
  address?: string;
  coordinates: { latitude: number; longitude: number };
  stopId?: string;
  type?:
    | 'hospital'
    | 'mrt'
    | 'library'
    | 'bus-terminal'
    | 'bus-stop'
    | 'location'
    | 'google-place';
  photo?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  openNow?: boolean;
};

export type MapSelection =
  | { type: 'place'; place: MapPlaceSelection }
  | { type: 'printer'; printer: Printer }
  | { type: 'sports'; facility: SportsFacility }
  | { type: 'canteen'; canteen: CanteenVenue };

interface InteractiveMapProps {
  origin?: LatLng;
  destination?: LatLng;
  waypoints?: LatLng[];
  routePolyline?: string;
  routeSteps?: RouteStep[]; // Individual route steps for multi-colored rendering
  // Internal route polylines (for NUS shuttle routes)
  internalRoutePolylines?: {
    walkToStop: google.maps.LatLngLiteral[];
    busSegment: google.maps.LatLngLiteral[];
    walkFromStop: google.maps.LatLngLiteral[];
    busRouteColor?: string; // Color for the bus segment
  } | null;
  onMarkerPress?: (
    type: 'origin' | 'destination' | 'waypoint',
    index?: number
  ) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: any;
  showD1Route?: boolean; // Control D1 bus route visibility
  activeRoute?: RouteCode | null; // Active route code to show live buses
  onActiveRouteChange?: (route: RouteCode | null) => void; // Callback when filter route changes
  showLandmarks?: boolean; // Control landmark visibility (default true)
  showUserLocation?: boolean; // Control user location marker visibility (default true)
  showMapControls?: boolean; // Control map type/layer controls visibility (default true)
  showBusStops?: boolean; // Control bus stop markers visibility (default false)
  visibleBusStops?: string[]; // Array of bus stop short names to display (if provided, only these stops will be shown)
  visibleBusStopsColor?: string; // Optional color override for visible bus stops (internal routes)
  mapFilters?: Record<string, boolean>; // External map filters state
  onMapFiltersChange?: (filters: Record<string, boolean>) => void; // Callback when filters change
  onMapTypeChangeReady?: (
    handler: (mapType: google.maps.MapTypeId | 'dark' | 'light') => void
  ) => void; // Callback to receive map type change handler
  enablePlaceDetails?: boolean; // Control place details compact element visibility (default true)
  onMapItemSelect?: (selection: MapSelection | null) => void;
  selectedMapItem?: MapSelection | null;
  forceResetCenter?: boolean; // Force reset map center to initial region
  showRouteConnectors?: boolean; // Control route connector dotted lines (default false)
}

// Use a campus-centered starting point. The user provided a screen-centered
// coordinate to try first so the map appears higher on the screen (accounts
// for the bottom panel overlay).
const DEFAULT_REGION = {
  latitude: 1.295123780071173,
  longitude: 103.77776037392553,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const isValidInitialRegion = (region: {
  latitude: number;
  longitude: number;
}): boolean => {
  return (
    typeof region.latitude === 'number' &&
    typeof region.longitude === 'number' &&
    !isNaN(region.latitude) &&
    !isNaN(region.longitude) &&
    region.latitude >= 1.1 &&
    region.latitude <= 1.5 &&
    region.longitude >= 103.6 &&
    region.longitude <= 104.1
  );
};

const PADDING = { top: 50, right: 50, bottom: 50, left: 50 };

// Residence overlay stroke weight - adjust this to make boundary lines thinner/thicker
const RESIDENCE_STROKE_WEIGHT = 1;

// Academic overlay stroke weight - adjust this to make boundary lines thinner/thicker
const ACADEMIC_STROKE_WEIGHT = 2;

// Bus route stroke weight - adjust this to make bus route lines thinner/thicker
const BUS_ROUTE_STROKE_WEIGHT = 3;

// Dark mode styles for Google Maps
const DARK_MODE_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

// Load Google Maps script and return a promise
const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    // Check if already loaded
    if (window.google?.maps?.Map) {
      resolve();
      return;
    }

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      // Script is loading, wait for it
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.Map) {
          reject(new Error('Google Maps failed to load in time'));
        }
      }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Env.GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.addEventListener('load', () => {
      // Wait for google.maps.Map to be available
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.Map) {
          reject(new Error('Google Maps Map constructor not available'));
        }
      }, 10000);
    });
    script.addEventListener('error', () => {
      reject(new Error('Failed to load Google Maps'));
    });

    document.head.appendChild(script);
  });
};


// Create marker with custom color
const createMarker = ({
  position,
  map,
  title,
  color,
  scale,
  onClick,
}: {
  position: { lat: number; lng: number };
  map: google.maps.Map;
  title: string;
  color: string;
  scale: number;
  onClick?: () => void;
}): google.maps.Marker | null => {
  // Validate coordinates
  if (
    typeof position.lat !== 'number' ||
    typeof position.lng !== 'number' ||
    isNaN(position.lat) ||
    isNaN(position.lng)
  ) {
    console.warn(`Invalid coordinates for marker "${title}":`, position);
    return null;
  }

  const marker = new google.maps.Marker({
    position,
    map,
    title,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    },
  });
  if (onClick) {
    marker.addListener('click', onClick);
  }
  return marker;
};

// Create SVG for user location marker with directional arrow
const createUserLocationSVG = (heading: number = 0): string => {
  return `
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer glow -->
      <circle cx="24" cy="24" r="20" fill="#4285F4" opacity="0.2"/>
      <!-- Main circle -->
      <circle cx="24" cy="24" r="12" fill="#4285F4" stroke="white" stroke-width="3"/>
      <!-- Directional arrow -->
      <g transform="rotate(${heading} 24 24)">
        <path d="M 24 8 L 28 18 L 24 16 L 20 18 Z" fill="white"/>
      </g>
    </svg>
  `;
};

// Create SVG for destination marker (pin only, no circle)
const createDestinationPinSVG = (): string => {
  return `
    <svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <!-- Pin shape -->
      <path d="M 12 0 C 5.373 0 0 5.373 0 12 C 0 21 12 36 12 36 S 24 21 24 12 C 24 5.373 18.627 0 12 0 Z" 
            fill="#274F9C" stroke="white" stroke-width="1.5"/>
      <!-- Inner circle -->
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>
  `;
};

// Helper to add coordinate listener for development
const addCoordinateListener = (map: google.maps.Map) => {
  map.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      const coordString = `{ lat: ${lat}, lng: ${lng} },`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(coordString).then(() => {
        console.log('Coordinates copied to clipboard:', coordString);
      }).catch((err) => {
        console.error('Failed to copy coordinates:', err);
        console.log(coordString); // Fallback: still log it
      });
    }
  });
};

// Helper to prevent default context menu
const preventContextMenu = (container: HTMLDivElement) => {
  container.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    return false;
  });
};

// Helper to create the map instance
const createMapInstance = (
  container: HTMLDivElement,
  initialRegion: { latitude: number; longitude: number }
): google.maps.Map => {
  const options: any = {
    center: {
      lat: initialRegion.latitude,
      lng: initialRegion.longitude,
    },
    // Increase default zoom to show a campus-centered view (matches screenshot)
    zoom: 16,
    disableDefaultUI: true, // Disable all default UI controls
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: false, // disables zoom buttons
    rotateControl: false, // disables camera control
    tiltControl: false, // disables camera tilt
    gestureHandling: 'greedy',
    clickableIcons: false, // Disable clicking on POI icons
    styles: [
      // Light mode by default - only hide POIs and transit labels
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'poi.business',
        stylers: [{ visibility: 'off' }],
      },
      // Hide transit (MRT/LRT) station names and transit line labels to
      // avoid map clutter on the campus map.
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit.station',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit.station.rail',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit.line',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };

  return new google.maps.Map(container, options);
};

// Apply a vertical pixel offset so that a given LatLng appears higher on the
// viewport (useful when a bottom panel / sheet covers the lower portion of
// the screen). This uses an OverlayView projection to convert between
// container pixels and LatLngs. Positive `offsetY` moves the map content down
// so the target point appears higher; typical values: 80..160.
const applyVerticalOffset = (
  map: google.maps.Map,
  target: { lat: number; lng: number },
  offsetY: number = 120
) => {
  try {
    const ov = new google.maps.OverlayView();
    ov.onAdd = function () {};
    ov.draw = function () {
      const proj: any = ov.getProjection?.();
      if (!proj) return;
      // fromLatLngToContainerPixel / fromContainerPixelToLatLng exist on the
      // projection; cast to any to avoid TS issues in this file.
      const point = proj.fromLatLngToContainerPixel(
        new google.maps.LatLng(target.lat, target.lng)
      );
      const shiftedPoint = new google.maps.Point(point.x, point.y + offsetY);
      const newCenter = proj.fromContainerPixelToLatLng(shiftedPoint);
      if (newCenter) {
        map.setCenter(newCenter);
      }
      // remove the overlay once done
      ov.setMap(null);
    };
    ov.setMap(map);
  } catch (err) {
    // If projection utilities aren't available for some reason, fall back to
    // a simple pixel pan which is less accurate but often good enough.
    try {
      map.panBy(0, offsetY);
    } catch (e) {
      // ignore
    }
  }
};

// Custom hooks
const useGoogleMapsInit = (
  mapContainerRef: React.RefObject<HTMLDivElement | null>,
  initialRegion: { latitude: number; longitude: number },
  hasRoutePolyline: boolean = false
) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isMapCreated, setIsMapCreated] = React.useState(false);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !window.google) {
      console.log('[MAP INIT] ⏸️ Not ready - isLoaded:', isLoaded, 'hasContainer:', !!mapContainerRef.current, 'hasGoogle:', !!window.google);
      return;
    }

    if (!mapRef.current) {
      console.log('[MAP INIT] 🗺️ Creating map instance with initialRegion:', {
        lat: initialRegion.latitude,
        lng: initialRegion.longitude,
        hasRoutePolyline
      });
      try {
        mapRef.current = createMapInstance(
          mapContainerRef.current,
          initialRegion
        );
        console.log('[MAP INIT] ✅ Map instance created successfully at:', {
          lat: initialRegion.latitude,
          lng: initialRegion.longitude
        });
        addCoordinateListener(mapRef.current);
        // Move the chosen target slightly upward on the viewport so it isn't
        // obscured by the bottom panel. Offset value can be tuned if needed.
        // Skip vertical offset if we have a route polyline (it will fitBounds instead)
        if (!hasRoutePolyline) {
          console.log('[MAP INIT] 📍 Applying vertical offset to:', {
            lat: initialRegion.latitude,
            lng: initialRegion.longitude
          });
          try {
            applyVerticalOffset(
              mapRef.current,
              { lat: initialRegion.latitude, lng: initialRegion.longitude },
              200 // increase offset so the focal point appears higher on the viewport
            );
          } catch (e) {
            console.error('[MAP INIT] ❌ Error applying vertical offset:', e);
          }
        } else {
          console.log('[MAP INIT] ⏭️ Skipping vertical offset (has route polyline)');
        }
        if (mapContainerRef.current) {
          preventContextMenu(mapContainerRef.current);
        }
        setIsMapCreated(true);
      } catch (error) {
        console.error('[MAP INIT] ❌ Error creating map:', error);
      }
    } else {
      console.log('[MAP INIT] ℹ️ Map already exists, initialRegion changed to:', {
        lat: initialRegion.latitude,
        lng: initialRegion.longitude
      });
    }
  }, [isLoaded, initialRegion, mapContainerRef, hasRoutePolyline]);

  // Pan to new center when initialRegion changes (after map is already created)
  // Skip this if we have a route polyline (the polyline hook will handle bounds)
  useEffect(() => {
    if (mapRef.current && isMapCreated && !hasRoutePolyline) {
      console.log('[MAP PAN] 📍 Panning to new center:', {
        lat: initialRegion.latitude,
        lng: initialRegion.longitude,
        zoom: 15
      });
      mapRef.current.panTo({
        lat: initialRegion.latitude,
        lng: initialRegion.longitude,
      });
      mapRef.current.setZoom(15); // Zoom level for city-scale view
    } else {
      console.log('[MAP PAN] ⏭️ Skipping pan - mapCreated:', isMapCreated, 'hasRoutePolyline:', hasRoutePolyline);
    }
  }, [
    initialRegion.latitude,
    initialRegion.longitude,
    isMapCreated,
    hasRoutePolyline,
  ]);

  return { mapRef, isMapCreated };
};

// Hook to dynamically control Google Maps POI visibility based on zoom level
const usePOIVisibilityControl = (
  mapRef: React.RefObject<google.maps.Map | null>,
  isMapCreated: boolean
) => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapCreated) {
      return;
    }

    const updatePOIVisibility = () => {
      const zoom = map.getZoom() || 16;
      console.log('Current zoom level:', zoom);
      const showDetails = zoom >= 16; // Show POIs and road labels when zoomed in to 17 or more

      // Update map styles dynamically
      map.setOptions({
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: showDetails ? 'on' : 'off' }],
          },
          {
            featureType: 'poi.business',
            stylers: [{ visibility: showDetails ? 'on' : 'off' }],
          },
          // Control road labels based on zoom level
          {
            featureType: 'road',
            elementType: 'labels',
            stylers: [{ visibility: showDetails ? 'on' : 'off' }],
          },
          {
            featureType: 'road.arterial',
            elementType: 'labels',
            stylers: [{ visibility: showDetails ? 'on' : 'off' }],
          },
          {
            featureType: 'road.local',
            elementType: 'labels',
            stylers: [{ visibility: showDetails ? 'on' : 'off' }],
          },
          // Always hide transit labels to avoid clutter
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit.station',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit.station.rail',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit.line',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });
    };

    // Set up zoom change listener
    const zoomListener = map.addListener('zoom_changed', updatePOIVisibility);

    // Initial update
    updatePOIVisibility();

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
    };
  }, [mapRef, isMapCreated]);
};

// Control tilt (45-degree view) based on zoom level for satellite/hybrid views
// Only enable tilt at zoom level 19+, not at 18
const useTiltControl = (
  mapRef: React.RefObject<google.maps.Map | null>,
  isMapCreated: boolean
) => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapCreated) {
      return;
    }

    const updateTilt = () => {
      const zoom = map.getZoom() || 16;
      const mapTypeId = map.getMapTypeId();

      // Only control tilt for satellite and hybrid views
      if (mapTypeId === 'satellite' || mapTypeId === 'hybrid') {
        // Enable 45-degree tilt only at zoom level 19 or higher
        // At zoom 18 and below, keep it top-down (tilt = 0)
        if (zoom >= 19) {
          map.setTilt(45);
        } else {
          map.setTilt(0);
        }
      }
    };

    // Set up listeners for both zoom and map type changes
    const zoomListener = map.addListener('zoom_changed', updateTilt);
    const mapTypeListener = map.addListener('maptypeid_changed', updateTilt);

    // Initial update
    updateTilt();

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      if (mapTypeListener) {
        google.maps.event.removeListener(mapTypeListener);
      }
    };
  }, [mapRef, isMapCreated]);
};

// Test coordinates - simple flight path to verify polyline works
const TEST_FLIGHT_PATH = [
  { lat: 37.772, lng: -122.214 },
  { lat: 21.291, lng: -157.821 },
  { lat: -18.142, lng: 178.431 },
  { lat: -27.467, lng: 153.027 },
];

// D1 Bus Route coordinates
const D1_BUS_ROUTE = [
  { lat: 1.2949541686155464, lng: 103.77491826760742 },
  { lat: 1.2937561736900154, lng: 103.77551215178298 },
  { lat: 1.2936869518922478, lng: 103.77529588882628 },
  { lat: 1.2929602934013178, lng: 103.77501780452884 },
  { lat: 1.292158989996859, lng: 103.7744551716275 },
  { lat: 1.2921566965905673, lng: 103.77423303781495 },
  { lat: 1.2920065310772417, lng: 103.7739353126143 },
  { lat: 1.2923712187370453, lng: 103.77383875308976 },
  { lat: 1.292566956791713, lng: 103.77357814080361 },
  { lat: 1.2929916511433355, lng: 103.77314572241487 },
  { lat: 1.293229396673516, lng: 103.77267233718433 },
  { lat: 1.293376880588864, lng: 103.77221367944279 },
  { lat: 1.2934768636931604, lng: 103.77159448855555 },
  { lat: 1.293712518448038, lng: 103.77112993804909 },
  { lat: 1.2939524834386242, lng: 103.77085210563737 },
  { lat: 1.2942152728796417, lng: 103.77068312646944 },
  { lat: 1.294439607043673, lng: 103.77061441301814 },
  { lat: 1.2947453008219179, lng: 103.7705527222108 },
  { lat: 1.2948438647109488, lng: 103.77054747717735 },
  { lat: 1.295103921349946, lng: 103.77057098490539 },
  { lat: 1.2953459044569542, lng: 103.77064155442679 },
  { lat: 1.2957040001870481, lng: 103.77083869096455 },
  { lat: 1.296060690757129, lng: 103.77091469489042 },
  { lat: 1.296275212573389, lng: 103.77095761023466 },
  { lat: 1.2963891418438507, lng: 103.77095275889945 },
  { lat: 1.2963489190065125, lng: 103.77136593546682 },
  { lat: 1.2963517861689915, lng: 103.77171175474223 },
  { lat: 1.2964642657845618, lng: 103.77205565495309 },
  { lat: 1.2966278386450367, lng: 103.77224877400216 },
  { lat: 1.2965847621065358, lng: 103.7722131554766 },
  { lat: 1.29681738008391, lng: 103.7724538796665 },
  { lat: 1.2971117604169717, lng: 103.77266682167222 },
  { lat: 1.297435637718687, lng: 103.77294808010255 },
  { lat: 1.297845590776186, lng: 103.77310019232586 },
  { lat: 1.2980797492028047, lng: 103.77339313066791 },
  { lat: 1.2983881240618946, lng: 103.77380350864719 },
  { lat: 1.2986095996097373, lng: 103.774010785103 },
  { lat: 1.2989212228716098, lng: 103.77421879662069 },
  { lat: 1.2992380572524882, lng: 103.77437591343448 },
  { lat: 1.2996159704011512, lng: 103.77451167762689 },
  { lat: 1.29996182939063, lng: 103.77451223685212 },
  { lat: 1.3002541149098095, lng: 103.77440763070054 },
  { lat: 1.3004766809246537, lng: 103.77428961350388 },
  { lat: 1.3005525393881083, lng: 103.77411788162253 },
  { lat: 1.3008727834412983, lng: 103.77365178756841 },
  { lat: 1.3010068593233364, lng: 103.77328700714239 },
  { lat: 1.3010309929813564, lng: 103.77312339239248 },
  { lat: 1.3011248460936369, lng: 103.77315289669164 },
  { lat: 1.30116238733759, lng: 103.77332724027761 },
  { lat: 1.3010524451216123, lng: 103.77362496547826 },
  { lat: 1.3009264137949659, lng: 103.77393341951498 },
  { lat: 1.300784293355259, lng: 103.77412653856405 },
  { lat: 1.3009398213832142, lng: 103.7743893950475 },
  { lat: 1.3011302091285164, lng: 103.77446449689992 },
  { lat: 1.3013774609209796, lng: 103.77445951382145 },
  { lat: 1.3017190067734987, lng: 103.77432732189149 },
  { lat: 1.3023779219759775, lng: 103.77403172342235 },
  { lat: 1.3027319968149764, lng: 103.7739530401905 },
  { lat: 1.3030028298896226, lng: 103.77403350646095 },
  { lat: 1.3032395038184654, lng: 103.77417333171068 },
  { lat: 1.3034360912125265, lng: 103.7743634804962 },
  { lat: 1.303588930054782, lng: 103.77462789346664 },
  { lat: 1.303629152776793, lng: 103.77510800888031 },
  { lat: 1.3036895166000186, lng: 103.7754981224966 },
  { lat: 1.3038261441205856, lng: 103.7755342891918 },
  { lat: 1.30384893699433, lng: 103.7756603530155 },
  { lat: 1.3037926251882395, lng: 103.77571667940481 },
  { lat: 1.3037162020208382, lng: 103.77570326835973 },
  { lat: 1.3036545271822855, lng: 103.77561341435774 },
  { lat: 1.3036746385428457, lng: 103.77551149041517 },
  { lat: 1.3036030770764226, lng: 103.77519594148107 },
  { lat: 1.3034904534519904, lng: 103.77500550464102 },
  { lat: 1.303473525743043, lng: 103.77476026220165 },
  { lat: 1.303418554686064, lng: 103.77449472350918 },
  { lat: 1.3033139932398916, lng: 103.77427879086929 },
  { lat: 1.3031054231722363, lng: 103.77409675361957 },
  { lat: 1.3030088886182452, lng: 103.7740296983942 },
  { lat: 1.3028412938976746, lng: 103.77400153519955 },
  { lat: 1.3026031748171862, lng: 103.77398507309651 },
  { lat: 1.3023886535383127, lng: 103.7740548105309 },
  { lat: 1.302246619454062, lng: 103.77411691960793 },
  { lat: 1.3017050465825253, lng: 103.7743688049343 },
  { lat: 1.3014368948855464, lng: 103.77448145771292 },
  { lat: 1.3011677447618055, lng: 103.77450439368388 },
  { lat: 1.3008635864447922, lng: 103.7744072217999 },
  { lat: 1.3008635864447922, lng: 103.7744072217999 },
  { lat: 1.3005577756013214, lng: 103.77434316424724 },
  { lat: 1.3004054640507332, lng: 103.77447926290735 },
  { lat: 1.3001520605673014, lng: 103.77459862120851 },
  { lat: 1.2998609293337038, lng: 103.77463830099713 },
  { lat: 1.2996237843583898, lng: 103.77467516392747 },
  { lat: 1.2994988447681044, lng: 103.77474069965551 },
  { lat: 1.2992896862640684, lng: 103.77477288616369 },
  { lat: 1.2992376778515882, lng: 103.77464139390793 },
  { lat: 1.2992023711240488, lng: 103.77450594235268 },
  { lat: 1.2991433776946506, lng: 103.77441742945518 },
  { lat: 1.2988533483799471, lng: 103.77426680045423 },
  { lat: 1.2987063663315235, lng: 103.77417203546094 },
  { lat: 1.2985240229640997, lng: 103.77401110292004 },
  { lat: 1.2982780546546064, lng: 103.7737248383048 },
  { lat: 1.2981463680081078, lng: 103.7735306553492 },
  { lat: 1.2978755344123467, lng: 103.77317123934121 },
  { lat: 1.2978755344123467, lng: 103.77317123934121 },
  { lat: 1.2974253952461479, lng: 103.77297552166989 },
  { lat: 1.296984141988323, lng: 103.77275089330755 },
  { lat: 1.2966248180364428, lng: 103.77247666956511 },
  { lat: 1.296375784471599, lng: 103.7721067872154 },
  { lat: 1.296251253552375, lng: 103.771722723362 },
  { lat: 1.2962673426880174, lng: 103.77108703982547 },
  { lat: 1.2961788524407367, lng: 103.77097975146488 },
  { lat: 1.2957724010832452, lng: 103.77090080678208 },
  { lat: 1.2956595034812397, lng: 103.7708731088678 },
  { lat: 1.2953473990741131, lng: 103.7707094941179 },
  { lat: 1.2951409217506769, lng: 103.77060757017533 },
  { lat: 1.295009332061492, lng: 103.77062069349252 },
  { lat: 1.2948993895779914, lng: 103.77073602848016 },
  { lat: 1.2947995028429624, lng: 103.77075204722705 },
  { lat: 1.2944669938263527, lng: 103.77079228036227 },
  { lat: 1.294349796625622, lng: 103.7708236767887 },
  { lat: 1.2941307944675133, lng: 103.77091730179104 },
  { lat: 1.2938143745144493, lng: 103.77130353988919 },
  { lat: 1.2938143745144493, lng: 103.77130353988919 },
  { lat: 1.2935755154858273, lng: 103.77217628419358 },
  { lat: 1.2934339041367455, lng: 103.7721964479735 },
  { lat: 1.2932843067076605, lng: 103.7725896212637 },
  { lat: 1.2931917940674906, lng: 103.77282565565702 },
  { lat: 1.2932104591923195, lng: 103.77320137608498 },
  { lat: 1.2932104591923195, lng: 103.77320137608498 },
  { lat: 1.2927787334967482, lng: 103.77354469883889 },
  { lat: 1.292730045671177, lng: 103.77346989226791 },
  { lat: 1.2923903959903105, lng: 103.77386085395541 },
  { lat: 1.2923179947684342, lng: 103.77403653864589 },
  { lat: 1.2922241413296127, lng: 103.77421758775439 },
  { lat: 1.2922241413296127, lng: 103.77421758775439 },
  { lat: 1.292512844821077, lng: 103.77468678676368 },
  { lat: 1.2928666775438622, lng: 103.77492104279938 },
  { lat: 1.2929843602452984, lng: 103.77499272581862 },
  { lat: 1.2936859324952368, lng: 103.7752584200203 },
  { lat: 1.2937607775220779, lng: 103.77534787113605 },
  { lat: 1.2937607775220779, lng: 103.77534787113605 },
  { lat: 1.2937953690843786, lng: 103.77545907054424 },
  { lat: 1.2949434575337568, lng: 103.7749126471301 },
];

// NUS campus boundary coordinates - manually obtained by user
const NUS_CAMPUS_BOUNDARY = [
  { lat: 1.2943662309653878, lng: 103.78561449648741 }, // Start - Northeast
  { lat: 1.295629533832989, lng: 103.78570662970284 }, // East side
  { lat: 1.2964131927699438, lng: 103.78474048652491 },
  { lat: 1.2971829857279495, lng: 103.78386032960005 },
  { lat: 1.2980348448645642, lng: 103.78261664943643 },
  { lat: 1.299016774461335, lng: 103.78136595028842 }, // East moving north
  { lat: 1.3029143562052712, lng: 103.77446862100085 }, // North section
  { lat: 1.303151281280304, lng: 103.77460154905552 },
  { lat: 1.3034087067348328, lng: 103.77534183874363 },
  { lat: 1.3035588715711455, lng: 103.77612504377598 },
  { lat: 1.303773392750353, lng: 103.77621087446445 },
  { lat: 1.304245339280276, lng: 103.77533110990757 },
  { lat: 1.3046138571244286, lng: 103.77495691134023 },
  { lat: 1.3055309346530188, lng: 103.77449557138966 },
  { lat: 1.3066008972191312, lng: 103.77416548860828 },
  { lat: 1.3077047227793976, lng: 103.77381428625108 },
  { lat: 1.3084233674722994, lng: 103.77384647275926 },
  { lat: 1.3087451486113482, lng: 103.77318128492357 },
  { lat: 1.3089923524537435, lng: 103.77225779681622 },
  { lat: 1.3088830354209653, lng: 103.7721214242881 }, // Northernmost
  { lat: 1.3087339734818089, lng: 103.77190715566871 }, // West side - detailed
  { lat: 1.3078222601432248, lng: 103.77176768079994 },
  { lat: 1.3069480876310884, lng: 103.7715799261689 },
  { lat: 1.3063560101595701, lng: 103.77149302273688 },
  { lat: 1.3055569194945853, lng: 103.77151984482703 },
  { lat: 1.304473588120397, lng: 103.77149302273688 },
  { lat: 1.3037171894968482, lng: 103.77150484046012 },
  { lat: 1.302750677686299, lng: 103.77118372403778 },
  { lat: 1.3020698524027086, lng: 103.77099060498871 },
  { lat: 1.3012472030893474, lng: 103.77056795468503 },
  { lat: 1.3004963781296934, lng: 103.77021390309507 },
  { lat: 1.300017465449572, lng: 103.77005612296252 },
  { lat: 1.2995616072428888, lng: 103.77004002970843 },
  { lat: 1.299193641975826, lng: 103.7700115678755 },
  { lat: 1.2981468814221626, lng: 103.76995129279705 },
  { lat: 1.2973209729406299, lng: 103.7698708265266 },
  { lat: 1.2966563051388456, lng: 103.76984400443645 },
  { lat: 1.2961151920525682, lng: 103.76989764861675 },
  { lat: 1.2954716265086261, lng: 103.76988691978069 },
  { lat: 1.2950290338877501, lng: 103.76983627542921 },
  { lat: 1.2946107161234566, lng: 103.76973435148665 },
  { lat: 1.2940529589970695, lng: 103.76949831709334 },
  { lat: 1.2934862064901609, lng: 103.76941101238496 },
  { lat: 1.2929552643776931, lng: 103.76980261490114 },
  { lat: 1.2926311430419277, lng: 103.77020755977628 },
  { lat: 1.2924327100773505, lng: 103.77058664571788 },
  { lat: 1.2924112578640436, lng: 103.77112308752086 },
  { lat: 1.2923917629470145, lng: 103.7727573735903 },
  { lat: 1.2922952279841184, lng: 103.77346211262126 },
  { lat: 1.2919359033677567, lng: 103.77371960468669 },
  { lat: 1.2916087570310637, lng: 103.77399319000621 },
  { lat: 1.2910784461615918, lng: 103.7750322099925 },
  { lat: 1.2906846450955234, lng: 103.77637263420257 },
  { lat: 1.2905452056098337, lng: 103.77699490669403 },
  { lat: 1.290390516588578, lng: 103.77721288070991 },
  { lat: 1.2901116375773143, lng: 103.77799072132423 },
  { lat: 1.2901623392994492, lng: 103.77831545051404 }, // South section
  { lat: 1.2904217289875417, lng: 103.77870809330916 },
  { lat: 1.2909848499678647, lng: 103.7793625523088 },
  { lat: 1.289969836877281, lng: 103.78045863684501 },
  { lat: 1.289664414595522, lng: 103.78177655326904 },
  { lat: 1.2902114465695746, lng: 103.78260267364563 },
  { lat: 1.2914664018302138, lng: 103.783750659104 },
  { lat: 1.2921070604282177, lng: 103.7845809194438 },
  { lat: 1.293134899847743, lng: 103.78561799160155 },
  { lat: 1.2943662309653878, lng: 103.78561449648741 }, // Close the loop back to start
];

// Orange area boundary coordinates
const ORANGE_AREA_BOUNDARY = [
  { lat: 1.3010537146934977, lng: 103.77647036235194 },
  { lat: 1.3006808807897483, lng: 103.77724360151856 },
  { lat: 1.3002721790822405, lng: 103.77784173412888 },
  { lat: 1.299756158295517, lng: 103.77861048577994 },
  { lat: 1.299346134027396, lng: 103.77931291426627 },
  { lat: 1.298903643242334, lng: 103.7800039074017 },
  { lat: 1.2987721506544276, lng: 103.78023145366478 },
  { lat: 1.298171490115871, lng: 103.78026364017296 },
  { lat: 1.2977746250389015, lng: 103.78012416530419 },
  { lat: 1.2974313903275074, lng: 103.78009197879601 },
  { lat: 1.2972671409671992, lng: 103.77955049036099 },
  { lat: 1.2972832300963788, lng: 103.77883702276303 },
  { lat: 1.2974602105106123, lng: 103.77834886072232 },
  { lat: 1.2978517125950928, lng: 103.7775332526938 },
  { lat: 1.2982146380617559, lng: 103.77703598509963 },
  { lat: 1.2986293792042596, lng: 103.77671389733325 },
  { lat: 1.2988517744058754, lng: 103.77650126021773 },
  { lat: 1.2989054048024804, lng: 103.77624913257033 },
  { lat: 1.2989429460794093, lng: 103.7759031276074 },
  { lat: 1.2989244084127014, lng: 103.7755543536351 },
  { lat: 1.2989868019135127, lng: 103.77526743567576 },
  { lat: 1.2991369670130861, lng: 103.77499653256525 },
  { lat: 1.29922372123066, lng: 103.77490801966776 },
  { lat: 1.2994516503747702, lng: 103.77489460862269 },
  { lat: 1.2997351720763195, lng: 103.7750084928118 },
  { lat: 1.3000274576217574, lng: 103.77508359466422 },
  { lat: 1.3002124823990608, lng: 103.7751694253527 },
  { lat: 1.3003993579258157, lng: 103.7754662722588 },
  { lat: 1.300672872768943, lng: 103.77553332748417 },
  { lat: 1.3010244780494662, lng: 103.77565670909885 },
  { lat: 1.30112101267946, lng: 103.77570230665211 },
  { lat: 1.3011183311620012, lng: 103.77584714593891 },
];

// Blue area boundary coordinates
const BLUE_AREA_BOUNDARY = [
  { lat: 1.3029588914483468, lng: 103.7740572529275 },
  { lat: 1.303072855854243, lng: 103.77411760263034 },
  { lat: 1.3031626866175896, lng: 103.77421282105037 },
  { lat: 1.3032806732869775, lng: 103.77431340388843 },
  { lat: 1.3033410073771567, lng: 103.77442069224902 },
  { lat: 1.3033751151414301, lng: 103.77448163093017 },
  { lat: 1.303407293321815, lng: 103.77473509968208 },
  { lat: 1.3034488568042093, lng: 103.77490944326804 },
  { lat: 1.3034837164986053, lng: 103.77505294145034 },
  { lat: 1.303515385823726, lng: 103.77517220682535 },
  { lat: 1.3035676753637424, lng: 103.77528351849946 },
  { lat: 1.3035985127842655, lng: 103.7754337222043 },
  { lat: 1.3036226464174645, lng: 103.77551687068376 },
  { lat: 1.3036186241452838, lng: 103.77568182653818 },
  { lat: 1.3036963866905322, lng: 103.77575155844127 },
  { lat: 1.3037004089625983, lng: 103.77583738912975 },
  { lat: 1.303681638359597, lng: 103.7759366308633 },
  { lat: 1.3036789568448608, lng: 103.77604794253742 },
  { lat: 1.303803647276561, lng: 103.77603050817882 },
  { lat: 1.303792921218163, lng: 103.77590712656414 },
  { lat: 1.3038197363640753, lng: 103.77574887623226 },
  { lat: 1.3038733666550224, lng: 103.77566840996181 },
  { lat: 1.3039189524014427, lng: 103.77559330810939 },
  { lat: 1.3039028633145644, lng: 103.77556380381023 },
  { lat: 1.304010123891802, lng: 103.77542164673244 },
  { lat: 1.304082524778855, lng: 103.77529826511775 },
  { lat: 1.304173696263286, lng: 103.7751078282777 },
  { lat: 1.3042353710891166, lng: 103.77508100618755 },
  { lat: 1.3043614022502468, lng: 103.77491470922863 },
  { lat: 1.3044874334050542, lng: 103.77475109447872 },
  { lat: 1.3045973754711386, lng: 103.77461966623699 },
  { lat: 1.3047126805596474, lng: 103.77453651775753 },
  { lat: 1.3048622199005193, lng: 103.77452578892147 },
  { lat: 1.3051062376140568, lng: 103.774442640442 },
  { lat: 1.3053100326094251, lng: 103.77437290300762 },
  { lat: 1.3055004200243696, lng: 103.77434876312648 },
  { lat: 1.3056934889374858, lng: 103.77427634348308 },
  { lat: 1.3058439883122877, lng: 103.77425471843006 },
  { lat: 1.306004879052258, lng: 103.77426008284809 },
  { lat: 1.3061899033904794, lng: 103.77423862517597 },
  { lat: 1.3063293420131956, lng: 103.77412329018833 },
  { lat: 1.3064500100458236, lng: 103.77403209508182 },
  { lat: 1.3065277738860157, lng: 103.77396503985645 },
  { lat: 1.3066323528397041, lng: 103.77391139567615 },
  { lat: 1.3067851989949582, lng: 103.77382824719669 },
  { lat: 1.3069809493205493, lng: 103.77374778092624 },
  { lat: 1.3071445214987447, lng: 103.77366999686481 },
  { lat: 1.3072785970466845, lng: 103.77357343734027 },
  { lat: 1.307356360861216, lng: 103.77354929745914 },
  { lat: 1.3074368061840589, lng: 103.7735412508321 },
  { lat: 1.3076325564588631, lng: 103.7735948950124 },
  { lat: 1.3078309882286843, lng: 103.77369681895496 },
  { lat: 1.3080750056538726, lng: 103.77372364104511 },
  { lat: 1.3082412592706234, lng: 103.77374778092624 },
  { lat: 1.3083726532502664, lng: 103.77369950116397 },
  { lat: 1.3084475248934138, lng: 103.77366932081199 },
  { lat: 1.308509199614337, lng: 103.7735271637342 },
  { lat: 1.3085816003717377, lng: 103.77342523979164 },
  { lat: 1.3086700901835115, lng: 103.77311410354591 },
  { lat: 1.3087558984828644, lng: 103.77290757345176 },
  { lat: 1.308817573196205, lng: 103.77267153905845 },
  { lat: 1.3088631588529083, lng: 103.7725186531446 },
  { lat: 1.3089006999813562, lng: 103.77235503839469 },
  { lat: 1.3089006999813562, lng: 103.77226384328819 },
  { lat: 1.3087666245200673, lng: 103.772049266567 },
  { lat: 1.3086110969760143, lng: 103.77194734262443 },
  { lat: 1.3084391290743826, lng: 103.7719016446764 },
  { lat: 1.3081039403460804, lng: 103.77186141154118 },
  { lat: 1.3078411523517828, lng: 103.77183727166005 },
  { lat: 1.307605179435499, lng: 103.77177021643467 },
  { lat: 1.307248538508546, lng: 103.77172998329945 },
  { lat: 1.3068999420648242, lng: 103.77167365691014 },
  { lat: 1.3065413563959933, lng: 103.77159797151347 },
  { lat: 1.3061364481005335, lng: 103.7715496917512 },
  { lat: 1.305870978387957, lng: 103.77155773837825 },
  { lat: 1.3055840565458747, lng: 103.77159797151347 },
  { lat: 1.305396350650145, lng: 103.77160601814052 },
  { lat: 1.3051389253989427, lng: 103.77164356906673 },
  { lat: 1.3048359143924146, lng: 103.77167843778392 },
  { lat: 1.304551673946027, lng: 103.77177499730846 },
  { lat: 1.3043612864592657, lng: 103.7718903322961 },
  { lat: 1.304072424833536, lng: 103.77225779493114 },
  { lat: 1.303906170940993, lng: 103.77250724036952 },
  { lat: 1.3037640506692956, lng: 103.77281569440623 },
  { lat: 1.3036138858452089, lng: 103.77304636438151 },
  { lat: 1.3034288613175156, lng: 103.77339505155345 },
  { lat: 1.3032840595037292, lng: 103.77371691663524 },
  { lat: 1.3032170216241774, lng: 103.7739261289384 },
  { lat: 1.3032009325328082, lng: 103.77395026881953 },
  { lat: 1.3030668567674584, lng: 103.77395295102855 },
];

// Dark blue area boundary coordinates
const DARK_BLUE_AREA_BOUNDARY = [
  { lat: 1.2972535820554234, lng: 103.77843185356016 },
  { lat: 1.2971355951043275, lng: 103.77839966705199 },
  { lat: 1.2969881114077255, lng: 103.77836211612578 },
  { lat: 1.2967414113869467, lng: 103.7783674805438 },
  { lat: 1.2964947113421101, lng: 103.77842917135115 },
  { lat: 1.2964346400737337, lng: 103.77829374370977 },
  { lat: 1.296237113568602, lng: 103.77790215967968 },
  { lat: 1.2960938876647257, lng: 103.77772158358889 },
  { lat: 1.2957184744474743, lng: 103.77760356639223 },
  { lat: 1.2952304371818735, lng: 103.77755528662996 },
  { lat: 1.2951178131841585, lng: 103.77778059218721 },
  { lat: 1.2949331180051922, lng: 103.77840521683238 },
  { lat: 1.294939843960143, lng: 103.77901148467211 },
  { lat: 1.2949344809121468, lng: 103.77935480742602 },
  { lat: 1.2948301821634047, lng: 103.77979956371973 },
  { lat: 1.2946853798568358, lng: 103.7800624202032 },
  { lat: 1.2942006358588714, lng: 103.78048987883444 },
  { lat: 1.2939524295113145, lng: 103.78076855493232 },
  { lat: 1.2937437856848786, lng: 103.78119844756478 },
  { lat: 1.2940187035252286, lng: 103.78124662342839 },
  { lat: 1.2942550623407818, lng: 103.78139507310736 },
  { lat: 1.294462902440757, lng: 103.7814237480227 },
  { lat: 1.2945393493740007, lng: 103.78146437082042 },
  { lat: 1.2946898542588081, lng: 103.78157668090547 },
  { lat: 1.2947519673849968, lng: 103.7815957975157 },
  { lat: 1.2948379282344262, lng: 103.78177367099286 },
  { lat: 1.2949076478603476, lng: 103.78195606120588 },
  { lat: 1.2949354374708373, lng: 103.78213851298987 },
  { lat: 1.2949885063920636, lng: 103.78224831155899 },
  { lat: 1.2950917450620958, lng: 103.78228183917167 },
  { lat: 1.2951762130617241, lng: 103.78229390911224 },
  { lat: 1.295332410770289, lng: 103.78227781585815 },
  { lat: 1.2954718499930107, lng: 103.78238778642776 },
  { lat: 1.2955155646032217, lng: 103.7826432812864 },
  { lat: 1.295478023275442, lng: 103.78287126905266 },
  { lat: 1.2954270743296823, lng: 103.78315826541726 },
  { lat: 1.2953761253829046, lng: 103.78343989736382 },
  { lat: 1.2953788069064447, lng: 103.78366520292107 },
  { lat: 1.2953966410594182, lng: 103.7839342325293 },
  { lat: 1.2954154117239822, lng: 103.78415149145951 },
  { lat: 1.2955173096149293, lng: 103.78430974179139 },
  { lat: 1.2957398760466807, lng: 103.78421854668488 },
  { lat: 1.2959651239818202, lng: 103.78401201659074 },
  { lat: 1.2961930534195842, lng: 103.78386717730393 },
  { lat: 1.2963968491348141, lng: 103.78365528279176 },
  { lat: 1.2965872372223695, lng: 103.78355335884919 },
  { lat: 1.2968258926921838, lng: 103.78335219317307 },
  { lat: 1.2970189622692727, lng: 103.78308933668961 },
  { lat: 1.2974367299662395, lng: 103.78244958766462 },
  { lat: 1.2975279016908023, lng: 103.78247640975476 },
  { lat: 1.2977960538028184, lng: 103.78174684890271 },
  { lat: 1.2980856580518843, lng: 103.7813123310423 },
  { lat: 1.2982680014509225, lng: 103.78104947455884 },
  { lat: 1.298514701322826, lng: 103.7806095922804 },
  { lat: 1.2986541403702099, lng: 103.78033600696088 },
  { lat: 1.298595146928026, lng: 103.7802927221605 },
  { lat: 1.2983484470639721, lng: 103.78036245959488 },
  { lat: 1.298133925423495, lng: 103.78039464610306 },
  { lat: 1.2978604103054916, lng: 103.78028199332444 },
  { lat: 1.2978014168447713, lng: 103.78020152705399 },
  { lat: 1.2974045517097377, lng: 103.7801317896196 },
  { lat: 1.297302653894742, lng: 103.78012106078354 },
  { lat: 1.297168577816133, lng: 103.7795363392183 },
  { lat: 1.2971632147728442, lng: 103.779482695038 },
  { lat: 1.2971310365128566, lng: 103.77908036368576 },
  { lat: 1.2972490234641434, lng: 103.77870485442368 },
  { lat: 1.297289246287207, lng: 103.77855196850983 },
];

// Yellow area boundary coordinates
const YELLOW_AREA_BOUNDARY = [
  { lat: 1.295481756937539, lng: 103.78438025695094 },
  { lat: 1.295336954668208, lng: 103.78451973181971 },
  { lat: 1.2951653371530827, lng: 103.78467529994258 },
  { lat: 1.2950124902938955, lng: 103.78478527051219 },
  { lat: 1.2946608581989938, lng: 103.78497240215293 },
  { lat: 1.2944034318532862, lng: 103.78506359725944 },
  { lat: 1.2941781837793729, lng: 103.7851118770217 },
  { lat: 1.2938905666341707, lng: 103.78513065248481 },
  { lat: 1.293539286820088, lng: 103.78516820341102 },
  { lat: 1.2932014145866073, lng: 103.78500995307914 },
  { lat: 1.2929359435144707, lng: 103.78477928310386 },
  { lat: 1.2926440719887566, lng: 103.7844789625741 },
  { lat: 1.2923678747514697, lng: 103.78416782632837 },
  { lat: 1.2920842477655454, lng: 103.78396459346207 },
  { lat: 1.2918804517037878, lng: 103.78377952104005 },
  { lat: 1.2917517383931971, lng: 103.78354080443772 },
  { lat: 1.2917892797761403, lng: 103.78340132956895 },
  { lat: 1.2919153115576059, lng: 103.78328331237229 },
  { lat: 1.2920976554006116, lng: 103.78315188413056 },
  { lat: 1.2922799992305132, lng: 103.78304727797898 },
  { lat: 1.2923711711405532, lng: 103.78289170985612 },
  { lat: 1.2924703876271801, lng: 103.78272273068818 },
  { lat: 1.2925106105260555, lng: 103.78253497605714 },
  { lat: 1.2925186551057595, lng: 103.78244914536866 },
  { lat: 1.2925588780038715, lng: 103.78222920422944 },
  { lat: 1.2926661390623908, lng: 103.78194489007386 },
  { lat: 1.2927170880636067, lng: 103.7817356777707 },
  { lat: 1.2927734001163937, lng: 103.7815211010495 },
  { lat: 1.2928699350611097, lng: 103.78138430838975 },
  { lat: 1.2930201005233681, lng: 103.78132529979142 },
  { lat: 1.2932031508959994, lng: 103.78123876231395 },
  { lat: 1.2933962207490712, lng: 103.78116902487956 },
  { lat: 1.293632194994, lng: 103.78124949115 },
  { lat: 1.2938440354906315, lng: 103.78129240649425 },
  { lat: 1.2940905312908313, lng: 103.78131926468232 },
  { lat: 1.2942460597303376, lng: 103.78143459966996 },
  { lat: 1.294473989322715, lng: 103.78151506594041 },
  { lat: 1.2946590145061878, lng: 103.78160626104692 },
  { lat: 1.2947984537659691, lng: 103.78181010893205 },
  { lat: 1.2948681733929719, lng: 103.78201395681718 },
  { lat: 1.294894988633614, lng: 103.78216952494004 },
  { lat: 1.2949459375900731, lng: 103.78230095318177 },
  { lat: 1.2951282812152871, lng: 103.78231168201783 },
  { lat: 1.2952864911147606, lng: 103.78232777527192 },
  { lat: 1.2953964335814676, lng: 103.78238141945222 },
  { lat: 1.2954527455747529, lng: 103.78249943664888 },
  { lat: 1.2954822423326375, lng: 103.78268834103656 },
  { lat: 1.2954312933869794, lng: 103.78281440486026 },
  { lat: 1.295353529204776, lng: 103.78309871901584 },
  { lat: 1.295348166157645, lng: 103.7832891558559 },
  { lat: 1.2953133204335174, lng: 103.78356012939703 },
  { lat: 1.295337454145874, lng: 103.7838256680895 },
  { lat: 1.2953562248108705, lng: 103.78406170248282 },
  { lat: 1.2953857215698876, lng: 103.78423068165075 },
  { lat: 1.2954903009854561, lng: 103.78436210989248 },
];

// Dark orange area boundary coordinates
const DARK_ORANGE_AREA_BOUNDARY = [
  { lat: 1.3015345132149319, lng: 103.77086499874379 },
  { lat: 1.3016256847915608, lng: 103.77084622328069 },
  { lat: 1.3018643397854117, lng: 103.77093205396916 },
  { lat: 1.3020761795924736, lng: 103.77108762209203 },
  { lat: 1.302281662780734, lng: 103.77112093674215 },
  { lat: 1.3024693689087208, lng: 103.77118799196752 },
  { lat: 1.3025390883241277, lng: 103.77141329752477 },
  { lat: 1.3025578589356401, lng: 103.77169539245698 },
  { lat: 1.3025739480311058, lng: 103.77191265138718 },
  { lat: 1.3026329413802777, lng: 103.77215405019852 },
  { lat: 1.3027026607911554, lng: 103.77236326250168 },
  { lat: 1.3027643356530152, lng: 103.77260197910401 },
  { lat: 1.3027831062628483, lng: 103.77278705152604 },
  { lat: 1.3027536095902026, lng: 103.77294798406693 },
  { lat: 1.3026608108106672, lng: 103.77320662237172 },
  { lat: 1.3025803653350687, lng: 103.77350434757237 },
  { lat: 1.3024784677289594, lng: 103.77370551324849 },
  { lat: 1.3024167928600896, lng: 103.77389326787953 },
  { lat: 1.3022022715653643, lng: 103.77402737833027 },
  { lat: 1.30194484598757, lng: 103.77418562866215 },
  { lat: 1.301733006169465, lng: 103.77427950597767 },
  { lat: 1.3015801597073893, lng: 103.7743572900391 },
  { lat: 1.3013656383414578, lng: 103.7744109342194 },
  { lat: 1.3011537984746904, lng: 103.7744109342194 },
  { lat: 1.300966092248781, lng: 103.77436533666615 },
  { lat: 1.300853468506528, lng: 103.77423390842442 },
  { lat: 1.3008481054710506, lng: 103.7741400311089 },
  { lat: 1.3007569338663056, lng: 103.77405420042042 },
  { lat: 1.3006979404732548, lng: 103.77398714519505 },
  { lat: 1.3008266533290518, lng: 103.77376988626484 },
  { lat: 1.3009768183192143, lng: 103.7734560678101 },
  { lat: 1.3010679899160078, lng: 103.7732227156258 },
  { lat: 1.3011350278527332, lng: 103.77291962600712 },
  { lat: 1.3011377093701664, lng: 103.77260044313435 },
  { lat: 1.3010787159860084, lng: 103.77231344676976 },
  { lat: 1.3011162572306356, lng: 103.77191916204457 },
  { lat: 1.3011940212355806, lng: 103.77152487731938 },
  { lat: 1.3013227340660858, lng: 103.7712405631638 },
  { lat: 1.301459491441296, lng: 103.77096161342625 },
];

// CDE area boundary coordinates
const CDE_AREA_BOUNDARY = [
  { lat: 1.3013111956660077, lng: 103.77074246952215 },
  { lat: 1.3012200240779925, lng: 103.77102946588674 },
  { lat: 1.3011047188296163, lng: 103.7713996107308 },
  { lat: 1.3009947766111325, lng: 103.77173488685766 },
  { lat: 1.3008687452816237, lng: 103.77214258262792 },
  { lat: 1.30090896804703, lng: 103.77258246490636 },
  { lat: 1.3009545538470744, lng: 103.77290164777914 },
  { lat: 1.3009143310823803, lng: 103.77331898479096 },
  { lat: 1.3007722106419863, lng: 103.77367840079896 },
  { lat: 1.3005469631351403, lng: 103.77398953704468 },
  { lat: 1.3003648790876527, lng: 103.77421968851233 },
  { lat: 1.3000484599141044, lng: 103.77439939651633 },
  { lat: 1.2996645479502762, lng: 103.77440827656055 },
  { lat: 1.2993561732469572, lng: 103.7744002299335 },
  { lat: 1.2990052237313279, lng: 103.77417777139766 },
  { lat: 1.2985842251040827, lng: 103.7738612707339 },
  { lat: 1.2982785317893974, lng: 103.77355281669719 },
  { lat: 1.2979862460416633, lng: 103.77306197244746 },
  { lat: 1.297650370940819, lng: 103.77292985904845 },
  { lat: 1.2973473590347029, lng: 103.772849392778 },
  { lat: 1.2970282579615842, lng: 103.7725623964134 },
  { lat: 1.2967332905472868, lng: 103.77225306486923 },
  { lat: 1.2964839089793045, lng: 103.77196070408661 },
  { lat: 1.2963766480822811, lng: 103.77155032610733 },
  { lat: 1.2964034633069694, lng: 103.77139475798447 },
  { lat: 1.2964410046210346, lng: 103.77108898615677 },
  { lat: 1.2964356415761935, lng: 103.77084490513641 },
  { lat: 1.2963820111272366, lng: 103.77047744250137 },
  { lat: 1.2962962024065365, lng: 103.77016898846466 },
  { lat: 1.2962506165224874, lng: 103.77000000929672 },
  { lat: 1.296392737217122, lng: 103.76990076756317 },
  { lat: 1.2965697176936308, lng: 103.76988199210007 },
  { lat: 1.2967413351135941, lng: 103.76989540314514 },
  { lat: 1.2970282579615842, lng: 103.76988638264952 },
  { lat: 1.2973285883844512, lng: 103.76991320473967 },
  { lat: 1.2975457916144968, lng: 103.76992661578474 },
  { lat: 1.2978353958922004, lng: 103.76996684891996 },
  { lat: 1.2980629569804742, lng: 103.76998294217405 },
  { lat: 1.298341835117378, lng: 103.77001244647322 },
  { lat: 1.2985724458612087, lng: 103.7700097642642 },
  { lat: 1.2988405978624395, lng: 103.77003122193632 },
  { lat: 1.2991060683156275, lng: 103.77005267960844 },
  { lat: 1.2992615964469763, lng: 103.77005536181746 },
  { lat: 1.2995387601413104, lng: 103.77006804292917 },
  { lat: 1.2997398740679835, lng: 103.77009486501932 },
  { lat: 1.2999436694973452, lng: 103.77010022943735 },
  { lat: 1.3001555094656867, lng: 103.77015387361764 },
  { lat: 1.3004156167442795, lng: 103.77023165767908 },
  { lat: 1.300622093637056, lng: 103.77033358162164 },
  { lat: 1.3008731991165645, lng: 103.77042477672815 },
  { lat: 1.3011011281117608, lng: 103.77056425159692 },
  { lat: 1.3013022419139344, lng: 103.77069567983865 },
];

// FASS area boundary coordinates
const FASS_AREA_BOUNDARY = [
  { lat: 1.2951665497768692, lng: 103.76989311507172 },
  { lat: 1.2953435303390621, lng: 103.76991725495286 },
  { lat: 1.2955607337393944, lng: 103.76993066599793 },
  { lat: 1.2957886632135442, lng: 103.76994675925202 },
  { lat: 1.2959549176405858, lng: 103.76994675925202 },
  { lat: 1.2960447867605696, lng: 103.7700862341208 },
  { lat: 1.2961305954898061, lng: 103.77030081084199 },
  { lat: 1.2961788628987185, lng: 103.77060658266969 },
  { lat: 1.2961922705121314, lng: 103.77079701950974 },
  { lat: 1.2962056781254807, lng: 103.77105182936616 },
  { lat: 1.2961520476716637, lng: 103.77130663922257 },
  { lat: 1.2961627737625034, lng: 103.77153462698884 },
  { lat: 1.2961895889894564, lng: 103.77177066138215 },
  { lat: 1.2962455210446713, lng: 103.77198773582482 },
  { lat: 1.2963554634697385, lng: 103.77220767696404 },
  { lat: 1.2963688710822354, lng: 103.77238202055001 },
  { lat: 1.2962347949541497, lng: 103.77255099971795 },
  { lat: 1.2961221710010897, lng: 103.77270120342278 },
  { lat: 1.296009547043017, lng: 103.77293992002511 },
  { lat: 1.2959532350621106, lng: 103.7731893654635 },
  { lat: 1.2958861969879472, lng: 103.77349159034345 },
  { lat: 1.2957440762648782, lng: 103.77362033637617 },
  { lat: 1.2956502229528208, lng: 103.77366861613844 },
  { lat: 1.2955724587773345, lng: 103.7736257007942 },
  { lat: 1.2953793890899568, lng: 103.77345135720823 },
  { lat: 1.2951943639590775, lng: 103.77347549708936 },
  { lat: 1.295065650816598, lng: 103.77339771302793 },
  { lat: 1.295068332340469, lng: 103.77316704305265 },
  { lat: 1.2949744790033741, lng: 103.77300074609373 },
  { lat: 1.294741186407554, lng: 103.77284517797086 },
  { lat: 1.2944354926288129, lng: 103.7727432540283 },
  { lat: 1.2942102445577492, lng: 103.77256086381529 },
  { lat: 1.294033263916437, lng: 103.77228996070478 },
  { lat: 1.293880416989008, lng: 103.77216389688108 },
  { lat: 1.2937061178499896, lng: 103.77210757049177 },
  { lat: 1.2935371817499854, lng: 103.77205660852049 },
  { lat: 1.2935988568354255, lng: 103.77165964158628 },
  { lat: 1.2936363981910413, lng: 103.77154162438963 },
  { lat: 1.2938509202124853, lng: 103.7711580685005 },
  { lat: 1.2939978894932338, lng: 103.77092254883688 },
  { lat: 1.2941641440377396, lng: 103.77080989605825 },
  { lat: 1.2943947551620791, lng: 103.77069456107061 },
  { lat: 1.294542239009681, lng: 103.77051485306662 },
  { lat: 1.2947621240028768, lng: 103.77028954750936 },
  { lat: 1.294885474112665, lng: 103.77014470822256 },
  { lat: 1.2949739644051224, lng: 103.76995695359152 },
];

// COM/BIZ area boundary coordinates
const COMBIZ_AREA_BOUNDARY = [
  { lat: 1.295601791447121, lng: 103.77374150550402 },
  { lat: 1.2959235742229849, lng: 103.77419211661852 },
  { lat: 1.296036198184887, lng: 103.77459981238879 },
  { lat: 1.296084465595593, lng: 103.77506115233935 },
  { lat: 1.2959343003148043, lng: 103.77544739043749 },
  { lat: 1.2958163133022345, lng: 103.77576389110125 },
  { lat: 1.2953121869138788, lng: 103.77595701015032 },
  { lat: 1.2951083911113872, lng: 103.77602138316668 },
  { lat: 1.2949314105327827, lng: 103.77612330710924 },
  { lat: 1.2947919712803166, lng: 103.77669729983843 },
  { lat: 1.2944993417496968, lng: 103.77681229135806 },
  { lat: 1.2941078391470149, lng: 103.77669963857943 },
  { lat: 1.2941024760972375, lng: 103.77638313791567 },
  { lat: 1.2937002473320516, lng: 103.77629194280917 },
  { lat: 1.2935608080118908, lng: 103.77607736608797 },
  { lat: 1.293587623266362, lng: 103.77568039915377 },
  { lat: 1.2935983493680663, lng: 103.77539072058016 },
  { lat: 1.293201483574645, lng: 103.77525124571139 },
  { lat: 1.2928314329816253, lng: 103.77511177084261 },
  { lat: 1.2923916626415053, lng: 103.77477917692477 },
  { lat: 1.2921503252273887, lng: 103.77463970205599 },
  { lat: 1.29212350995774, lng: 103.77426419279391 },
  { lat: 1.2922468601957935, lng: 103.77374920866305 },
  { lat: 1.2926919936137307, lng: 103.77333078405672 },
  { lat: 1.2929762353940175, lng: 103.77297673246676 },
  { lat: 1.2931532161090424, lng: 103.77259585878664 },
  { lat: 1.2934749991956849, lng: 103.77218816301638 },
  { lat: 1.2937914191910755, lng: 103.77222034952456 },
  { lat: 1.2939683998492577, lng: 103.77242956182772 },
  { lat: 1.294193647941809, lng: 103.77275142690951 },
  { lat: 1.2945368830919923, lng: 103.77299819013888 },
  { lat: 1.2947728572307922, lng: 103.77310011408144 },
  { lat: 1.2948908442919482, lng: 103.7733254196387 },
  { lat: 1.2949391117244855, lng: 103.77349708101565 },
  { lat: 1.2953037989627765, lng: 103.77360973379427 },
];

const LAW_AREA_BOUNDARY = [
  { lat: 1.3199541334261549, lng: 103.81773070558138 },
  { lat: 1.3197878805889836, lng: 103.81788359149523 },
  { lat: 1.3196001757594775, lng: 103.81808207496233 },
  { lat: 1.3195358198146734, lng: 103.81821082099505 },
  { lat: 1.3193481149661348, lng: 103.81831274493761 },
  { lat: 1.3191443211145575, lng: 103.81843344434328 },
  { lat: 1.3190156091996958, lng: 103.81855146153994 },
  { lat: 1.318857400795223, lng: 103.81840394004412 },
  { lat: 1.3186482439060692, lng: 103.81820545657702 },
  { lat: 1.3183969621836291, lng: 103.8179760855578 },
  { lat: 1.3182146202475187, lng: 103.81766763152109 },
  { lat: 1.318024233799972, lng: 103.81743964375482 },
  { lat: 1.3179062478251788, lng: 103.81720360936151 },
  { lat: 1.3178767513306189, lng: 103.8170024436854 },
  { lat: 1.3179813298097938, lng: 103.81675836266504 },
  { lat: 1.3181636717629774, lng: 103.81657329024301 },
  { lat: 1.3183674656948574, lng: 103.81646063746439 },
  { lat: 1.3186034375951448, lng: 103.81630506934152 },
  { lat: 1.3188501354669755, lng: 103.81623801411615 },
  { lat: 1.3189813710406701, lng: 103.8163555576431 },
  { lat: 1.3191905279018226, lng: 103.81661304970854 },
  { lat: 1.3194050477411514, lng: 103.81690004607313 },
  { lat: 1.3196490640358944, lng: 103.81719240685575 },
  { lat: 1.3198689468304363, lng: 103.81747672101133 },
  { lat: 1.3199493917504048, lng: 103.81764301797025 },
];

const PGPR_BOUNDARY = [
  { lat: 1.2917537464076685, lng: 103.78287524836298 },
  { lat: 1.291522585034507, lng: 103.78232408961475 },
  { lat: 1.2913911901780486, lng: 103.78204782208621 },
  { lat: 1.2912142093402417, lng: 103.78171522816837 },
  { lat: 1.2910613622431364, lng: 103.78138799866855 },
  { lat: 1.2910157762650192, lng: 103.78106613358676 },
  { lat: 1.2912302985078297, lng: 103.78063698014438 },
  { lat: 1.2915413557277469, lng: 103.78038217028796 },
  { lat: 1.2917961008363805, lng: 103.78033657273471 },
  { lat: 1.2921152025680014, lng: 103.78019441565692 },
  { lat: 1.292249278913866, lng: 103.77996374568164 },
  { lat: 1.2921098395140258, lng: 103.77985645732105 },
  { lat: 1.2919569924707737, lng: 103.77977330884158 },
  { lat: 1.2917129734879405, lng: 103.77983768185794 },
  { lat: 1.2915011328135158, lng: 103.77991010150134 },
  { lat: 1.2914260500385968, lng: 103.7800093432349 },
  { lat: 1.2911034900467933, lng: 103.78021050891101 },
  { lat: 1.2909131015477124, lng: 103.78039021691501 },
  { lat: 1.290765617489316, lng: 103.78058333596408 },
  { lat: 1.290695897749658, lng: 103.78091592988193 },
  { lat: 1.2906610378791101, lng: 103.78133971890628 },
  { lat: 1.2907763436029411, lng: 103.78165085515201 },
  { lat: 1.2909506429430215, lng: 103.78200758895099 },
  { lat: 1.2910981269906676, lng: 103.78241796693027 },
  { lat: 1.2912161142226322, lng: 103.78269155224979 },
  { lat: 1.2913716428382138, lng: 103.78301073512256 },
  { lat: 1.291505719223314, lng: 103.78322799405277 },
  { lat: 1.291682700040829, lng: 103.78309656581104 },
];

const LIGHTHOUSE_BOUNDARY = [
  { lat: 1.2906559719698172, lng: 103.78141793942494 },
  { lat: 1.2907672554012772, lng: 103.78168213701291 },
  { lat: 1.2908235674972561, lng: 103.78184843397183 },
  { lat: 1.2907122840682768, lng: 103.7819329235558 },
  { lat: 1.2905862522271312, lng: 103.78200802540822 },
  { lat: 1.290458879615399, lng: 103.78204423522992 },
  { lat: 1.290352959228131, lng: 103.78210726714177 },
  { lat: 1.2902684910680502, lng: 103.78211933708234 },
  { lat: 1.2902108381952762, lng: 103.78205228185696 },
  { lat: 1.2901411184403897, lng: 103.78195572233243 },
  { lat: 1.2900754209773144, lng: 103.78182295298619 },
  { lat: 1.2900258126877429, lng: 103.78174516892476 },
  { lat: 1.289988271278783, lng: 103.7815721664433 },
  { lat: 1.2900807840355901, lng: 103.78148633575482 },
  { lat: 1.2901746375535568, lng: 103.78149438238187 },
  { lat: 1.2903221216462013, lng: 103.78149170017285 },
  { lat: 1.2904897171956624, lng: 103.78147963023228 },
  { lat: 1.290618430570157, lng: 103.78145817256016 },
  { lat: 1.2906479273842102, lng: 103.78145012593312 },
];

const PIONEER_HOUSE_BOUNDARY = [
  { lat: 1.290754061448813, lng: 103.779810883653 },
  { lat: 1.2909015455078583, lng: 103.77998522723897 },
  { lat: 1.2909685837136966, lng: 103.78015152419789 },
  { lat: 1.2909953989955332, lng: 103.78025613034947 },
  { lat: 1.2908800932816256, lng: 103.78038219417317 },
  { lat: 1.290783558261314, lng: 103.78048948253377 },
  { lat: 1.290719201579054, lng: 103.78061018193944 },
  { lat: 1.290670934066303, lng: 103.78077647889836 },
  { lat: 1.2906602079522325, lng: 103.78082475866063 },
  { lat: 1.2903893735569818, lng: 103.78076038564427 },
  { lat: 1.290123902191051, lng: 103.78070674146397 },
  { lat: 1.2900112779668425, lng: 103.78067723716481 },
  { lat: 1.2900809977252783, lng: 103.7804224273084 },
  { lat: 1.2901936219463954, lng: 103.78027758802159 },
  { lat: 1.2903142907492267, lng: 103.78014079536183 },
  { lat: 1.2904510487188188, lng: 103.78001204932912 },
  { lat: 1.2906065773812059, lng: 103.77988866771443 },
  { lat: 1.2906736155948046, lng: 103.77979747260792 },
];

const HELIX_HOUSE_BOUNDARY = [
  { lat: 1.2915629106059112, lng: 103.77915551860289 },
  { lat: 1.2914395603346527, lng: 103.77921989161925 },
  { lat: 1.2912974393625207, lng: 103.77928962905364 },
  { lat: 1.291107050877956, lng: 103.77944787938551 },
  { lat: 1.2909622483590406, lng: 103.77954712111907 },
  { lat: 1.290841579586959, lng: 103.77967318494277 },
  { lat: 1.2907879490197491, lng: 103.77975901563124 },
  { lat: 1.2909515222461914, lng: 103.77998700339751 },
  { lat: 1.2910480572601417, lng: 103.78014525372939 },
  { lat: 1.291208948941887, lng: 103.78008088071303 },
  { lat: 1.2913591145023484, lng: 103.78000846106963 },
  { lat: 1.2914422418623528, lng: 103.77994677026228 },
  { lat: 1.2914261526961006, lng: 103.77981265981154 },
  { lat: 1.2915763182437252, lng: 103.77973755795912 },
  { lat: 1.2916192226842826, lng: 103.77961149413542 },
  { lat: 1.291613859629251, lng: 103.77944787938551 },
  { lat: 1.2916299487942946, lng: 103.77928962905364 },
  { lat: 1.2916540825416882, lng: 103.77923062045531 },
];

const SHEARES_HALL_BOUNDARY = [
  { lat: 1.2917204394295219, lng: 103.77518667776113 },
  { lat: 1.291446923619519, lng: 103.77507938940053 },
  { lat: 1.291119777219864, lng: 103.77500965196614 },
  { lat: 1.290937433306708, lng: 103.77560510236745 },
  { lat: 1.2907765416077621, lng: 103.77609862882619 },
  { lat: 1.2913825669540522, lng: 103.77623273927694 },
  { lat: 1.291495191117525, lng: 103.77591623861318 },
  { lat: 1.291581000000637, lng: 103.77561583120351 },
  { lat: 1.2916775349906695, lng: 103.77540125448232 },
];

const KENT_RIDGE_HALL_BOUNDARY = [
  { lat: 1.2917540342179064, lng: 103.77393380400119 },
  { lat: 1.29178455208978, lng: 103.77395902360622 },
  { lat: 1.2919400806705665, lng: 103.77403412545864 },
  { lat: 1.292036615646948, lng: 103.77418432916348 },
  { lat: 1.2920634309175256, lng: 103.77440963472073 },
  { lat: 1.2919186284530868, lng: 103.77467249120419 },
  { lat: 1.291763099870977, lng: 103.77501044954006 },
  { lat: 1.2917362845972444, lng: 103.77511237348263 },
  { lat: 1.2911517115594238, lng: 103.77495144094173 },
  { lat: 1.291264335733125, lng: 103.77472077096645 },
  { lat: 1.2913769599018394, lng: 103.77450619424526 },
  { lat: 1.2914734948996198, lng: 103.77429161752407 },
  { lat: 1.291591482114155, lng: 103.77409313405697 },
  { lat: 1.2917094693232194, lng: 103.77396438802425 },
];

const TEMASEK_HALL_BOUNDARY = [
  { lat: 1.2926717723804764, lng: 103.770244052354 },
  { lat: 1.292886294483457, lng: 103.77037816280475 },
  { lat: 1.2929989185802526, lng: 103.77042107814898 },
  { lat: 1.2931598101384525, lng: 103.77055518859973 },
  { lat: 1.2931919884488712, lng: 103.77072684997668 },
  { lat: 1.2930847274125647, lng: 103.77108626598468 },
  { lat: 1.2930096446844506, lng: 103.77137594455829 },
  { lat: 1.2929560141630152, lng: 103.77160125011554 },
  { lat: 1.2928809314310972, lng: 103.77188019985309 },
  { lat: 1.292827300906939, lng: 103.77207331890216 },
  { lat: 1.2927254029079167, lng: 103.77239518398395 },
  { lat: 1.2925698743752074, lng: 103.77240591282 },
  { lat: 1.2924679763658673, lng: 103.77243273491015 },
  { lat: 1.2924518872061288, lng: 103.77204113239398 },
  { lat: 1.2924304349929747, lng: 103.77152078384509 },
  { lat: 1.2924626133126296, lng: 103.77098434204211 },
  { lat: 1.2924626133126296, lng: 103.77072148555865 },
  { lat: 1.2924733394190921, lng: 103.77053909534564 },
  { lat: 1.2926556832220355, lng: 103.77030842537036 },
];

const EUSOFF_HALL_BOUNDARY = [
  { lat: 1.292711071423188, lng: 103.77020076098947 },
  { lat: 1.2928344216327057, lng: 103.76999959531335 },
  { lat: 1.2930462621959382, lng: 103.76979842963723 },
  { lat: 1.29324469511254, lng: 103.76962676826028 },
  { lat: 1.2934726247949142, lng: 103.7694497424653 },
  { lat: 1.2936603315767847, lng: 103.76959726396112 },
  { lat: 1.293826586143402, lng: 103.76962140384225 },
  { lat: 1.2940116113740996, lng: 103.76968041244058 },
  { lat: 1.294137643045251, lng: 103.76977965417413 },
  { lat: 1.2943628911227647, lng: 103.7699191290429 },
  { lat: 1.2944326107617645, lng: 103.77002373519448 },
  { lat: 1.294392387893346, lng: 103.77015784564523 },
  { lat: 1.2941912735417127, lng: 103.7702061254075 },
  { lat: 1.2938775351213234, lng: 103.77029195609597 },
  { lat: 1.2936764207288645, lng: 103.77045288863687 },
  { lat: 1.2935208922544355, lng: 103.77064600768594 },
  { lat: 1.2933331854622474, lng: 103.77075866046457 },
  { lat: 1.2932554212156948, lng: 103.7707640248826 },
  { lat: 1.2931964276477643, lng: 103.7706030923417 },
  { lat: 1.293118663397039, lng: 103.77044752421884 },
  { lat: 1.292995313201325, lng: 103.77037510457544 },
];

const KING_EDWARD_VII_HALL_BOUNDARY = [
  { lat: 1.293567911673002, lng: 103.7795887398512 },
  { lat: 1.2933533896276275, lng: 103.77954582450697 },
  { lat: 1.29311205230492, lng: 103.77963165519544 },
  { lat: 1.2928868041163413, lng: 103.77963701961347 },
  { lat: 1.292613288431932, lng: 103.77985159633467 },
  { lat: 1.2925489317960188, lng: 103.78031830070326 },
  { lat: 1.292355861878509, lng: 103.78037194488356 },
  { lat: 1.2921520658385446, lng: 103.78048459766218 },
  { lat: 1.2918517348024792, lng: 103.78051678417036 },
  { lat: 1.2916425756671155, lng: 103.78053824184248 },
  { lat: 1.2914655948468143, lng: 103.78053824184248 },
  { lat: 1.2912886140141853, lng: 103.7807045388014 },
  { lat: 1.2911759898415525, lng: 103.78089229343244 },
  { lat: 1.2911545376176352, lng: 103.78117660758802 },
  { lat: 1.2911706267855922, lng: 103.78138581989118 },
  { lat: 1.2915084992892292, lng: 103.78192226169416 },
  { lat: 1.2916693909418404, lng: 103.78179888007948 },
  { lat: 1.2918141934204774, lng: 103.78158430335829 },
  { lat: 1.2919160914560632, lng: 103.78143946407148 },
  { lat: 1.2923129574504066, lng: 103.78133217571089 },
  { lat: 1.2926293775906526, lng: 103.78123025176832 },
  { lat: 1.2929082563256407, lng: 103.7811015057356 },
  { lat: 1.293230039443338, lng: 103.78093520877668 },
  { lat: 1.293482102857025, lng: 103.78067771671125 },
  { lat: 1.2935840008256667, lng: 103.78032902953932 },
  { lat: 1.2936537204860652, lng: 103.77984623191664 },
  { lat: 1.293605453029063, lng: 103.77956191776106 },
];

const RAFFLES_HALL_BOUNDARY = [
  { lat: 1.3004130289907179, lng: 103.77229770375949 },
  { lat: 1.3001180619714199, lng: 103.77245863630039 },
  { lat: 1.2998445470681932, lng: 103.77261956884128 },
  { lat: 1.299780190616065, lng: 103.77280732347232 },
  { lat: 1.2995442169442344, lng: 103.77284487439853 },
  { lat: 1.2994959495995566, lng: 103.77315601064426 },
  { lat: 1.2992438867845773, lng: 103.77321501924258 },
  { lat: 1.2993404214826474, lng: 103.77351006223422 },
  { lat: 1.2994637713692625, lng: 103.7738480205701 },
  { lat: 1.2996568407449076, lng: 103.77420207216007 },
  { lat: 1.299871362256089, lng: 103.77423962308627 },
  { lat: 1.3001287880454537, lng: 103.77425035192233 },
  { lat: 1.3003164943336512, lng: 103.77398749543887 },
  { lat: 1.300477385426714, lng: 103.77385874940616 },
  { lat: 1.3006490025813426, lng: 103.77355834199649 },
  { lat: 1.3007777154396458, lng: 103.773290121095 },
  { lat: 1.300842071866342, lng: 103.7730004425214 },
  { lat: 1.3008957022206584, lng: 103.77272149278384 },
  { lat: 1.3009225173973968, lng: 103.77246400071841 },
  { lat: 1.300809893653185, lng: 103.7722440595792 },
];

const CAPT_BOUNDARY = [
  { lat: 1.308151989494033, lng: 103.77306929149049 },
  { lat: 1.3079562392597364, lng: 103.77358159341233 },
  { lat: 1.3074038481053056, lng: 103.77343675412553 },
  { lat: 1.307527197596934, lng: 103.77285203256028 },
  { lat: 1.3081198113743842, lng: 103.77303442277329 },
];

const RC4_BOUNDARY = [
  { lat: 1.3086564463131918, lng: 103.77293036596032 },
  { lat: 1.308189863631594, lng: 103.77274797574731 },
  { lat: 1.30808260323276, lng: 103.77298669234963 },
  { lat: 1.308197908161325, lng: 103.77306447641107 },
  { lat: 1.3080075209508395, lng: 103.77356336728784 },
  { lat: 1.308291761006248, lng: 103.77371625320168 },
  { lat: 1.308455333099001, lng: 103.77319858686181 },
  { lat: 1.308565274991427, lng: 103.77324954883309 },
];

const RVRC_BOUNDARY = [
  { lat: 1.2983193593335998, lng: 103.77555838794795 },
  { lat: 1.2987913068839976, lng: 103.77579442234126 },
  { lat: 1.2987591286447342, lng: 103.77588561744777 },
  { lat: 1.2989146567974181, lng: 103.77602509231654 },
  { lat: 1.2987537656048167, lng: 103.77642742366878 },
  { lat: 1.298651867844196, lng: 103.77655080528346 },
  { lat: 1.2984641614322876, lng: 103.77651861877528 },
  { lat: 1.2982871810883063, lng: 103.77674392433254 },
  { lat: 1.2978259595276067, lng: 103.776647364808 },
  { lat: 1.2973915530969806, lng: 103.77637377948848 },
  { lat: 1.2975363552488217, lng: 103.77605727882472 },
  { lat: 1.2976918834767321, lng: 103.77567640514461 },
  { lat: 1.2980619333598646, lng: 103.77556375236598 },
  { lat: 1.2983837158229277, lng: 103.77559593887416 },
];

const TEMBUSU_COLLEGE_BOUNDARY = [
  { lat: 1.306409076576148, lng: 103.7738888595609 },
  { lat: 1.3061811480614827, lng: 103.77343288402837 },
  { lat: 1.3061007026984375, lng: 103.77340069752019 },
  { lat: 1.3058754556681913, lng: 103.77337923984807 },
  { lat: 1.3057494245829235, lng: 103.77336851101201 },
  { lat: 1.3057386985328203, lng: 103.77362332086842 },
  { lat: 1.305727972482679, lng: 103.77378425340932 },
  { lat: 1.305760150632976, lng: 103.77399078350346 },
  { lat: 1.3058888632300791, lng: 103.77407929640096 },
  { lat: 1.3060363464061389, lng: 103.77410880070012 },
  { lat: 1.3062052816698988, lng: 103.77398541908543 },
];

const VALOUR_HOUSE_BOUNDARY = [
  { lat: 1.3008185460907922, lng: 103.77471833132181 },
  { lat: 1.300679107162921, lng: 103.77528159521493 },
  { lat: 1.3005289421550492, lng: 103.77545862100992 },
  { lat: 1.3003465989191987, lng: 103.77540497682962 },
  { lat: 1.3001803447809133, lng: 103.77530305288705 },
  { lat: 1.300148166559334, lng: 103.774932908043 },
  { lat: 1.3001696187071086, lng: 103.77476124666605 },
  { lat: 1.3005557573356805, lng: 103.774573492035 },
];

// Helper function to create test polyline
const createTestPolyline = (map: google.maps.Map): google.maps.Polyline => {
  console.log('🎨 Creating test polyline using Google Maps example...');
  const flightPath = new google.maps.Polyline({
    path: TEST_FLIGHT_PATH,
    geodesic: true,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });
  flightPath.setMap(map);
  console.log(
    '✅ Test polyline created with',
    TEST_FLIGHT_PATH.length,
    'points'
  );
  return flightPath;
};

// Helper to create overlay polygons
const createOverlayPolygons = (map: google.maps.Map) => {
  // Top side of campus coordinates (indices 0-24 from NUS_CAMPUS_BOUNDARY)
  const topCampusBoundary = [
    { lat: 1.2943662309653878, lng: 103.78561449648741 }, // Start - Northeast
    { lat: 1.295629533832989, lng: 103.78570662970284 }, // East side
    { lat: 1.2964131927699438, lng: 103.78474048652491 },
    { lat: 1.2971829857279495, lng: 103.78386032960005 },
    { lat: 1.2980348448645642, lng: 103.78261664943643 },
    { lat: 1.299016774461335, lng: 103.78136595028842 }, // East moving north
    { lat: 1.3029143562052712, lng: 103.77446862100085 }, // North section
    { lat: 1.303151281280304, lng: 103.77460154905552 },
    { lat: 1.3034087067348328, lng: 103.77534183874363 },
    { lat: 1.3035588715711455, lng: 103.77612504377598 },
    { lat: 1.303773392750353, lng: 103.77621087446445 },
    { lat: 1.304245339280276, lng: 103.77533110990757 },
    { lat: 1.3046138571244286, lng: 103.77495691134023 },
    { lat: 1.3055309346530188, lng: 103.77449557138966 },
    { lat: 1.3066008972191312, lng: 103.77416548860828 },
    { lat: 1.3077047227793976, lng: 103.77381428625108 },
    { lat: 1.3084233674722994, lng: 103.77384647275926 },
    { lat: 1.3087451486113482, lng: 103.77318128492357 },
    { lat: 1.3089923524537435, lng: 103.77225779681622 },
    { lat: 1.3088830354209653, lng: 103.7721214242881 }, // Northernmost
    { lat: 1.3087339734818089, lng: 103.77190715566871 }, // West side - detailed
    { lat: 1.3078222601432248, lng: 103.77176768079994 },
    { lat: 1.3069480876310884, lng: 103.7715799261689 },
    { lat: 1.3063560101595701, lng: 103.77149302273688 },
    { lat: 1.3055569194945853, lng: 103.77151984482703 },
  ];

  // Close the polygon with corner points
  const topPath = [
    ...topCampusBoundary,
    { lat: 1.314415799754581, lng: 103.76018809355106 },
    { lat: 0.4330389574208255, lng: 61.93316067193789 },
    { lat: 53.278578905253895, lng: 57.19774758350203 },
    { lat: 51.23464389578209, lng: 168.81884133350204 },
    { lat: 1.142880113710714, lng: 171.45556008350204 },
    { lat: 1.2924711660087167, lng: 103.79623264668385 },
    topCampusBoundary[0], // Close back to start
  ];

  const topOverlay = new google.maps.Polygon({
    paths: topPath,
    strokeColor: 'transparent',
    strokeOpacity: 0,
    strokeWeight: 0,
    fillColor: '#000000',
    fillOpacity: 0.4, // Increased opacity for more prominent dimming effect
    clickable: false, // Allow clicking through to get coordinates
  });
  topOverlay.setMap(map);

  // Bottom side of campus coordinates - red polyline for debugging
  const bottomCampusBoundary = [
    { lat: 1.305554861947453, lng: 103.77152132256184 },
    { lat: 1.304473588120397, lng: 103.77149302273688 },
    { lat: 1.3037171894968482, lng: 103.77150484046012 },
    { lat: 1.302750677686299, lng: 103.77118372403778 },
    { lat: 1.3020698524027086, lng: 103.77099060498871 },
    { lat: 1.3012472030893474, lng: 103.77056795468503 },
    { lat: 1.3004963781296934, lng: 103.77021390309507 },
    { lat: 1.300017465449572, lng: 103.77005612296252 },
    { lat: 1.2995616072428888, lng: 103.77004002970843 },
    { lat: 1.299193641975826, lng: 103.7700115678755 },
    { lat: 1.2981468814221626, lng: 103.76995129279705 },
    { lat: 1.2973209729406299, lng: 103.7698708265266 },
    { lat: 1.2966563051388456, lng: 103.76984400443645 },
    { lat: 1.2961151920525682, lng: 103.76989764861675 },
    { lat: 1.2954716265086261, lng: 103.76988691978069 },
    { lat: 1.2950290338877501, lng: 103.76983627542921 },
    { lat: 1.2946107161234566, lng: 103.76973435148665 },
    { lat: 1.2940529589970695, lng: 103.76949831709334 },
    { lat: 1.2934862064901609, lng: 103.76941101238496 },
    { lat: 1.2929552643776931, lng: 103.76980261490114 },
    { lat: 1.2926311430419277, lng: 103.77020755977628 },
    { lat: 1.2924327100773505, lng: 103.77058664571788 },
    { lat: 1.2924112578640436, lng: 103.77112308752086 },
    { lat: 1.2923917629470145, lng: 103.7727573735903 },
    { lat: 1.2922952279841184, lng: 103.77346211262126 },
    { lat: 1.2919359033677567, lng: 103.77371960468669 },
    { lat: 1.2916087570310637, lng: 103.77399319000621 },
    { lat: 1.2910784461615918, lng: 103.7750322099925 },
    { lat: 1.2906846450955234, lng: 103.77637263420257 },
    { lat: 1.2905452056098337, lng: 103.77699490669403 },
    { lat: 1.290390516588578, lng: 103.77721288070991 },
    { lat: 1.2901116375773143, lng: 103.77799072132423 },
    { lat: 1.2901623392994492, lng: 103.77831545051404 },
    { lat: 1.2904217289875417, lng: 103.77870809330916 },
    { lat: 1.2909848499678647, lng: 103.7793625523088 },
    { lat: 1.289969836877281, lng: 103.78045863684501 },
    { lat: 1.289664414595522, lng: 103.78177655326904 },
    { lat: 1.2902114465695746, lng: 103.78260267364563 },
    { lat: 1.2914664018302138, lng: 103.783750659104 },
    { lat: 1.2921070604282177, lng: 103.7845809194438 },
    { lat: 1.293134899847743, lng: 103.78561799160155 },
    { lat: 1.2943662309653878, lng: 103.78561449648741 },
  ];

  // Create red polyline for bottom boundary with connection points
  const bottomPolylinePath = [
    ...bottomCampusBoundary,
    { lat: 1.2924711660087167, lng: 103.79623264668385 },
    { lat: 1.142880113710714, lng: 171.45556008350204 },
    { lat: -61.06998094801668, lng: 167.55930473224873 },
    { lat: -57.10164716693408, lng: 64.90305473224875 },
    { lat: 0.4330389574208255, lng: 61.93316067193789 },
    { lat: 1.314415799754581, lng: 103.76018809355106 },
    { lat: 1.305554861947453, lng: 103.77152132256184 }, // Close the loop
  ];

  // Create bottom polygon with gray overlay
  const bottomOverlay = new google.maps.Polygon({
    paths: bottomPolylinePath,
    strokeColor: 'transparent',
    strokeOpacity: 0,
    strokeWeight: 0,
    fillColor: '#000000',
    fillOpacity: 0.4, // Increased opacity for more prominent dimming effect
    clickable: false, // Allow clicking through to get coordinates
  });
  bottomOverlay.setMap(map);
};

// Helper function to create D1 bus route polyline
const createD1BusRoute = (map: google.maps.Map): google.maps.Polyline => {
  const d1Route = new google.maps.Polyline({
    path: D1_BUS_ROUTE,
    geodesic: true,
    strokeColor: '#C77DE2', // D1 light purple color
    strokeOpacity: 1.0,
    strokeWeight: BUS_ROUTE_STROKE_WEIGHT,
  });
  d1Route.setMap(map);
  return d1Route;
};

// Helper function to create campus border with gray overlay outside
const createCampusBorderPolyline = (
  map: google.maps.Map
): { border: google.maps.Polyline; overlay: google.maps.Polygon | null } => {
  const campusBorder = new google.maps.Polyline({
    path: NUS_CAMPUS_BOUNDARY,
    geodesic: true,
    strokeColor: '#808080',
    strokeOpacity: 1.0,
    strokeWeight: 0.5,
  });
  campusBorder.setMap(map);

  createOverlayPolygons(map);

  return { border: campusBorder, overlay: null };
};

// Helper function to create orange area overlay
const createOrangeAreaOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const orangeArea = new google.maps.Polygon({
    paths: ORANGE_AREA_BOUNDARY,
    strokeColor: '#FF0000', // Red color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#FF0000', // Red fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  orangeArea.setMap(map);
  return orangeArea;
};

// Helper function to create blue area overlay
const createBlueAreaOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const blueArea = new google.maps.Polygon({
    paths: BLUE_AREA_BOUNDARY,
    strokeColor: '#1E90FF', // Blue color (Dodger Blue)
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#1E90FF', // Blue fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  blueArea.setMap(map);
  return blueArea;
};

// Helper function to create dark blue area overlay
const createDarkBlueAreaOverlay = (
  map: google.maps.Map
): google.maps.Polygon => {
  const darkBlueArea = new google.maps.Polygon({
    paths: DARK_BLUE_AREA_BOUNDARY,
    strokeColor: '#00008B', // Dark blue color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#00008B', // Dark blue fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  darkBlueArea.setMap(map);
  return darkBlueArea;
};

// Helper function to create yellow area overlay
const createYellowAreaOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const yellowArea = new google.maps.Polygon({
    paths: YELLOW_AREA_BOUNDARY,
    strokeColor: '#FA9E0D', // Kent Ridge color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#FA9E0D', // Kent Ridge fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  yellowArea.setMap(map);
  return yellowArea;
};

// Helper function to create dark orange area overlay
const createDarkOrangeAreaOverlay = (
  map: google.maps.Map
): google.maps.Polygon => {
  const darkOrangeArea = new google.maps.Polygon({
    paths: DARK_ORANGE_AREA_BOUNDARY,
    strokeColor: '#800080', // Purple color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#800080', // Purple fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  darkOrangeArea.setMap(map);
  return darkOrangeArea;
};

// Helper function to create CDE area overlay
const createCDEAreaOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const cdeArea = new google.maps.Polygon({
    paths: CDE_AREA_BOUNDARY,
    strokeColor: '#D7AE63', // CDE color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#D7AE63', // CDE fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  cdeArea.setMap(map);
  return cdeArea;
};

// Helper function to create FASS area overlay
const createFASSAreaOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const fassArea = new google.maps.Polygon({
    paths: FASS_AREA_BOUNDARY,
    strokeColor: '#006400', // Dark green color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#006400', // Dark green fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  fassArea.setMap(map);
  return fassArea;
};

// Helper function to create COM/BIZ area overlay
const createCOMBIZAreaOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const combizArea = new google.maps.Polygon({
    paths: COMBIZ_AREA_BOUNDARY,
    strokeColor: '#8B0000', // Dark red color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#8B0000', // Dark red fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  combizArea.setMap(map);
  return combizArea;
};

// Helper function to create LAW area overlay
const createLAWAreaOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const lawArea = new google.maps.Polygon({
    paths: LAW_AREA_BOUNDARY,
    strokeColor: '#FFFFFF', // White color
    strokeOpacity: 1.0,
    strokeWeight: ACADEMIC_STROKE_WEIGHT,
    fillColor: '#FFFFFF', // White fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  lawArea.setMap(map);
  return lawArea;
};

// Helper function to create PGPR overlay
const createPGPROverlay = (map: google.maps.Map): google.maps.Polygon => {
  const pgprOverlay = new google.maps.Polygon({
    paths: PGPR_BOUNDARY,
    strokeColor: '#136207', // PGPR green
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#136207', // PGPR green fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  pgprOverlay.setMap(map);
  return pgprOverlay;
};

// Helper function to create Light House overlay
const createLightHouseOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const lightHouseOverlay = new google.maps.Polygon({
    paths: LIGHTHOUSE_BOUNDARY,
    strokeColor: '#DDB42A', // Light House gold
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#DDB42A', // Light House gold fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  lightHouseOverlay.setMap(map);
  return lightHouseOverlay;
};

// Helper function to create Pioneer House overlay
const createPioneerHouseOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const pioneerHouseOverlay = new google.maps.Polygon({
    paths: PIONEER_HOUSE_BOUNDARY,
    strokeColor: '#2F3487', // Pioneer House deep blue
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#2F3487', // Pioneer House deep blue fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  pioneerHouseOverlay.setMap(map);
  return pioneerHouseOverlay;
};

// Helper function to create Helix House overlay
const createHelixHouseOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const helixHouseOverlay = new google.maps.Polygon({
    paths: HELIX_HOUSE_BOUNDARY,
    strokeColor: '#A51C38', // Helix House burgundy
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#A51C38', // Helix House burgundy fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  helixHouseOverlay.setMap(map);
  return helixHouseOverlay;
};

// Helper function to create King Edward VII Hall overlay
const createKingEdwardVIIHallOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const kingEdwardVIIHallOverlay = new google.maps.Polygon({
    paths: KING_EDWARD_VII_HALL_BOUNDARY,
    strokeColor: '#8B0000', // Deep dark red
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#8B0000', // Deep dark red
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  kingEdwardVIIHallOverlay.setMap(map);
  return kingEdwardVIIHallOverlay;
};

// Helper function to create Sheares Hall overlay
const createShearesHallOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const shearesHallOverlay = new google.maps.Polygon({
    paths: SHEARES_HALL_BOUNDARY,
    strokeColor: '#CC5500', // Deep burnt orange
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#CC5500', // Deep burnt orange
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  shearesHallOverlay.setMap(map);
  return shearesHallOverlay;
};

// Helper function to create Kent Ridge Hall overlay
const createKentRidgeHallOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const kentRidgeHallOverlay = new google.maps.Polygon({
    paths: KENT_RIDGE_HALL_BOUNDARY,
    strokeColor: '#1E3A8A', // Deep royal blue
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#1E3A8A', // Deep royal blue
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  kentRidgeHallOverlay.setMap(map);
  return kentRidgeHallOverlay;
};

// Helper function to create Temasek Hall overlay
const createTemasekHallOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const temasekHallOverlay = new google.maps.Polygon({
    paths: TEMASEK_HALL_BOUNDARY,
    strokeColor: '#4A5568', // Deep slate gray
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#4A5568', // Deep slate gray
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  temasekHallOverlay.setMap(map);
  return temasekHallOverlay;
};

// Helper function to create Eusoff Hall overlay
const createEusoffHallOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const eusoffHallOverlay = new google.maps.Polygon({
    paths: EUSOFF_HALL_BOUNDARY,
    strokeColor: '#B8860B', // Deep golden yellow
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#B8860B', // Deep golden yellow
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  eusoffHallOverlay.setMap(map);
  return eusoffHallOverlay;
};

// Helper function to create Raffles Hall overlay
const createRafflesHallOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const rafflesHallOverlay = new google.maps.Polygon({
    paths: RAFFLES_HALL_BOUNDARY,
    strokeColor: '#2D5016', // Deep forest green
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#2D5016', // Deep forest green
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  rafflesHallOverlay.setMap(map);
  return rafflesHallOverlay;
};

// Helper function to create CAPT overlay
const createCAPTOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const captOverlay = new google.maps.Polygon({
    paths: CAPT_BOUNDARY,
    strokeColor: '#7B123A', // CAPT burgundy
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#7B123A', // CAPT burgundy fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  captOverlay.setMap(map);
  return captOverlay;
};

// Helper function to create RC4 overlay
const createRC4Overlay = (map: google.maps.Map): google.maps.Polygon => {
  const rc4Overlay = new google.maps.Polygon({
    paths: RC4_BOUNDARY,
    strokeColor: '#219181', // RC4 teal
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#219181', // RC4 teal fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  rc4Overlay.setMap(map);
  return rc4Overlay;
};

// Helper function to create RVRC overlay
const createRVRCOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const rvrcOverlay = new google.maps.Polygon({
    paths: RVRC_BOUNDARY,
    strokeColor: '#48256A', // RVRC purple
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#48256A', // RVRC purple fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  rvrcOverlay.setMap(map);
  return rvrcOverlay;
};

// Helper function to create Tembusu College overlay
const createTembusuCollegeOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const tembusuOverlay = new google.maps.Polygon({
    paths: TEMBUSU_COLLEGE_BOUNDARY,
    strokeColor: '#02522F', // Tembusu dark green
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#02522F', // Tembusu dark green fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  tembusuOverlay.setMap(map);
  return tembusuOverlay;
};

// Helper function to create Valour House overlay
const createValourHouseOverlay = (map: google.maps.Map): google.maps.Polygon => {
  const valourOverlay = new google.maps.Polygon({
    paths: VALOUR_HOUSE_BOUNDARY,
    strokeColor: '#340860', // Valour deep purple
    strokeOpacity: 1.0,
    strokeWeight: RESIDENCE_STROKE_WEIGHT,
    fillColor: '#340860', // Valour deep purple fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  valourOverlay.setMap(map);
  return valourOverlay;
};

// Helper function to create area label with outline
const createAreaLabel = (
  map: google.maps.Map,
  position: { lat: number; lng: number },
  text: string,
  color: string
): google.maps.OverlayView | null => {
  if (typeof window === 'undefined' || !window.google) return null;

  class TextOverlay extends google.maps.OverlayView {
    private position: google.maps.LatLng;
    private text: string;
    private color: string;
    private div: HTMLDivElement | null = null;
    private fontSize: number = 14; // Default font size

    constructor(position: google.maps.LatLng, text: string, color: string) {
      super();
      this.position = position;
      this.text = text;
      this.color = color;
    }

    onAdd() {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.fontSize = `${this.fontSize}px`;
      div.style.fontWeight = 'bold';
      div.style.color = this.color;
      div.style.textShadow = `
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        -2px 0 0 #fff,
        2px 0 0 #fff,
        0 -2px 0 #fff,
        0 2px 0 #fff
      `;
      div.style.padding = '4px 8px';
      div.style.whiteSpace = 'pre-line';
      div.style.textAlign = 'center';
      div.style.userSelect = 'none';
      div.style.pointerEvents = 'none';
      div.textContent = this.text;

      this.div = div;
      const panes = this.getPanes();
      panes?.overlayLayer.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const overlayProjection = this.getProjection();
      const position = overlayProjection.fromLatLngToDivPixel(this.position);
      if (position) {
        this.div.style.left = position.x - this.div.offsetWidth / 2 + 'px';
        this.div.style.top = position.y - this.div.offsetHeight / 2 + 'px';
      }
    }

    onRemove() {
      if (this.div) {
        this.div.parentNode?.removeChild(this.div);
        this.div = null;
      }
    }

    // Method to update font size dynamically
    updateFontSize(newSize: number) {
      this.fontSize = newSize;
      if (this.div) {
        this.div.style.fontSize = `${this.fontSize}px`;
        // Redraw to recenter the label with new size
        this.draw();
      }
    }
  }

  const overlay = new TextOverlay(
    new google.maps.LatLng(position.lat, position.lng),
    text,
    color
  );
  overlay.setMap(map);
  return overlay;
};

// Hook to add NUS campus border and bus routes
const useNUSCampusHighlight = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapLoaded: boolean,
  showD1Route: boolean = false,
  showAcademicOverlays: boolean = false,
  showResidences: boolean = false
) => {
  const campusBorderRef = useRef<google.maps.Polyline | null>(null);
  const campusOverlayRef = useRef<google.maps.Polygon | null>(null);
  const d1RouteRef = useRef<google.maps.Polyline | null>(null);
  const orangeAreaRef = useRef<google.maps.Polygon | null>(null);
  const blueAreaRef = useRef<google.maps.Polygon | null>(null);
  const darkBlueAreaRef = useRef<google.maps.Polygon | null>(null);
  const yellowAreaRef = useRef<google.maps.Polygon | null>(null);
  const darkOrangeAreaRef = useRef<google.maps.Polygon | null>(null);
  const cdeAreaRef = useRef<google.maps.Polygon | null>(null);
  const fassAreaRef = useRef<google.maps.Polygon | null>(null);
  const combizAreaRef = useRef<google.maps.Polygon | null>(null);
  const lawAreaRef = useRef<google.maps.Polygon | null>(null);
  const greenAreaRef = useRef<google.maps.Polygon | null>(null);
  const yellowOverlayRef = useRef<google.maps.Polygon | null>(null);
  const blueOverlayRef = useRef<google.maps.Polygon | null>(null);
  const redOverlayRef = useRef<google.maps.Polygon | null>(null);
  const red2OverlayRef = useRef<google.maps.Polygon | null>(null);
  const blue2OverlayRef = useRef<google.maps.Polygon | null>(null);
  const green2OverlayRef = useRef<google.maps.Polygon | null>(null);
  const yellow3OverlayRef = useRef<google.maps.Polygon | null>(null);
  const blue3OverlayRef = useRef<google.maps.Polygon | null>(null);
  const red3OverlayRef = useRef<google.maps.Polygon | null>(null);
  const captOverlayRef = useRef<google.maps.Polygon | null>(null);
  const rc4OverlayRef = useRef<google.maps.Polygon | null>(null);
  const rvrcOverlayRef = useRef<google.maps.Polygon | null>(null);
  const tembusuOverlayRef = useRef<google.maps.Polygon | null>(null);
  const valourOverlayRef = useRef<google.maps.Polygon | null>(null);
  const orangeLabelRef = useRef<google.maps.OverlayView | null>(null);
  const blueLabelRef = useRef<google.maps.OverlayView | null>(null);
  const darkBlueLabelRef = useRef<google.maps.OverlayView | null>(null);
  const yellowLabelRef = useRef<google.maps.OverlayView | null>(null);
  const darkOrangeLabelRef = useRef<google.maps.OverlayView | null>(null);
  const cdeLabelRef = useRef<google.maps.OverlayView | null>(null);
  const fassLabelRef = useRef<google.maps.OverlayView | null>(null);
  const combizLabelRef = useRef<google.maps.OverlayView | null>(null);
  const lawLabelRef = useRef<google.maps.OverlayView | null>(null);
  const greenLabelRef = useRef<google.maps.OverlayView | null>(null);
  const yellowOverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const blueOverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const redOverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const red2OverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const blue2OverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const green2OverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const yellow3OverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const blue3OverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const red3OverlayLabelRef = useRef<google.maps.OverlayView | null>(null);
  const captLabelRef = useRef<google.maps.OverlayView | null>(null);
  const rc4LabelRef = useRef<google.maps.OverlayView | null>(null);
  const rvrcLabelRef = useRef<google.maps.OverlayView | null>(null);
  const tembusuLabelRef = useRef<google.maps.OverlayView | null>(null);
  const valourLabelRef = useRef<google.maps.OverlayView | null>(null);

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      !isMapLoaded ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Create campus border if it doesn't exist
    if (!campusBorderRef.current) {
      const timer = setTimeout(() => {
        if (map) {
          const { border } = createCampusBorderPolyline(map);
          campusBorderRef.current = border;
          campusOverlayRef.current = null;

          // Create orange area overlay
          orangeAreaRef.current = createOrangeAreaOverlay(map);
          orangeAreaRef.current.setMap(null); // Hide by default
          // Create orange area label "SPORTS"
          orangeLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2990960534214193, lng: 103.77794624049213 },
            'SPORT',
            '#FF0000'
          );
          orangeLabelRef.current?.setMap(null); // Hide by default

          // Create blue area overlay
          blueAreaRef.current = createBlueAreaOverlay(map);
          blueAreaRef.current.setMap(null); // Hide by default
          // Create blue area label "UTOWN"
          blueLabelRef.current = createAreaLabel(
            map,
            { lat: 1.305695124008919, lng: 103.77290615963199 },
            'UTR',
            '#1E90FF'
          );
          blueLabelRef.current?.setMap(null); // Hide by default

          // Create dark blue area overlay
          darkBlueAreaRef.current = createDarkBlueAreaOverlay(map);
          darkBlueAreaRef.current.setMap(null); // Hide by default
          // Create dark blue area label "MED/SCI"
          darkBlueLabelRef.current = createAreaLabel(
            map,
            { lat: 1.295951770530073, lng: 103.78078478404082 },
            'MED/SCI',
            '#00008B'
          );
          darkBlueLabelRef.current?.setMap(null); // Hide by default

          // Create yellow area overlay
          yellowAreaRef.current = createYellowAreaOverlay(map);
          yellowAreaRef.current.setMap(null); // Hide by default
          // Create yellow area label "KENT RIDGE"
          yellowLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2937457075873078, lng: 103.78336899527181 },
            'KR MRT',
            '#FA9E0D'
          );
          yellowLabelRef.current?.setMap(null); // Hide by default

          // Create dark orange area overlay
          darkOrangeAreaRef.current = createDarkOrangeAreaOverlay(map);
          darkOrangeAreaRef.current.setMap(null); // Hide by default
          // Create dark orange area label "YST"
          darkOrangeLabelRef.current = createAreaLabel(
            map,
            { lat: 1.3018492354213917, lng: 103.77272979247682 },
            'YST',
            '#800080'
          );
          darkOrangeLabelRef.current?.setMap(null); // Hide by default

          // Create CDE area overlay
          cdeAreaRef.current = createCDEAreaOverlay(map);
          cdeAreaRef.current.setMap(null); // Hide by default
          // Create CDE area label "CDE"
          cdeLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2990029724316363, lng: 103.77161389712826 },
            'CDE',
            '#D7AE63'
          );
          cdeLabelRef.current?.setMap(null); // Hide by default

          // Create FASS area overlay
          fassAreaRef.current = createFASSAreaOverlay(map);
          fassAreaRef.current.setMap(null); // Hide by default
          // Create FASS area label "FASS"
          fassLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2949347901037016, lng: 103.77176426036192 },
            'FASS',
            '#006400'
          );
          fassLabelRef.current?.setMap(null); // Hide by default

          // Create COM/BIZ area overlay
          combizAreaRef.current = createCOMBIZAreaOverlay(map);
          combizAreaRef.current.setMap(null); // Hide by default
          // Create COM/BIZ area label "COM/BIZ"
          combizLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2941306571549018, lng: 103.77457744749852 },
            'COM/BIZ',
            '#8B0000'
          );
          combizLabelRef.current?.setMap(null); // Hide by default

          // Create LAW area overlay
          lawAreaRef.current = createLAWAreaOverlay(map);
          lawAreaRef.current.setMap(null); // Hide by default
          // Create LAW area label "LAW"
          lawLabelRef.current = createAreaLabel(
            map,
            { lat: 1.3188644513003345, lng: 103.81741654343233 },
            'LAW',
            '#000000'
          );
          lawLabelRef.current?.setMap(null); // Hide by default

          // Create PGPR overlay
          greenAreaRef.current = createPGPROverlay(map);
          greenAreaRef.current.setMap(showResidences ? map : null);
          // Create PGPR label
          greenLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2908564398572488, lng: 103.78115242371081 },
            'PGPR',
            '#136207'
          );
          greenLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Light House overlay
          yellowOverlayRef.current = createLightHouseOverlay(map);
          yellowOverlayRef.current.setMap(showResidences ? map : null);
          // Create Light House label
          yellowOverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2903737647145226, lng: 103.78176933178423 },
            'Light\nHouse',
            '#DDB42A'
          );
          yellowOverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Pioneer House overlay
          blueOverlayRef.current = createPioneerHouseOverlay(map);
          blueOverlayRef.current.setMap(showResidences ? map : null);
          // Create Pioneer House label
          blueOverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2905329951204991, lng: 103.78035117482061 },
            'Pioneer\nHouse',
            '#2F3487'
          );
          blueOverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Helix House overlay
          redOverlayRef.current = createHelixHouseOverlay(map);
          redOverlayRef.current.setMap(showResidences ? map : null);
          // Create Helix House label
          redOverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2912349696754788, lng: 103.77971375085811 },
            'Helix\nHouse',
            '#A51C38'
          );
          redOverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create King Edward VII Hall overlay
          red2OverlayRef.current = createKingEdwardVIIHallOverlay(map);
          red2OverlayRef.current.setMap(showResidences ? map : null);
          // Create King Edward VII Hall label
          red2OverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2923996774032545, lng: 103.78080979615915 },
            'King\nEdward VII\nHall',
            '#8B0000'
          );
          red2OverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Sheares Hall overlay
          blue2OverlayRef.current = createShearesHallOverlay(map);
          blue2OverlayRef.current.setMap(showResidences ? map : null);
          // Create Sheares Hall label
          blue2OverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2912160923055316, lng: 103.77564572758939 },
            'Sheares\nHall',
            '#CC5500'
          );
          blue2OverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Kent Ridge Hall overlay
          green2OverlayRef.current = createKentRidgeHallOverlay(map);
          green2OverlayRef.current.setMap(showResidences ? map : null);
          // Create Kent Ridge Hall label
          green2OverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2916305737435196, lng: 103.77455217105798 },
            'Kent Ridge\nHall',
            '#1E3A8A'
          );
          green2OverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Temasek Hall overlay
          yellow3OverlayRef.current = createTemasekHallOverlay(map);
          yellow3OverlayRef.current.setMap(showResidences ? map : null);
          // Create Temasek Hall label
          yellow3OverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2927025650139552, lng: 103.7712758453672 },
            'Temasek\nHall',
            '#4A5568'
          );
          yellow3OverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Eusoff Hall overlay
          blue3OverlayRef.current = createEusoffHallOverlay(map);
          blue3OverlayRef.current.setMap(showResidences ? map : null);
          // Create Eusoff Hall label
          blue3OverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2934533922859488, lng: 103.77004202922035 },
            'Eusoff\nHall',
            '#B8860B'
          );
          blue3OverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Raffles Hall overlay
          red3OverlayRef.current = createRafflesHallOverlay(map);
          red3OverlayRef.current.setMap(showResidences ? map : null);
          // Create Raffles Hall label
          red3OverlayLabelRef.current = createAreaLabel(
            map,
            { lat: 1.3001223325818445, lng: 103.77323746139996 },
            'Raffles\nHall',
            '#2D5016'
          );
          red3OverlayLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create CAPT overlay
          captOverlayRef.current = createCAPTOverlay(map);
          captOverlayRef.current.setMap(showResidences ? map : null);
          // Create CAPT label
          captLabelRef.current = createAreaLabel(
            map,
            { lat: 1.3077614832236284, lng: 103.77323095140937 },
            'CAPT',
            '#7B123A'
          );
          captLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create RC4 overlay
          rc4OverlayRef.current = createRC4Overlay(map);
          rc4OverlayRef.current.setMap(showResidences ? map : null);
          // Create RC4 label
          rc4LabelRef.current = createAreaLabel(
            map,
            { lat: 1.3082848566232612, lng: 103.773192677322 },
            'RC4',
            '#219181'
          );
          rc4LabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create RVRC overlay
          rvrcOverlayRef.current = createRVRCOverlay(map);
          rvrcOverlayRef.current.setMap(showResidences ? map : null);
          // Create RVRC label
          rvrcLabelRef.current = createAreaLabel(
            map,
            { lat: 1.2981, lng: 103.77615 },
            'RVRC',
            '#48256A'
          );
          rvrcLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Tembusu College overlay
          tembusuOverlayRef.current = createTembusuCollegeOverlay(map);
          tembusuOverlayRef.current.setMap(showResidences ? map : null);
          // Create Tembusu College label
          tembusuLabelRef.current = createAreaLabel(
            map,
            { lat: 1.3059935426292466, lng: 103.77373965317965 },
            'Tembusu',
            '#02522F'
          );
          tembusuLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom

          // Create Valour House overlay
          valourOverlayRef.current = createValourHouseOverlay(map);
          valourOverlayRef.current.setMap(showResidences ? map : null);
          // Create Valour House label
          valourLabelRef.current = createAreaLabel(
            map,
            { lat: 1.300447491985533, lng: 103.7750264300059 },
            'Valour\nHouse',
            '#340860'
          );
          valourLabelRef.current?.setMap(null); // Hidden by default, controlled by zoom
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [mapRef, isMapLoaded, showResidences]);

  // Separate effect for D1 route visibility
  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      !isMapLoaded ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    if (showD1Route && !d1RouteRef.current) {
      // Create and show D1 route
      d1RouteRef.current = createD1BusRoute(map);
    } else if (!showD1Route && d1RouteRef.current) {
      // Hide D1 route
      d1RouteRef.current.setMap(null);
      d1RouteRef.current = null;
    }
  }, [mapRef, isMapLoaded, showD1Route]);

  // Separate effect for academic overlays visibility
  useEffect(() => {
    const map = mapRef.current;

    // Don't run if map isn't loaded or overlays aren't created yet
    if (!map || !isMapLoaded) {
      return;
    }

    // Toggle visibility of all academic overlays
    const overlays = [
      orangeAreaRef.current,
      blueAreaRef.current,
      darkBlueAreaRef.current,
      yellowAreaRef.current,
      darkOrangeAreaRef.current,
      cdeAreaRef.current,
      fassAreaRef.current,
      combizAreaRef.current,
      lawAreaRef.current,
    ];

    const labels = [
      orangeLabelRef.current,
      blueLabelRef.current,
      darkBlueLabelRef.current,
      yellowLabelRef.current,
      darkOrangeLabelRef.current,
      cdeLabelRef.current,
      fassLabelRef.current,
      combizLabelRef.current,
      lawLabelRef.current,
    ];

    overlays.forEach((overlay) => {
      if (overlay) {
        overlay.setMap(showAcademicOverlays ? map : null);
      }
    });

    labels.forEach((label) => {
      if (label) {
        label.setMap(showAcademicOverlays ? map : null);
      }
    });
  }, [showAcademicOverlays, mapRef, isMapLoaded]);

  // Separate effect for residence overlays visibility
  useEffect(() => {
    const map = mapRef.current;

    // Don't run if map isn't loaded or overlays aren't created yet
    if (!map || !isMapLoaded) {
      return;
    }

    // Toggle visibility of all residence overlays
    const overlays = [
      greenAreaRef.current,
      yellowOverlayRef.current,
      blueOverlayRef.current,
      redOverlayRef.current,
      red2OverlayRef.current,
      blue2OverlayRef.current,
      green2OverlayRef.current,
      yellow3OverlayRef.current,
      blue3OverlayRef.current,
      red3OverlayRef.current,
      captOverlayRef.current,
      rc4OverlayRef.current,
      rvrcOverlayRef.current,
      tembusuOverlayRef.current,
      valourOverlayRef.current,
    ];

    const labels = [
      greenLabelRef.current,
      yellowOverlayLabelRef.current,
      blueOverlayLabelRef.current,
      redOverlayLabelRef.current,
      red2OverlayLabelRef.current,
      blue2OverlayLabelRef.current,
      green2OverlayLabelRef.current,
      yellow3OverlayLabelRef.current,
      blue3OverlayLabelRef.current,
      red3OverlayLabelRef.current,
      captLabelRef.current,
      rc4LabelRef.current,
      rvrcLabelRef.current,
      tembusuLabelRef.current,
      valourLabelRef.current,
    ];

    overlays.forEach((overlay) => {
      if (overlay) {
        overlay.setMap(showResidences ? map : null);
      }
    });

    labels.forEach((label) => {
      if (label) {
        label.setMap(showResidences ? map : null);
      }
    });
  }, [showResidences, mapRef, isMapLoaded]);

  // Effect to handle zoom-based font size updates for academic area labels
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !isMapLoaded ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Function to calculate font size based on zoom level
    const getFontSizeForZoom = (zoom: number): number => {
      // Base font size at zoom 16 (default)
      if (zoom <= 13) {
        return 0; // Hidden at zoom 13 and below
      } else if (zoom === 14) {
        return 9; // Smaller at far zoom
      } else if (zoom === 15) {
        return 12; // Slightly smaller
      } else if (zoom === 16) {
        return 14; // Default size
      } else if (zoom === 17) {
        return 16; // Slightly larger
      } else if (zoom === 18) {
        return 18; // Larger
      } else {
        return 20; // Maximum size at high zoom
      }
    };

    // Function to update all label font sizes and visibility
    const updateLabelSizes = () => {
      const zoom = map.getZoom() || 16;
      const fontSize = getFontSizeForZoom(zoom);
      const shouldHide = zoom <= 13;

      const labels = [
        orangeLabelRef.current,
        blueLabelRef.current,
        darkBlueLabelRef.current,
        yellowLabelRef.current,
        darkOrangeLabelRef.current,
        cdeLabelRef.current,
        fassLabelRef.current,
        combizLabelRef.current,
        lawLabelRef.current,
      ];

      labels.forEach((label) => {
        if (label) {
          if (shouldHide) {
            // Hide the label by setting map to null
            label.setMap(null);
          } else {
            // Show the label if academic overlays are enabled
            if (showAcademicOverlays) {
              label.setMap(map);
            }
            // Update font size
            if (typeof (label as any).updateFontSize === 'function') {
              (label as any).updateFontSize(fontSize);
            }
          }
        }
      });
    };

    // Set up zoom change listener
    const zoomListener = map.addListener('zoom_changed', updateLabelSizes);

    // Initial update
    updateLabelSizes();

    // Cleanup
    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
    };
  }, [mapRef, isMapLoaded, showAcademicOverlays]);

  // Effect to handle zoom-based visibility for hall labels (show only at zoom >= 17)
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !isMapLoaded ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Function to update hall label visibility based on zoom level
    const updateHallLabelVisibility = () => {
      const zoom = map.getZoom() || 16;
      const shouldShow = zoom >= 17 && showResidences;

      const hallLabels = [
        greenLabelRef.current, // PGPR
        yellowOverlayLabelRef.current, // Light House
        blueOverlayLabelRef.current, // Pioneer House
        redOverlayLabelRef.current, // Helix House
        red2OverlayLabelRef.current, // King Edward VII Hall
        blue2OverlayLabelRef.current, // Sheares Hall
        green2OverlayLabelRef.current, // Kent Ridge Hall
        yellow3OverlayLabelRef.current, // Temasek Hall
        blue3OverlayLabelRef.current, // Eusoff Hall
        red3OverlayLabelRef.current, // Raffles Hall
        captLabelRef.current, // CAPT
        rc4LabelRef.current, // RC4
        rvrcLabelRef.current, // Ridge View Residential College
        tembusuLabelRef.current, // Tembusu College
        valourLabelRef.current, // Valour House
      ];

      hallLabels.forEach((label) => {
        if (label) {
          if (shouldShow) {
            label.setMap(map);
          } else {
            label.setMap(null);
          }
        }
      });
    };

    // Set up zoom change listener
    const zoomListener = map.addListener('zoom_changed', updateHallLabelVisibility);

    // Initial update
    updateHallLabelVisibility();

    // Cleanup
    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
    };
  }, [mapRef, isMapLoaded, showResidences]);
};

const addMarkersAndFitBounds = ({
  map,
  origin,
  waypoints,
  destination,
  onMarkerPress,
  shouldFitBounds = true,
}: {
  map: google.maps.Map;
  origin?: LatLng;
  waypoints?: LatLng[];
  destination?: LatLng;
  onMarkerPress?: (
    type: 'origin' | 'destination' | 'waypoint',
    index?: number
  ) => void;
  shouldFitBounds?: boolean;
}): google.maps.Marker[] => {
  const markers: google.maps.Marker[] = [];
  const bounds = new google.maps.LatLngBounds();
  let hasMarkers = false;

  // Don't create origin marker - we already have the user location marker
  // if (origin) {
  //   const marker = createMarker({
  //     position: { lat: origin.lat, lng: origin.lng },
  //     map,
  //     title: 'Your Location',
  //     color: '#274F9C',
  //     scale: 10,
  //     onClick: () => onMarkerPress?.('origin'),
  //   });
  //   if (marker) {
  //     markers.push(marker);
  //     bounds.extend(marker.getPosition()!);
  //     hasMarkers = true;
  //   }
  // }

  // Still extend bounds with origin position for proper map fitting
  if (origin) {
    bounds.extend({ lat: origin.lat, lng: origin.lng });
    hasMarkers = true;
  }

  waypoints?.forEach((waypoint, index) => {
    const marker = createMarker({
      position: { lat: waypoint.lat, lng: waypoint.lng },
      map,
      title: `Stop ${index + 1}`,
      color: '#FF8C00',
      scale: 8,
      onClick: () => onMarkerPress?.('waypoint', index),
    });
    if (marker) {
      markers.push(marker);
      bounds.extend(marker.getPosition()!);
      hasMarkers = true;
    }
  });

  // Don't create destination marker here - it's handled by useDestinationMarker hook
  // This prevents the default circle marker from appearing
  if (destination) {
    // Just extend bounds to include destination for proper map framing
    bounds.extend(new google.maps.LatLng(destination.lat, destination.lng));
    hasMarkers = true;
  }

  if (hasMarkers && shouldFitBounds) {
    map.fitBounds(bounds, PADDING);
  }

  return markers;
};

const useMapMarkers = ({
  mapRef,
  origin,
  destination,
  waypoints = [],
  onMarkerPress,
  activeRoute,
}: {
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  origin?: LatLng;
  destination?: LatLng;
  waypoints?: LatLng[];
  onMarkerPress?: (
    type: 'origin' | 'destination' | 'waypoint',
    index?: number
  ) => void;
  activeRoute?: RouteCode | null;
}) => {
  const markersRef = useRef<google.maps.Marker[]>([]);
  const hasFitBoundsRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Note: We now allow markers even when activeRoute is set, so internal routes show origin/dest
    // Only fit bounds on the first render or when there are no markers yet
    const shouldFitBounds = !hasFitBoundsRef.current;
    
    markersRef.current = addMarkersAndFitBounds({
      map: mapRef.current,
      origin,
      waypoints,
      destination,
      onMarkerPress,
      shouldFitBounds,
    });

    // Mark that we've done the initial fit
    if (shouldFitBounds) {
      hasFitBoundsRef.current = true;
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [origin, destination, waypoints, onMarkerPress, mapRef, activeRoute]);

  // Reset hasFitBoundsRef when activeRoute changes to null (user clears route)
  useEffect(() => {
    if (!activeRoute) {
      hasFitBoundsRef.current = false;
    }
  }, [activeRoute]);
};

const useMapPolyline = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  routePolyline?: string,
  routeSteps?: RouteStep[]
) => {
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const hasFitBoundsRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    // Clear existing polylines
    polylinesRef.current.forEach((poly) => poly.setMap(null));
    polylinesRef.current = [];

    // Only fit bounds on first render
    const shouldFitBounds = !hasFitBoundsRef.current;

    // If we have individual steps, render them with different colors
    if (routeSteps && routeSteps.length > 0) {
      const bounds = new google.maps.LatLngBounds();

      routeSteps.forEach((step) => {
        if (!step.polyline?.encodedPolyline) return;

        const decodedPath = polyline
          .decode(step.polyline.encodedPolyline)
          .map(([lat, lng]) => ({ lat, lng }));

        // Determine color based on travel mode
        let strokeColor = '#9CA3AF'; // Default gray for walking
        let polylineOptions: google.maps.PolylineOptions = {
          path: decodedPath,
          geodesic: true,
          strokeColor,
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map: mapRef.current,
        };

        if (step.travelMode === 'TRANSIT' && step.transitDetails) {
          const lineName =
            step.transitDetails.transitLine.nameShort ||
            step.transitDetails.transitLine.name;

          // Try to get color from API first
          const apiColor = step.transitDetails.transitLine.color;
          if (apiColor) {
            strokeColor = apiColor.startsWith('#') ? apiColor : `#${apiColor}`;
          } else {
            // Fallback to helper function
            strokeColor = getTransitLineColor(lineName);
          }
          polylineOptions.strokeColor = strokeColor;
          polylineOptions.zIndex = 10; // Higher z-index for solid transit lines
        } else if (step.travelMode === 'WALK') {
          strokeColor = '#274F9C'; // Blue for walking
          // Make walking segments dotted (same style as connector lines)
          polylineOptions.strokeColor = strokeColor;
          polylineOptions.strokeOpacity = 0;
          polylineOptions.zIndex = 5; // Lower z-index for dotted walking lines
          polylineOptions.icons = [
            {
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#274F9C',
                fillOpacity: 0.8,
                strokeColor: '#274F9C',
                strokeOpacity: 1,
                strokeWeight: 0,
                scale: 2,
              },
              offset: '0',
              repeat: '10px',
            },
          ];
        }

        const stepPolyline = new google.maps.Polyline(polylineOptions);

        polylinesRef.current.push(stepPolyline);

        // Extend bounds for this step
        decodedPath.forEach((point) => bounds.extend(point));
      });

      // Fit map to show all steps
      if (!bounds.isEmpty() && shouldFitBounds) {
        mapRef.current.fitBounds(bounds, ROUTE_FIT_BOUNDS_PADDING);
        hasFitBoundsRef.current = true;
      }
    }
    // Fallback to single polyline if no steps provided
    else if (routePolyline) {
      const decodedPath = polyline
        .decode(routePolyline)
        .map(([lat, lng]) => ({ lat, lng }));

      const singlePolyline = new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: '#274F9C',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: mapRef.current,
      });

      polylinesRef.current.push(singlePolyline);

      // Fit map bounds to show entire route
      const bounds = new google.maps.LatLngBounds();
      decodedPath.forEach((point) => bounds.extend(point));
      if (shouldFitBounds) {
        mapRef.current.fitBounds(bounds, ROUTE_FIT_BOUNDS_PADDING);
        hasFitBoundsRef.current = true;
      }
    }

    return () => {
      polylinesRef.current.forEach((poly) => poly.setMap(null));
    };
  }, [routePolyline, routeSteps, mapRef]);
};

// Hook to render internal shuttle bus route polylines
const useInternalRoutePolyline = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  internalRoutePolylines?: {
    walkToStop: google.maps.LatLngLiteral[];
    busSegment: google.maps.LatLngLiteral[];
    walkFromStop: google.maps.LatLngLiteral[];
    busRouteColor?: string;
  } | null
) => {
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const hasFitBoundsRef = useRef(false);

  // Serialize the polylines data to create a stable dependency
  const polylinesKey = useMemo(() => {
    if (!internalRoutePolylines) return null;
    
    // Safely access arrays with fallback to empty arrays
    const walkToStop = Array.isArray(internalRoutePolylines.walkToStop) 
      ? internalRoutePolylines.walkToStop 
      : [];
    const busSegment = Array.isArray(internalRoutePolylines.busSegment) 
      ? internalRoutePolylines.busSegment 
      : [];
    const walkFromStop = Array.isArray(internalRoutePolylines.walkFromStop) 
      ? internalRoutePolylines.walkFromStop 
      : [];
    
    return JSON.stringify({
      walkToStopLength: walkToStop.length,
      busSegmentLength: busSegment.length,
      walkFromStopLength: walkFromStop.length,
      busRouteColor: internalRoutePolylines.busRouteColor || '',
      // Include first and last points to detect actual route changes
      walkToStopFirst: walkToStop[0] || null,
      busSegmentFirst: busSegment[0] || null,
      walkFromStopLast: walkFromStop[walkFromStop.length - 1] || null,
    });
  }, [
    internalRoutePolylines?.walkToStop,
    internalRoutePolylines?.busSegment,
    internalRoutePolylines?.walkFromStop,
    internalRoutePolylines?.busRouteColor,
  ]);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    // Clear existing polylines
    polylinesRef.current.forEach((poly) => poly.setMap(null));
    polylinesRef.current = [];

    if (!internalRoutePolylines) return;

    const bounds = new google.maps.LatLngBounds();
    const shouldFitBounds = !hasFitBoundsRef.current;

    // 1. Render walking to stop (dotted blue line)
    if (Array.isArray(internalRoutePolylines.walkToStop) && internalRoutePolylines.walkToStop.length > 0) {
      const walkToStopPolyline = new google.maps.Polyline({
        path: internalRoutePolylines.walkToStop,
        geodesic: true,
        strokeColor: '#274F9C',
        strokeOpacity: 0,
        strokeWeight: 0,
        zIndex: 5,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#274F9C',
              fillOpacity: 0.8,
              strokeColor: '#274F9C',
              strokeOpacity: 1,
              strokeWeight: 0,
              scale: 2,
            },
            offset: '0',
            repeat: '10px',
          },
        ],
        map: mapRef.current,
      });
      polylinesRef.current.push(walkToStopPolyline);
      internalRoutePolylines.walkToStop.forEach((point) => bounds.extend(point));
    }

    // 2. Render bus segment (solid colored line)
    if (Array.isArray(internalRoutePolylines.busSegment) && internalRoutePolylines.busSegment.length > 0) {
      const busColor = internalRoutePolylines.busRouteColor || '#6F1B6F'; // Default to D2 purple
      const busSegmentPolyline = new google.maps.Polyline({
        path: internalRoutePolylines.busSegment,
        geodesic: true,
        strokeColor: busColor,
        strokeOpacity: 1.0,
        strokeWeight: 4,
        zIndex: 10,
        map: mapRef.current,
      });
      polylinesRef.current.push(busSegmentPolyline);
      internalRoutePolylines.busSegment.forEach((point) => bounds.extend(point));
    }

    // 3. Render walking from stop (dotted blue line)
    if (Array.isArray(internalRoutePolylines.walkFromStop) && internalRoutePolylines.walkFromStop.length > 0) {
      const walkFromStopPolyline = new google.maps.Polyline({
        path: internalRoutePolylines.walkFromStop,
        geodesic: true,
        strokeColor: '#274F9C',
        strokeOpacity: 0,
        strokeWeight: 0,
        zIndex: 5,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#274F9C',
              fillOpacity: 0.8,
              strokeColor: '#274F9C',
              strokeOpacity: 1,
              strokeWeight: 0,
              scale: 2,
            },
            offset: '0',
            repeat: '10px',
          },
        ],
        map: mapRef.current,
      });
      polylinesRef.current.push(walkFromStopPolyline);
      internalRoutePolylines.walkFromStop.forEach((point) => bounds.extend(point));
    }

    // Fit map to show entire internal route
    if (!bounds.isEmpty() && shouldFitBounds) {
      mapRef.current.fitBounds(bounds, ROUTE_FIT_BOUNDS_PADDING);
      hasFitBoundsRef.current = true;
    }

    return () => {
      polylinesRef.current.forEach((poly) => poly.setMap(null));
    };
  }, [polylinesKey, mapRef]);
};

// Hook to draw dotted connector lines from user location to route start and route end to destination
const useConnectorLines = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  origin?: LatLng,
  destination?: LatLng,
  routePolyline?: string,
  routeSteps?: RouteStep[],
  internalRoutePolylines?: {
    walkToStop: google.maps.LatLngLiteral[];
    busSegment: google.maps.LatLngLiteral[];
    walkFromStop: google.maps.LatLngLiteral[];
    busRouteColor?: string;
  } | null,
  showRouteConnectors: boolean = false
) => {
  const startConnectorRef = useRef<google.maps.Polyline | null>(null);
  const endConnectorRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!showRouteConnectors) {
      if (startConnectorRef.current) {
        startConnectorRef.current.setMap(null);
        startConnectorRef.current = null;
      }
      if (endConnectorRef.current) {
        endConnectorRef.current.setMap(null);
        endConnectorRef.current = null;
      }
      return;
    }
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    const decodePolylinePath = (encoded?: string) => {
      if (!encoded) return [] as google.maps.LatLngLiteral[];
      return polyline.decode(encoded).map(([lat, lng]) => ({ lat, lng }));
    };

    const resolveRouteEndpoints = () => {
      if (routePolyline) {
        const decodedPath = decodePolylinePath(routePolyline);
        if (decodedPath.length > 0) {
          return {
            routeStart: decodedPath[0],
            routeEnd: decodedPath[decodedPath.length - 1],
          };
        }
      }

      if (Array.isArray(routeSteps) && routeSteps.length > 0) {
        const firstStep = routeSteps[0];
        const lastStep = routeSteps[routeSteps.length - 1];
        const stepStart = firstStep?.startLocation?.latLng;
        const stepEnd = lastStep?.endLocation?.latLng;

        if (stepStart && stepEnd) {
          return {
            routeStart: { lat: stepStart.latitude, lng: stepStart.longitude },
            routeEnd: { lat: stepEnd.latitude, lng: stepEnd.longitude },
          };
        }

        const firstPolylineStep = routeSteps.find(
          (step) => step.polyline?.encodedPolyline
        );
        const lastPolylineStep = [...routeSteps]
          .reverse()
          .find((step) => step.polyline?.encodedPolyline);

        if (firstPolylineStep?.polyline?.encodedPolyline) {
          const firstPath = decodePolylinePath(
            firstPolylineStep.polyline.encodedPolyline
          );
          const lastPath = lastPolylineStep?.polyline?.encodedPolyline
            ? decodePolylinePath(lastPolylineStep.polyline.encodedPolyline)
            : firstPath;

          if (firstPath.length > 0 && lastPath.length > 0) {
            return {
              routeStart: firstPath[0],
              routeEnd: lastPath[lastPath.length - 1],
            };
          }
        }
      }

      if (internalRoutePolylines) {
        const walkToStop = Array.isArray(internalRoutePolylines.walkToStop)
          ? internalRoutePolylines.walkToStop
          : [];
        const walkFromStop = Array.isArray(internalRoutePolylines.walkFromStop)
          ? internalRoutePolylines.walkFromStop
          : [];
        const busSegment = Array.isArray(internalRoutePolylines.busSegment)
          ? internalRoutePolylines.busSegment
          : [];

        const routeStart =
          busSegment.length > 0
            ? busSegment[0]
            : walkToStop.length > 0
              ? walkToStop[0]
              : undefined;
        const routeEnd =
          busSegment.length > 0
            ? busSegment[busSegment.length - 1]
            : walkFromStop.length > 0
              ? walkFromStop[walkFromStop.length - 1]
              : undefined;

        if (routeStart && routeEnd) {
          return { routeStart, routeEnd };
        }
      }

      return null;
    };

    // Remove existing connector lines
    if (startConnectorRef.current) {
      startConnectorRef.current.setMap(null);
      startConnectorRef.current = null;
    }
    if (endConnectorRef.current) {
      endConnectorRef.current.setMap(null);
      endConnectorRef.current = null;
    }

    const endpoints = resolveRouteEndpoints();

    if (endpoints) {
      const { routeStart, routeEnd } = endpoints;

      // Draw dotted line from user/origin location to route start
      if (origin) {
        const userLocation = { lat: origin.lat, lng: origin.lng };
        startConnectorRef.current = new google.maps.Polyline({
          path: [userLocation, routeStart],
          geodesic: true,
          strokeColor: '#274F9C',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          zIndex: 50,
          clickable: false,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#274F9C',
                fillOpacity: 0.8,
                strokeColor: '#274F9C',
                strokeOpacity: 1,
                strokeWeight: 0,
                scale: 3,
              },
              offset: '0',
              repeat: '8px',
            },
          ],
          map: mapRef.current,
        });
      }

      // Draw dotted line from route end to destination
      if (destination) {
        const destinationLocation = {
          lat: destination.lat,
          lng: destination.lng,
        };
        endConnectorRef.current = new google.maps.Polyline({
          path: [routeEnd, destinationLocation],
          geodesic: true,
          strokeColor: '#274F9C',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          zIndex: 50,
          clickable: false,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#274F9C',
                fillOpacity: 0.8,
                strokeColor: '#274F9C',
                strokeOpacity: 1,
                strokeWeight: 0,
                scale: 3,
              },
              offset: '0',
              repeat: '8px',
            },
          ],
          map: mapRef.current,
        });
      }
    }

    return () => {
      if (startConnectorRef.current) {
        startConnectorRef.current.setMap(null);
      }
      if (endConnectorRef.current) {
        endConnectorRef.current.setMap(null);
      }
    };
  }, [origin, destination, routePolyline, routeSteps, internalRoutePolylines, mapRef, showRouteConnectors]);
};

// Hook to render bus stop markers with labels
const useBusStopMarkers = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  showBusStops: boolean,
  activeRoute?: RouteCode | null,
  routeColor?: string,
  visibleBusStopsColor?: string,
  visibleBusStops?: string[], // Optional array of stop names to show
  onBusStopSelected?: (stop: BusStop) => void,
  selectedStopId?: string | null
) => {
  const circleMarkersRef = useRef<google.maps.Marker[]>([]);
  const labelMarkersRef = useRef<google.maps.Marker[]>([]);
  const { data: busStopsData } = useBusStops();
  const { data: pickupPointsData } = usePickupPoints(activeRoute as RouteCode);

  useEffect(() => {
    if (
      !mapRef.current ||
      !isMapCreated ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Clear existing markers
    circleMarkersRef.current.forEach((marker) => marker.setMap(null));
    labelMarkersRef.current.forEach((marker) => marker.setMap(null));
    circleMarkersRef.current = [];
    labelMarkersRef.current = [];

    if (!showBusStops || !busStopsData?.BusStopsResult?.busstops) {
      return;
    }

    const map = mapRef.current;
    const busStops = busStopsData.BusStopsResult.busstops;
    const visibleBusStopsSet = new Set(visibleBusStops ?? []);

    // Get the pickup points for the active route (stops that belong to this route)
    const routeStopNames = new Set<string>();
    if (activeRoute && pickupPointsData?.PickupPointResult?.pickuppoint) {
      pickupPointsData.PickupPointResult.pickuppoint.forEach((pp: any) => {
        routeStopNames.add(pp.ShortName);
      });
    }

    // Log all bus stop names to debug
    console.log(
      'All bus stops:',
      busStops.map((s: BusStop) => ({
        name: s.name,
        ShortName: s.ShortName,
        caption: s.caption,
      }))
    );

    // Priority stops shown at zoom level 14 (minimal set of key locations)
    const zoom14PriorityStops = [
      'KR MRT',
      'PGP',
      'COM 3',
      'KR Bus Ter',
      'CLB',
      'EA',
      'Museum',
      'UTown',
      'UHC',
      'S 17',
      'UHall',
      'TCOMS',
    ];

    // Priority stops that should be shown at zoom level 15-16 (expanded key locations)
    // Use exact matches for ShortName to avoid partial matching issues
    const priorityStops = [
      'BIZ 2',
      'COM 3',
      'TCOMS',
      'PGP',
      'PGP Foyer',
      'KR MRT',
      'S 17',
      'UHall',
      'UHC',
      'YIH',
      'Museum',
      'Kent Vale',
      'EA',
      'UTown',
      'SDE3',
      'KR Bus Ter',
      'Ventus',
      'CLB',
      'Opp NUSS',
      'College Gr',
      'BG MRT',
      'OTH Bldg',
    ];

    // Function to check if a stop is a zoom 14 priority stop
    const isZoom14PriorityStop = (stop: BusStop) => {
      return zoom14PriorityStops.some(
        (priority) =>
          stop.ShortName === priority || stop.ShortName.trim() === priority
      );
    };

    // Function to check if a stop is a priority stop (zoom 15-16)
    const isPriorityStop = (stop: BusStop) => {
      // Use exact match for ShortName to avoid "UHall" matching "Opp UHall"
      const isMatch = priorityStops.some(
        (priority) =>
          stop.ShortName === priority || stop.ShortName.trim() === priority
      );
      return isMatch;
    };

    // Function to check if a stop belongs to the active route
    const belongsToRoute = (stop: BusStop) => {
      return routeStopNames.has(stop.ShortName);
    };

    // Function to update marker visibility based on zoom
    const updateMarkersVisibility = () => {
      const zoom = map.getZoom() || 16;
      const showAllStops = zoom >= 17; // Show all stops when zoomed in (17+ is close zoom)

      // If visibleBusStops is provided, ONLY show those stops (used for internal route display)
      if (visibleBusStops && visibleBusStops.length > 0) {
        const visibleStopsSet = new Set(visibleBusStops);
        
        console.log('🚌 [MAP DEBUG] visibleBusStops:', visibleBusStops);
        console.log('🚌 [MAP DEBUG] labelMarkers count:', labelMarkersRef.current.length);
        
        // Handle circle markers - show only specified stops when zoomed in
        circleMarkersRef.current.forEach((marker) => {
          const title = marker.getTitle();
          const isVisible = title ? visibleStopsSet.has(title) : false;
          marker.setVisible(isVisible && showAllStops);
        });

        // Handle label markers - show only specified stops (labels visible at all zoom levels)
        labelMarkersRef.current.forEach((marker) => {
          const title = marker.getTitle();
          const isVisible = title ? visibleStopsSet.has(title) : false;
          console.log('🚌 [MAP DEBUG] Label marker title:', title, 'should show:', isVisible);
          marker.setVisible(isVisible);
        });
        return; // Skip all other logic
      }

      // If a route is selected, only show stops belonging to that route
      if (activeRoute) {
        // Handle circle markers - show only route stops AND only when zoomed in
        circleMarkersRef.current.forEach((marker) => {
          const title = marker.getTitle();
          const belongsToActiveRoute = title
            ? routeStopNames.has(title)
            : false;
          marker.setVisible(belongsToActiveRoute && showAllStops); // Added zoom check
        });

        // Handle label markers - show route stops (labels visible at all zoom levels)
        labelMarkersRef.current.forEach((marker) => {
          const title = marker.getTitle();
          const belongsToActiveRoute = title
            ? routeStopNames.has(title)
            : false;
          marker.setVisible(belongsToActiveRoute);
        });
      } else {
        // No route selected - use default priority behavior
        // Handle circle markers - hide when zoomed out, show all when zoomed in
        circleMarkersRef.current.forEach((marker) => {
          marker.setVisible(showAllStops);
        });

        // Handle label markers - show priority when zoomed out, all when zoomed in
        labelMarkersRef.current.forEach((marker) => {
          const title = marker.getTitle();
          // Use exact match instead of includes to avoid "UHall" matching "Opp UHall"
          const isZoom14Priority = title
            ? zoom14PriorityStops.some((p) => title === p || title.trim() === p)
            : false;
          const isPriority = title
            ? priorityStops.some((p) => title === p || title.trim() === p)
            : false;

          // Show based on zoom level:
          // - Zoom 17+: Show all stops
          // - Zoom 15-16: Show priority stops
          // - Zoom 14 and below: Show only zoom14 priority stops
          let shouldShow = false;
          if (showAllStops) {
            shouldShow = true; // Zoom 17+
          } else if (zoom >= 15) {
            shouldShow = isPriority; // Zoom 15-16
          } else {
            shouldShow = isZoom14Priority; // Zoom 14 and below
          }

          marker.setVisible(shouldShow);
        });
      }
    };

    // Function to update label sizes based on zoom level
    const updateLabelSizes = () => {
      const zoom = map.getZoom() || 16;
      // Start scaling at zoom 17 when roads/POIs become visible
      // At zoom 16 and below: 12px (original)
      // At zoom 17: 14px (when roads/buildings show)
      // At zoom 18: 16px
      // At zoom 19+: 18px
      let fontSize = 12;
      let strokeWidth = 3;

      if (zoom >= 17) {
        fontSize = Math.min(18, 12 + (zoom - 16) * 2);
        strokeWidth = Math.min(4, 3 + (zoom - 16) * 0.3);
      }

      labelMarkersRef.current.forEach((marker, index) => {
        const stop = busStops[index];
        if (!stop) return;

        const isStopPriority = isPriorityStop(stop);
        const isRouteStop = belongsToRoute(stop);
        const isDimmed =
          selectedStopId !== null && selectedStopId !== (stop.name || stop.ShortName);
        const stopColor = isDimmed
          ? '#D1D5DB'
          : visibleBusStopsColor && visibleBusStopsSet.has(stop.ShortName)
            ? visibleBusStopsColor
            : activeRoute && isRouteStop && routeColor
              ? routeColor
              : '#274F9C';
        const labelBelow = shouldLabelBelow(stop);
        const svgAnchorY = labelBelow ? 5 : 25;

        const newIcon = {
          url:
            'data:image/svg+xml;charset=UTF-8,' +
            encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="250" height="40" overflow="hidden">
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="-1" dy="0">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="1" dy="0">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="0" dy="-1">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="0" dy="1">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="-1" dy="-1">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="-1" dy="1">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="1" dy="-1">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="1" dy="1">${stop.ShortName}</text>
              <text x="125" y="20" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="${stopColor}" text-anchor="middle" dominant-baseline="middle">${stop.ShortName}</text>
            </svg>
          `),
          anchor: new google.maps.Point(125, svgAnchorY),
        };

        marker.setIcon(newIcon);
      });
    };

    const updateCircleColors = () => {
      circleMarkersRef.current.forEach((marker, index) => {
        const stop = busStops[index];
        if (!stop) return;

        const isRouteStop = belongsToRoute(stop);
        const isDimmed =
          selectedStopId !== null && selectedStopId !== (stop.name || stop.ShortName);
        const stopColor = isDimmed
          ? '#D1D5DB'
          : visibleBusStopsColor && visibleBusStopsSet.has(stop.ShortName)
            ? visibleBusStopsColor
            : activeRoute && isRouteStop && routeColor
              ? routeColor
              : '#274F9C';

        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: stopColor,
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 4,
        });
      });
    };

    // Helper function to find if this stop should have label below (south) or above (north)
    const shouldLabelBelow = (stop: BusStop) => {
      // Find nearby stops (within ~50 meters / 0.0005 degrees)
      const nearbyStops = busStops.filter((otherStop: BusStop) => {
        if (otherStop.ShortName === stop.ShortName) return false;
        const latDiff = Math.abs(otherStop.latitude - stop.latitude);
        const lngDiff = Math.abs(otherStop.longitude - stop.longitude);
        return latDiff < 0.0005 && lngDiff < 0.0005;
      });

      // If there are nearby stops, check if this stop is more southern (lower latitude)
      if (nearbyStops.length > 0) {
        const hasStopToNorth = nearbyStops.some(
          (otherStop: BusStop) => otherStop.latitude > stop.latitude
        );
        return hasStopToNorth; // Label below if this stop is more south (has stops north of it)
      }

      return false; // Default to label above
    };

    busStops.forEach((stop: BusStop) => {
      // Validate coordinates before creating marker
      if (
        typeof stop.latitude !== 'number' ||
        typeof stop.longitude !== 'number' ||
        isNaN(stop.latitude) ||
        isNaN(stop.longitude)
      ) {
        console.warn(`Invalid coordinates for stop ${stop.ShortName}:`, {
          lat: stop.latitude,
          lng: stop.longitude,
        });
        return;
      }

      const isStopPriority = isPriorityStop(stop);
      const isRouteStop = belongsToRoute(stop);

      // Determine the color to use
      const isDimmed =
        selectedStopId !== null && selectedStopId !== (stop.name || stop.ShortName);
      const stopColor = isDimmed
        ? '#D1D5DB'
        : visibleBusStopsColor && visibleBusStopsSet.has(stop.ShortName)
          ? visibleBusStopsColor
          : activeRoute && isRouteStop && routeColor
            ? routeColor
            : '#274F9C';

      // Determine label position based on nearby stops
      const labelBelow = shouldLabelBelow(stop);
      const labelOffsetLat = labelBelow ? -0.0001 : 0.0001; // Negative offset moves south
      const svgAnchorY = labelBelow ? 5 : 25; // Anchor point changes based on position

      // Create circle marker
      const marker = new google.maps.Marker({
        position: { lat: stop.latitude, lng: stop.longitude },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: stopColor,
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 4, // Reduced from 6 to make circles smaller
        },
        title: stop.ShortName, // Use short name for hover tooltip
        zIndex: 600, // Higher than Google Maps pins (500)
        visible: false, // Circles hidden by default when zoomed out
      });

      // Create label marker with dynamic position
      const label = new google.maps.Marker({
        position: { lat: stop.latitude + labelOffsetLat, lng: stop.longitude },
        map: map,
        icon: {
          url:
            'data:image/svg+xml;charset=UTF-8,' +
            encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="30" overflow="hidden">
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="-1" dy="0">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="1" dy="0">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="0" dy="-1">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="0" dy="1">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="-1" dy="-1">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="-1" dy="1">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="1" dy="-1">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" dx="1" dy="1">${stop.ShortName}</text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="${stopColor}" text-anchor="middle" dominant-baseline="middle">${stop.ShortName}</text>
            </svg>
          `),
          anchor: new google.maps.Point(100, svgAnchorY),
        },
        title: stop.ShortName, // Add title to label too for filtering
        zIndex: 601, // Higher than both Google Maps pins (500) and bus stop circles
        visible: activeRoute ? isRouteStop : isStopPriority, // Show route stops if route selected, else priority stops
      });

      if (onBusStopSelected) {
        marker.addListener('click', () => onBusStopSelected(stop));
        label.addListener('click', () => onBusStopSelected(stop));
      }

      circleMarkersRef.current.push(marker);
      labelMarkersRef.current.push(label);
    });

    // Set up zoom change listener to update both visibility and size
    const zoomListener = map.addListener('zoom_changed', () => {
      updateMarkersVisibility();
      updateLabelSizes();
      updateCircleColors();
    });

    // Initial visibility and size update
    updateMarkersVisibility();
    updateLabelSizes();
    updateCircleColors();

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      circleMarkersRef.current.forEach((marker) => marker.setMap(null));
      labelMarkersRef.current.forEach((marker) => marker.setMap(null));
      circleMarkersRef.current = [];
      labelMarkersRef.current = [];
    };
  }, [
    mapRef,
    isMapCreated,
    showBusStops,
    busStopsData,
    activeRoute,
    pickupPointsData,
    routeColor,
    visibleBusStopsColor,
    visibleBusStops,
    onBusStopSelected,
    selectedStopId,
  ]);

  // Update circle colors when route color or visibility changes
  useEffect(() => {
    if (!busStopsData?.BusStopsResult?.busstops) {
      return;
    }

    const busStops = busStopsData.BusStopsResult.busstops;
    const visibleBusStopsSet = new Set(visibleBusStops ?? []);

    // Get the pickup points for the active route (stops that belong to this route)
    const routeStopNames = new Set<string>();
    if (activeRoute && pickupPointsData?.PickupPointResult?.pickuppoint) {
      pickupPointsData.PickupPointResult.pickuppoint.forEach((pp: any) => {
        routeStopNames.add(pp.ShortName);
      });
    }

    // Helper function to check if a stop belongs to the active route
    const belongsToRoute = (stop: BusStop) => {
      return routeStopNames.has(stop.ShortName);
    };

    // Update circle colors
    circleMarkersRef.current.forEach((marker, index) => {
      const stop = busStops[index];
      if (!stop) return;

      const isRouteStop = belongsToRoute(stop);
      const isDimmed =
        selectedStopId !== null && selectedStopId !== (stop.name || stop.ShortName);
      const stopColor = isDimmed
        ? '#D1D5DB'
        : visibleBusStopsColor && visibleBusStopsSet.has(stop.ShortName)
          ? visibleBusStopsColor
          : activeRoute && isRouteStop && routeColor
            ? routeColor
            : '#274F9C';

      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: stopColor,
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 4,
      });
    });
  }, [
    busStopsData,
    activeRoute,
    pickupPointsData,
    routeColor,
    visibleBusStopsColor,
    visibleBusStops,
    selectedStopId,
  ]);
};

// Hook to render destination marker with Google Maps pin icon
const useDestinationMarker = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  destination?: { lat: number; lng: number },
  activeRoute?: RouteCode | null
) => {
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (
      !mapRef.current ||
      !isMapCreated ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    // Create new destination marker if destination exists
    // Always show destination marker (removed activeRoute check to show it with internal routes)
    if (destination) {
      // Validate destination coordinates
      if (
        typeof destination.lat !== 'number' ||
        typeof destination.lng !== 'number' ||
        isNaN(destination.lat) ||
        isNaN(destination.lng)
      ) {
        console.warn('Invalid destination coordinates:', destination);
        return;
      }
      
      const iconSvg = createDestinationPinSVG();
      const iconUrl = svgToDataURL(iconSvg);

      markerRef.current = new google.maps.Marker({
        position: destination,
        map: mapRef.current,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(24, 36),
          anchor: new google.maps.Point(12, 36), // Anchor at bottom center of pin
        },
        title: 'Destination',
        zIndex: 999, // Below user location marker
        animation: google.maps.Animation.DROP, // Animated drop effect
      });
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [mapRef, isMapCreated, destination, activeRoute]);

  return markerRef;
};

// Hook to render real-time bus location markers
const useBusMarkers = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  activeBuses: ActiveBus[],
  routeColor: string = '#274F9C',
  activeRoute?: RouteCode | null
) => {
  const busMarkersRef = useRef<google.maps.Marker[]>([]);
  const { data: checkpointsData } = useCheckpoints(activeRoute ?? 'A1');

  useEffect(() => {
    if (!isMapCreated || !mapRef.current || typeof window === 'undefined' || !window.google) {
      return;
    }

    const map = mapRef.current;

    // Remove existing bus markers
    busMarkersRef.current.forEach((marker) => marker.setMap(null));
    busMarkersRef.current = [];

    // Get route checkpoints for calculating direction
    const checkpoints = activeRoute
      ? checkpointsData?.CheckPointResult?.CheckPoint || []
      : [];

    // Create new markers for each active bus
    activeBuses.forEach((bus) => {
      const { lat, lng, veh_plate, direction } = bus;

      // Use horizontal flip for reverse direction instead of rotation
      const flipHorizontal = direction === 2;

      // Calculate arrow rotation based on next checkpoint
      const arrowRotation = getBusArrowRotation(
        { lat, lng },
        checkpoints,
        direction
      );

      const iconSvg = createBusMarkerSVG(routeColor, flipHorizontal, arrowRotation);
      const iconUrl = svgToDataURL(iconSvg);

      // Create marker
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14), // Center the icon
        },
        visibleBusStopsColor,
        title: `Bus ${veh_plate}`,
        zIndex: 1000, // Ensure buses appear above routes
      });

      // Add info window with bus details
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: sans-serif;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
              🚌 Bus ${veh_plate}
            </div>
            <div style="font-size: 12px; color: #666;">
              Direction: ${direction === 1 ? 'Forward' : 'Reverse'}
            </div>
            <div style="font-size: 12px; color: #666;">
              Speed: ${bus.speed} km/h
            </div>
          </div>
        `,
      });

      // Show info window on click
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      busMarkersRef.current.push(marker);
    });
  }, [mapRef, isMapCreated, activeBuses, routeColor, activeRoute]);

  return busMarkersRef;
};

/**
 * Custom hook to draw route polyline from checkpoint data
 */
const useRouteCheckpoints = (
  mapRef: React.RefObject<google.maps.Map | null>,
  routeCode: RouteCode | null,
  routeColor: string
) => {
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  // Fetch checkpoints for the active route (only if routeCode exists)
  const { data: checkpointsData } = useCheckpoints(routeCode as RouteCode);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // If no route, return
    if (!routeCode) {
      return;
    }

    // Try to get checkpoints from API first, fallback to local data
    let checkpoints =
      checkpointsData?.CheckPointResult?.CheckPoint ||
      (routeCheckpointsData as Record<string, any>)[routeCode];

    // If no checkpoints available, return
    if (!checkpoints || checkpoints.length === 0) {
      console.warn(`⚠️ No checkpoint data found for ${routeCode}`);
      return;
    }

    // Convert checkpoints to Google Maps LatLng format
    const path = checkpoints.map((point: any) => ({
      lat: point.latitude,
      lng: point.longitude,
    }));

    // Create polyline
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: routeColor,
      strokeOpacity: 0.8,
      strokeWeight: BUS_ROUTE_STROKE_WEIGHT,
      map,
    });

    polylineRef.current = polyline;

    // Cleanup
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [mapRef, routeCode, checkpointsData, routeColor]);

  return polylineRef;
};

/**
 * Custom hook to render multiple bus route polylines, stops, and buses from filters
 */
const useFilteredBusRoutes = (
  mapRef: React.RefObject<google.maps.Map | null>,
  filters: Record<string, boolean>,
  busDataByRoute: Map<string, any>,
  stopDataByRoute: Map<string, any>
) => {
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  const busMarkersRef = useRef<Map<string, google.maps.Marker[]>>(new Map());
  const stopMarkersRef = useRef<Map<string, google.maps.Marker[]>>(new Map());

  // Route color mapping
  const routeColors: Record<string, string> = {
    A1: '#BE1E2D',
    A2: '#E3CE0B', // Yellow (was incorrectly #E87722 orange)
    D1: '#C77DE2',
    D2: '#6F1B6F',
    L: '#BFBFBF',
    E: '#00B050',
    K: '#345A9B',
    R1: '#FF7913',
    R2: '#008200',
    P: '#838383',
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window === 'undefined' || !window.google) return;

    // Extract active routes from filters
    const activeRoutes: string[] = [];
    Object.keys(filters).forEach((key) => {
      if (key.startsWith('bus-route-') && filters[key]) {
        const routeCode = key.replace('bus-route-', '').toUpperCase();
        activeRoutes.push(routeCode);
      }
    });

    // Remove polylines that are no longer active
    polylinesRef.current.forEach((polyline, routeCode) => {
      if (!activeRoutes.includes(routeCode)) {
        polyline.setMap(null);
        polylinesRef.current.delete(routeCode);
      }
    });

    // Remove bus markers that are no longer active
    busMarkersRef.current.forEach((markers, routeCode) => {
      if (!activeRoutes.includes(routeCode)) {
        markers.forEach((marker) => marker.setMap(null));
        busMarkersRef.current.delete(routeCode);
      }
    });

    // Remove stop markers that are no longer active
    stopMarkersRef.current.forEach((markers, routeCode) => {
      if (!activeRoutes.includes(routeCode)) {
        markers.forEach((marker) => marker.setMap(null));
        stopMarkersRef.current.delete(routeCode);
      }
    });

    // Add/update polylines, buses, and stops for active routes
    activeRoutes.forEach((routeCode) => {
      const routeColor = routeColors[routeCode] || '#274F9C';

      // Add route polyline if not exists
      if (!polylinesRef.current.has(routeCode)) {
        const checkpoints = (routeCheckpointsData as Record<string, any>)[
          routeCode
        ];

        if (checkpoints && checkpoints.length > 0) {
          const path = checkpoints.map((point: any) => ({
            lat: point.latitude,
            lng: point.longitude,
          }));

          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: routeColor,
            strokeOpacity: 0.8,
            strokeWeight: BUS_ROUTE_STROKE_WEIGHT,
            map,
          });

          polylinesRef.current.set(routeCode, polyline);
        }
      }

      // Update bus markers
      const buses = busDataByRoute.get(routeCode) || [];
      const existingBusMarkers = busMarkersRef.current.get(routeCode) || [];
      existingBusMarkers.forEach((marker) => marker.setMap(null));

      // Get checkpoints for this route to calculate arrow direction
      const checkpoints = (routeCheckpointsData as Record<string, any>)[routeCode] || [];

      const newBusMarkers: google.maps.Marker[] = [];
      buses.forEach((bus: any) => {
        const { lat, lng, veh_plate, direction, speed } = bus;
        
        // Validate coordinates before creating marker
        if (
          typeof lat !== 'number' ||
          typeof lng !== 'number' ||
          isNaN(lat) ||
          isNaN(lng)
        ) {
          console.warn(`Invalid coordinates for bus ${veh_plate}:`, {
            lat,
            lng,
          });
          return;
        }
        
        const flipHorizontal = direction === 2;
        
        // Calculate arrow rotation based on next checkpoint
        const arrowRotation = getBusArrowRotation(
          { lat, lng },
          checkpoints,
          direction
        );

        const iconSvg = createBusMarkerSVG(routeColor, flipHorizontal, arrowRotation);
        const iconUrl = svgToDataURL(iconSvg);

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          },
          title: `Bus ${veh_plate}`,
          zIndex: 1000,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: sans-serif;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
                🚌 Bus ${veh_plate} (${routeCode})
              </div>
              <div style="font-size: 12px; color: #666;">
                Direction: ${direction === 1 ? 'Forward' : 'Reverse'}
              </div>
              <div style="font-size: 12px; color: #666;">
                Speed: ${speed || 0} km/h
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newBusMarkers.push(marker);
      });
      busMarkersRef.current.set(routeCode, newBusMarkers);

      // DISABLED: Route-specific stop markers (redundant with general bus stop markers)
      // The general bus stop markers already show all stops with labels and proper zoom behavior
      /*
      // Update stop markers
      const stops = stopDataByRoute.get(routeCode) || [];
      const existingStopMarkers = stopMarkersRef.current.get(routeCode) || [];
      existingStopMarkers.forEach((marker) => marker.setMap(null));

      const newStopMarkers: google.maps.Marker[] = [];
      stops.forEach((stop: any) => {
        // Validate coordinates before creating marker
        if (
          typeof stop.lat !== 'number' ||
          typeof stop.lng !== 'number' ||
          isNaN(stop.lat) ||
          isNaN(stop.lng)
        ) {
          console.warn(`Invalid coordinates for stop ${stop.ShortName}:`, {
            lat: stop.lat,
            lng: stop.lng,
          });
          return;
        }
        
        const marker = new google.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4, // Smaller default size
            fillColor: routeColor,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          title: stop.name,
          zIndex: 500,
          visible: false, // Hidden by default at low zoom levels
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: sans-serif;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
                ${stop.name}
              </div>
              <div style="font-size: 12px; color: #666;">
                Route: ${routeCode}
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newStopMarkers.push(marker);
      });
      stopMarkersRef.current.set(routeCode, newStopMarkers);
      */
    });

    // DISABLED: Zoom listener for route-specific stop markers (no longer needed)
    /*
    // Add zoom listener to control stop marker visibility based on zoom level
    const zoomListener = map.addListener('zoom_changed', () => {
      const zoom = map.getZoom();
      if (zoom !== undefined) {
        stopMarkersRef.current.forEach((markers) => {
          markers.forEach((marker) => {
            // Show markers only at zoom level 17 or higher
            marker.setVisible(zoom >= 17);
          });
        });
      }
    });
    */

    // Cleanup on unmount
    return () => {
      // DISABLED: Remove zoom listener (no longer used)
      /*
      // Remove zoom listener
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      */

      polylinesRef.current.forEach((polyline) => {
        polyline.setMap(null);
      });
      polylinesRef.current.clear();

      busMarkersRef.current.forEach((markers) => {
        markers.forEach((marker) => marker.setMap(null));
      });
      busMarkersRef.current.clear();

      // DISABLED: Cleanup for route-specific stop markers (no longer created)
      /*
      stopMarkersRef.current.forEach((markers) => {
        markers.forEach((marker) => marker.setMap(null));
      });
      stopMarkersRef.current.clear();
      */
    };
  }, [mapRef, filters, busDataByRoute, stopDataByRoute]);

  return { polylinesRef, busMarkersRef, stopMarkersRef };
};

/**
 * Custom hook to render landmark markers (hospital, MRT, library, bus terminal)
 */
const useLandmarkMarkers = (
  mapRef: React.RefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  activeRoute?: RouteCode | null,
  onPlaceSelected?: (placeId: string | null) => void
) => {
  const landmarkMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !isMapCreated ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Remove existing landmark markers
    landmarkMarkersRef.current.forEach((marker) => marker.setMap(null));
    landmarkMarkersRef.current = [];

    // Don't create landmark markers if a route is selected
    if (activeRoute) {
      return;
    }

    // Function to calculate scale based on zoom level
    const getScaleForZoom = (zoom: number): number => {
      // Base scale at zoom 16 (default) - reduced to 0.7 for important markers
      // Scale smaller when zoomed out, larger when zoomed in
      if (zoom <= 14) {
        return 0.49; // 0.7 * 0.7 for far zoom
      } else if (zoom <= 15) {
        return 0.595; // 0.7 * 0.85 for slightly smaller
      } else if (zoom === 16) {
        return 0.7; // 0.7 * 1.0 for default size
      } else if (zoom === 17) {
        return 0.805; // 0.7 * 1.15 for slightly larger
      } else if (zoom === 18) {
        return 0.91; // 0.7 * 1.3 for larger
      } else {
        return 1.05; // 0.7 * 1.5 for maximum size at high zoom
      }
    };

    // Function to update landmark marker sizes based on zoom
    const updateLandmarkSizes = () => {
      const zoom = map.getZoom() || 16;
      const scale = getScaleForZoom(zoom);
      const baseWidth = 40;
      const baseHeight = 52;

      landmarkMarkersRef.current.forEach((marker, index) => {
        const landmark = NUS_LANDMARKS[index];
        if (!landmark) return;

        const scaledWidth = baseWidth * scale;
        const scaledHeight = baseHeight * scale;
        const color = getLandmarkColor(landmark.type);

        marker.setIcon({
          url: getLandmarkMarkerSVG(landmark.type, color),
          scaledSize: new google.maps.Size(scaledWidth, scaledHeight),
          anchor: new google.maps.Point(scaledWidth / 2, scaledHeight),
        });
      });
    };

    // Create markers for each landmark
    NUS_LANDMARKS.forEach((landmark) => {
      const initialZoom = map.getZoom() || 16;
      const initialScale = getScaleForZoom(initialZoom);
      const initialWidth = 40 * initialScale;
      const initialHeight = 52 * initialScale;
      const color = getLandmarkColor(landmark.type);

      const marker = new google.maps.Marker({
        position: landmark.coordinates,
        map,
        icon: {
          url: getLandmarkMarkerSVG(landmark.type, color),
          scaledSize: new google.maps.Size(initialWidth, initialHeight),
          anchor: new google.maps.Point(initialWidth / 2, initialHeight),
        },
        title: landmark.name,
        zIndex: 500, // Below buses but above routes
      });

      // Add info window with landmark details
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: sans-serif; max-width: 200px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
              ${landmark.name}
            </div>
            <div style="font-size: 12px; color: #666;">
              ${landmark.address}
            </div>
          </div>
        `,
      });

      marker.addListener('click', async () => {
        console.log('[LandmarkMarker] Clicked on:', landmark.name, 'Place ID:', landmark.placeId);
        
        // Use text search to find the place ID if we have coordinates
        if (onPlaceSelected) {
          try {
            console.log('[LandmarkMarker] Finding place ID from backend API...');
            
            // Use backend API for finding place
            const locationBias = `point:${landmark.coordinates.lat},${landmark.coordinates.lng}`;
            const findPlaceData = await findPlaceFromQuery(
              `${landmark.name}, ${landmark.address}`,
              'textquery',
              'place_id,name',
              locationBias
            );
            
            if (findPlaceData.status === 'OK' && findPlaceData.candidates && findPlaceData.candidates.length > 0) {
              const placeId = findPlaceData.candidates[0].place_id;
              console.log('[LandmarkMarker] Found Place ID:', placeId, 'for', landmark.name);
              onPlaceSelected(placeId);
            } else {
              console.error('[LandmarkMarker] Failed to find place:', findPlaceData.status);
              // Fallback to info window
              infoWindow.open(map, marker);
            }
          } catch (error) {
            console.error('[LandmarkMarker] Error finding place:', error);
            infoWindow.open(map, marker);
          }
        } else {
          infoWindow.open(map, marker);
        }
      });

      landmarkMarkersRef.current.push(marker);
    });

    // Add zoom change listener to update sizes
    const zoomListener = map.addListener('zoom_changed', updateLandmarkSizes);

    // Cleanup
    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      landmarkMarkersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [mapRef, isMapCreated, activeRoute]);

  return landmarkMarkersRef;
};

/**
 * Custom hook to render printer markers
 */
const usePrinterMarkers = (
  mapRef: React.RefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  activeRoute?: RouteCode | null,
  onPrinterSelected?: (printer: Printer) => void,
  selectedPrinterId?: string | null
) => {
  const printerMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !isMapCreated ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Remove existing printer markers
    printerMarkersRef.current.forEach((marker) => marker.setMap(null));
    printerMarkersRef.current = [];

    // Don't create printer markers if a route is selected
    if (activeRoute) {
      return;
    }

    // Function to calculate scale based on zoom level (smaller than landmarks)
    const getScaleForZoom = (zoom: number): number => {
      if (zoom <= 14) {
        return 0.6;
      } else if (zoom <= 15) {
        return 0.75;
      } else if (zoom === 16) {
        return 0.9;
      } else if (zoom === 17) {
        return 1.0;
      } else if (zoom === 18) {
        return 1.15;
      } else {
        return 1.3;
      }
    };

    // Function to update printer marker sizes based on zoom
    const updatePrinterSizes = () => {
      const zoom = map.getZoom() || 16;
      const scale = getScaleForZoom(zoom);
      const baseSize = 30; // Circular markers are 30x30px

      printerMarkersRef.current.forEach((marker, index) => {
        const printer = NUS_PRINTERS[index];
        if (!printer) return;

        const scaledSize = baseSize * scale;
        const isDimmed =
          selectedPrinterId !== null && selectedPrinterId !== printer.id;
        const color = isDimmed ? '#D1D5DB' : '#FF8C00'; // Orange

        marker.setIcon({
          url: circularSvgToDataURL(createCircularMarkerSVG('printer', color)),
          scaledSize: new google.maps.Size(scaledSize, scaledSize),
          anchor: new google.maps.Point(scaledSize / 2, scaledSize / 2), // Center anchor for circular
        });
      });
    };

    // Create markers for each printer
    NUS_PRINTERS.forEach((printer) => {
      const initialZoom = map.getZoom() || 16;
      const initialScale = getScaleForZoom(initialZoom);
      const initialSize = 30 * initialScale;
      const isDimmed =
        selectedPrinterId !== null && selectedPrinterId !== printer.id;
      const color = isDimmed ? '#D1D5DB' : '#FF8C00'; // Orange

      const marker = new google.maps.Marker({
        position: printer.coordinates,
        map,
        icon: {
          url: circularSvgToDataURL(createCircularMarkerSVG('printer', color)),
          scaledSize: new google.maps.Size(initialSize, initialSize),
          anchor: new google.maps.Point(initialSize / 2, initialSize / 2),
        },
        title: `${printer.building} Printer`,
        zIndex: 500,
      });

      marker.addListener('click', () => {
        console.log('[PrinterMarker] Clicked on:', printer.building);
        if (onPrinterSelected) {
          onPrinterSelected(printer);
        }
      });

      printerMarkersRef.current.push(marker);
    });

    // Add zoom change listener to update sizes
    const zoomListener = map.addListener('zoom_changed', updatePrinterSizes);

    // Cleanup
    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      printerMarkersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [mapRef, isMapCreated, activeRoute, onPrinterSelected, selectedPrinterId]);

  return printerMarkersRef;
};

// Hook to manage and display sports facility markers (gyms, pools, badminton courts)
const useSportsFacilityMarkers = (
  mapRef: React.RefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  activeRoute?: RouteCode | null,
  onFacilitySelected?: (facility: SportsFacility) => void,
  selectedFacilityId?: string | null
) => {
  const facilityMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !isMapCreated ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    // Remove existing facility markers
    facilityMarkersRef.current.forEach((marker) => marker.setMap(null));
    facilityMarkersRef.current = [];

    // Don't create facility markers if a route is selected
    if (activeRoute) {
      return;
    }

    // Function to calculate scale based on zoom level (smaller than landmarks)
    const getScaleForZoom = (zoom: number): number => {
      if (zoom <= 14) {
        return 0.6;
      } else if (zoom <= 15) {
        return 0.75;
      } else if (zoom === 16) {
        return 0.9;
      } else if (zoom === 17) {
        return 1.0;
      } else if (zoom === 18) {
        return 1.15;
      } else {
        return 1.3;
      }
    };

    // Function to update facility marker sizes based on zoom
    const updateFacilitySizes = () => {
      const zoom = map.getZoom() || 16;
      const scale = getScaleForZoom(zoom);
      const baseSize = 30; // Circular markers are 30x30px

      facilityMarkersRef.current.forEach((marker, index) => {
        const facility = NUS_SPORTS_FACILITIES[index];
        if (!facility) return;

        const scaledSize = baseSize * scale;
        const isDimmed =
          selectedFacilityId !== null && selectedFacilityId !== facility.id;
        const color = isDimmed
          ? '#D1D5DB'
          : getSportsFacilityColor(facility.type);

        marker.setIcon({
          url: circularSvgToDataURL(createCircularMarkerSVG(facility.type, color)),
          scaledSize: new google.maps.Size(scaledSize, scaledSize),
          anchor: new google.maps.Point(scaledSize / 2, scaledSize / 2), // Center anchor for circular
        });
      });
    };

    // Create markers for each sports facility
    NUS_SPORTS_FACILITIES.forEach((facility) => {
      const initialZoom = map.getZoom() || 16;
      const initialScale = getScaleForZoom(initialZoom);
      const initialSize = 30 * initialScale;
      const isDimmed =
        selectedFacilityId !== null && selectedFacilityId !== facility.id;
      const color = isDimmed
        ? '#D1D5DB'
        : getSportsFacilityColor(facility.type);

      const marker = new google.maps.Marker({
        position: facility.coordinates,
        map,
        icon: {
          url: circularSvgToDataURL(createCircularMarkerSVG(facility.type, color)),
          scaledSize: new google.maps.Size(initialSize, initialSize),
          anchor: new google.maps.Point(initialSize / 2, initialSize / 2),
        },
        title: facility.name,
        zIndex: 500,
      });

      marker.addListener('click', () => {
        console.log('[SportsFacilityMarker] Clicked on:', facility.name);
        if (onFacilitySelected) {
          onFacilitySelected(facility);
        }
      });

      facilityMarkersRef.current.push(marker);
    });

    // Add zoom change listener to update sizes
    const zoomListener = map.addListener('zoom_changed', updateFacilitySizes);

    // Cleanup
    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      facilityMarkersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [mapRef, isMapCreated, activeRoute, onFacilitySelected, selectedFacilityId]);

  return facilityMarkersRef;
};

// Hook to track and display user location with heading
const useUserLocationMarker = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean
) => {
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const headingRef = useRef<number>(0);

  // Use global location from hook
  const { coords: userLocation } = useLocation();

  useEffect(() => {
    if (
      !mapRef.current ||
      !isMapCreated ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      return;
    }

    const map = mapRef.current;

    // Function to update marker position and rotation
    const updateUserMarker = (lat: number, lng: number, heading: number) => {
      // Validate coordinates (should be within Singapore bounds roughly)
      if (lat < 1.1 || lat > 1.5 || lng < 103.6 || lng > 104.1) {
        return;
      }

      const iconSvg = createUserLocationSVG(heading);
      const iconUrl = svgToDataURL(iconSvg);

      if (userMarkerRef.current) {
        // Update existing marker
        userMarkerRef.current.setPosition({ lat, lng });
        userMarkerRef.current.setIcon({
          url: iconUrl,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        });
      } else {
        // Create new marker
        userMarkerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(36, 36),
            anchor: new google.maps.Point(18, 18),
          },
          title: 'Your Location',
          zIndex: 1000, // On top of everything
        });
      }
    };

    // Handle device orientation for heading
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        // alpha is the compass heading (0-360)
        // Convert to match map north (0 = north)
        const heading = (event as any).webkitCompassHeading || event.alpha || 0;
        headingRef.current = heading;

        // Update marker rotation if we have location
        if (
          userLocation &&
          typeof userLocation.latitude === 'number' &&
          typeof userLocation.longitude === 'number' &&
          !isNaN(userLocation.latitude) &&
          !isNaN(userLocation.longitude) &&
          userMarkerRef.current
        ) {
          updateUserMarker(
            userLocation.latitude,
            userLocation.longitude,
            heading
          );
        }
      }
    };

    // Request orientation permission (iOS 13+)
    const requestOrientationPermission = async () => {
      if (
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        try {
          const permission = await (
            DeviceOrientationEvent as any
          ).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (error) {
          console.log('Orientation permission denied:', error);
        }
      } else {
        // Non-iOS devices
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    // Start orientation tracking
    requestOrientationPermission();

    // Update marker when userLocation changes
    if (
      userLocation &&
      typeof userLocation.latitude === 'number' &&
      typeof userLocation.longitude === 'number' &&
      !isNaN(userLocation.latitude) &&
      !isNaN(userLocation.longitude)
    ) {
      updateUserMarker(
        userLocation.latitude,
        userLocation.longitude,
        headingRef.current
      );
    }

    // Cleanup
    return () => {
      if (userMarkerRef.current) {
        try {
          userMarkerRef.current.setMap(null);
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
        userMarkerRef.current = null;
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [mapRef, isMapCreated, userLocation]);

  return userMarkerRef;
};

// Utility function to debounce click handling
const createClickDebouncer = (delayMs: number = 300) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastClickTime = 0;
  
  return {
    execute: (callback: () => void) => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime;
      
      console.log(`[ClickDebouncer] Click detected. Time since last: ${timeSinceLastClick}ms`);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        console.log('[ClickDebouncer] Cleared pending debounce timeout');
      }
      
      lastClickTime = now;
      
      if (timeSinceLastClick < delayMs) {
        console.log(`[ClickDebouncer] Click too rapid (${timeSinceLastClick}ms < ${delayMs}ms), debouncing...`);
        timeoutId = setTimeout(() => {
          console.log('[ClickDebouncer] Debounce delay passed, executing callback');
          callback();
          timeoutId = null;
        }, delayMs - timeSinceLastClick);
      } else {
        console.log('[ClickDebouncer] Sufficient time passed, executing immediately');
        callback();
        timeoutId = null;
      }
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        console.log('[ClickDebouncer] Cancelled pending callback');
      }
    }
  };
};

// Hook to handle place details when clicking on POIs
const usePlaceDetailsClick = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  onPlaceSelected: (placeId: string | null) => void,
  enabled: boolean = true,
  isSearching: boolean = false
) => {
  const debounceRef = React.useRef(createClickDebouncer(400));
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const pendingClickRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (
      !enabled ||
      !mapRef.current ||
      !isMapCreated ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      console.log('[PlaceDetailsClick] Not ready or disabled:', {
        enabled,
        hasMap: !!mapRef.current,
        isMapCreated,
        hasWindow: typeof window !== 'undefined',
        hasGoogle: typeof window !== 'undefined' && !!window.google,
      });
      return;
    }

    const map = mapRef.current;
    console.log('[PlaceDetailsClick] Setting up click listener');

    // Add click listener to the map
    const clickListener = map.addListener(
      'click',
      async (event: google.maps.MapMouseEvent & { placeId?: string }) => {
        const clickTimestamp = Date.now();
        console.log(`[PlaceDetailsClick] Map clicked at ${clickTimestamp}:`, {
          hasPlaceId: !!event.placeId,
          placeId: event.placeId,
          hasLatLng: !!event.latLng,
          latLng: event.latLng?.toJSON(),
          isSearching,
          pendingClick: pendingClickRef.current,
        });

        // Guard: prevent clicks while already searching
        if (isSearching) {
          console.log('[PlaceDetailsClick] Search already in progress, queuing click instead of processing immediately');
        }

        // Guard: prevent duplicate simultaneous clicks
        if (pendingClickRef.current) {
          console.log('[PlaceDetailsClick] Click already pending, ignoring duplicate');
          return;
        }

        // Use debouncer to prevent rapid successive clicks
        debounceRef.current.execute(async () => {
          console.log(`[PlaceDetailsClick] Debounce callback executing for click at ${clickTimestamp}`);
          pendingClickRef.current = true;

          // Cancel any pending async operations
          if (abortControllerRef.current) {
            console.log('[PlaceDetailsClick] Aborting previous async operation');
            abortControllerRef.current.abort();
          }
          abortControllerRef.current = new AbortController();

          try {
            if (event.placeId) {
              // User clicked on a POI (Point of Interest)
              console.log('[PlaceDetailsClick] POI clicked, place ID:', event.placeId);
              event.stop(); // Prevent default info window
              onPlaceSelected(event.placeId);
              pendingClickRef.current = false;
            } else if (event.latLng) {
              // User clicked on a location without a POI - search for nearby places
              console.log('[PlaceDetailsClick] Empty location clicked, searching nearby places');
              try {
                // Import the places library if not already loaded
                console.log('[PlaceDetailsClick] Importing places library...');
                const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
                console.log('[PlaceDetailsClick] Places library imported');

                // Check if this request was aborted before proceeding
                if (abortControllerRef.current?.signal.aborted) {
                  console.log('[PlaceDetailsClick] Request was aborted, skipping searchNearby');
                  pendingClickRef.current = false;
                  return;
                }

                // Use searchNearby to find places at the clicked location
                console.log('[PlaceDetailsClick] Calling searchNearby with:', {
                  center: event.latLng.toJSON(),
                  radius: 50,
                });
                
                const { places } = await Place.searchNearby({
                  locationRestriction: {
                    center: event.latLng,
                    radius: 50, // Search within 50 meters of the clicked point
                  },
                  maxResultCount: 1, // Only get the closest place
                  fields: ['id', 'displayName', 'location'], // Required fields
                });

                // Check if aborted after async operation completes
                if (abortControllerRef.current?.signal.aborted) {
                  console.log('[PlaceDetailsClick] Request was aborted after searchNearby completed, ignoring results');
                  pendingClickRef.current = false;
                  return;
                }

                console.log('[PlaceDetailsClick] searchNearby results:', {
                  placesCount: places?.length || 0,
                  firstPlaceId: places?.[0]?.id,
                });

                if (places && places.length > 0 && places[0].id) {
                  // Get the first (closest) place
                  console.log('[PlaceDetailsClick] Found nearby place, ID:', places[0].id);
                  onPlaceSelected(places[0].id);
                  pendingClickRef.current = false;
                } else {
                  // If no place found nearby, try geocoding the location
                  console.log('[PlaceDetailsClick] No nearby places, trying geocoding');
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ location: event.latLng }, (geocodeResults, geocodeStatus) => {
                    // Check if aborted before processing geocode results
                    if (abortControllerRef.current?.signal.aborted) {
                      console.log('[PlaceDetailsClick] Request was aborted, ignoring geocode results');
                      pendingClickRef.current = false;
                      return;
                    }

                    console.log('[PlaceDetailsClick] Geocode results:', {
                      status: geocodeStatus,
                      resultsCount: geocodeResults?.length || 0,
                      firstPlaceId: geocodeResults?.[0]?.place_id,
                    });

                    if (geocodeStatus === 'OK' && geocodeResults && geocodeResults.length > 0) {
                      const result = geocodeResults[0];
                      if (result.place_id) {
                        console.log('[PlaceDetailsClick] Found place via geocoding, ID:', result.place_id);
                        onPlaceSelected(result.place_id);
                      }
                    } else {
                      // No place found - close place details
                      console.log('[PlaceDetailsClick] No place found, closing details');
                      onPlaceSelected(null);
                    }
                    pendingClickRef.current = false;
                  });
                }
              } catch (error) {
                if ((error as any)?.name === 'AbortError') {
                  console.log('[PlaceDetailsClick] Async operation was aborted');
                } else {
                  console.error('[PlaceDetailsClick] Error handling map click:', error);
                  onPlaceSelected(null);
                }
                pendingClickRef.current = false;
              }
            } else {
              // No location data - close place details
              console.log('[PlaceDetailsClick] No location data, closing details');
              onPlaceSelected(null);
              pendingClickRef.current = false;
            }
          } catch (error) {
            console.error('[PlaceDetailsClick] Unexpected error in click handler:', error);
            pendingClickRef.current = false;
          }
        });
      }
    );

    console.log('[PlaceDetailsClick] Click listener added successfully');

    return () => {
      console.log('[PlaceDetailsClick] Removing click listener and cleanup');
      if (clickListener) {
        google.maps.event.removeListener(clickListener);
      }
      debounceRef.current.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [mapRef, isMapCreated, onPlaceSelected, enabled, isSearching]);
};

// PlaceDetailsCompact Component using Google Places UI Kit
const PlaceDetailsCompact: React.FC<{
  placeId: string;
  onClose: () => void;
  onDirections?: (placeId: string) => void;
  colorMode?: 'light' | 'dark';
  onLoadingChange?: (loading: boolean) => void;
}> = ({ placeId, onClose, onDirections, colorMode = 'light', onLoadingChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const placeDetailsRef = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(80);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  console.log('[PlaceDetailsCompact] Rendering with placeId:', placeId, 'colorMode:', colorMode);

  useEffect(() => {
    console.log('[PlaceDetailsCompact] useEffect triggered, placeId:', placeId);
    
    // Reset loading state when placeId changes
    setIsLoading(true);
    onLoadingChange?.(true);
    
    if (
      !containerRef.current ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      console.log('[PlaceDetailsCompact] Not ready:', {
        hasContainer: !!containerRef.current,
        hasWindow: typeof window !== 'undefined',
        hasGoogle: typeof window !== 'undefined' && !!window.google,
      });
      return;
    }

    // Dynamically create the place details element
    const loadPlacesLibrary = async () => {
      try {
        console.log('[PlaceDetailsCompact] Loading places library...');
        // Import the places library
        await google.maps.importLibrary('places');
        console.log('[PlaceDetailsCompact] Places library loaded');

        // Create the custom elements
        const placeDetails = document.createElement(
          'gmp-place-details-compact'
        ) as HTMLElement;
        const placeRequest = document.createElement(
          'gmp-place-details-place-request'
        ) as HTMLElement;
        const contentConfig = document.createElement(
          'gmp-place-content-config'
        ) as HTMLElement;

        // Add all content elements from the example
        const media = document.createElement('gmp-place-media');
        media.setAttribute('lightbox-preferred', '');
        
        const rating = document.createElement('gmp-place-rating');
        const type = document.createElement('gmp-place-type');
        const price = document.createElement('gmp-place-price');
        const accessibleEntrance = document.createElement('gmp-place-accessible-entrance-icon');
        const openNowStatus = document.createElement('gmp-place-open-now-status');
        
        const attribution = document.createElement('gmp-place-attribution');
        attribution.setAttribute('light-scheme-color', 'gray');
        attribution.setAttribute('dark-scheme-color', 'white');
        
        contentConfig.appendChild(media);
        contentConfig.appendChild(rating);
        contentConfig.appendChild(type);
        contentConfig.appendChild(price);
        contentConfig.appendChild(accessibleEntrance);
        contentConfig.appendChild(openNowStatus);
        contentConfig.appendChild(attribution);

        console.log('[PlaceDetailsCompact] Setting place ID:', placeId);
        // Set the place ID
        placeRequest.setAttribute('place', placeId);

        // Append elements
        placeDetails.appendChild(placeRequest);
        placeDetails.appendChild(contentConfig);

        // Set attributes
        placeDetails.setAttribute('orientation', 'horizontal');
        placeDetails.setAttribute('truncation-preferred', '');
        
        // Force light mode using CSS (per documentation)
        placeDetails.style.colorScheme = 'light';

        // Clear and append to container
        if (containerRef.current) {
          console.log('[PlaceDetailsCompact] Appending to container');
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(placeDetails);
          placeDetailsRef.current = placeDetails;
          console.log('[PlaceDetailsCompact] Successfully created place details UI');
          
          // Observe the actual place details element height, not the container
          resizeObserverRef.current = new ResizeObserver((entries) => {
            for (const entry of entries) {
              const height = entry.contentRect.height;
              console.log('[PlaceDetailsCompact] Place details element height changed to:', height);
              setContainerHeight(height);
            }
          });
          
          // Observe the actual gmp-place-details-compact element
          resizeObserverRef.current.observe(placeDetails);
          
          // Set loading to false once the element is appended
          setIsLoading(false);
          onLoadingChange?.(false);
          
          // Wait for the component to render, then hide the attribution and link button
          setTimeout(() => {
            const hideElements = () => {
              // Find and hide the Google Maps attribution text and info button
              const attributionContainers = placeDetails.querySelectorAll('.container');
              attributionContainers.forEach((container) => {
                const attributionText = container.querySelector('.attribution-text');
                const infoButton = container.querySelector('.info-button');
                if (attributionText || infoButton) {
                  (container as HTMLElement).style.display = 'none';
                }
              });
              
              // Also try to hide by querying directly
              const attributionTexts = placeDetails.querySelectorAll('.attribution-text');
              const infoButtons = placeDetails.querySelectorAll('.info-button');
              attributionTexts.forEach((el) => {
                (el as HTMLElement).style.display = 'none';
                // Hide parent container too
                if (el.parentElement) {
                  (el.parentElement as HTMLElement).style.display = 'none';
                }
              });
              infoButtons.forEach((el) => {
                (el as HTMLElement).style.display = 'none';
                // Hide parent container too
                if (el.parentElement) {
                  (el.parentElement as HTMLElement).style.display = 'none';
                }
              });
            };
            
            // Try multiple times in case the content loads asynchronously
            hideElements();
            setTimeout(hideElements, 100);
            setTimeout(hideElements, 500);
          }, 100);
        }
      } catch (error) {
        console.error('[PlaceDetailsCompact] Error loading place details:', error);
      }
    };

    loadPlacesLibrary();

    return () => {
      console.log('[PlaceDetailsCompact] Cleaning up');
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [placeId, colorMode]);
  
  // Calculate button position based on actual place details height
  // Ensure the button stays within the panel (56px is close button + directions button height)
  // We want the button to be at the bottom but not overflow
  const buttonTopPosition = Math.min(containerHeight - 36, Math.max(56, containerHeight - 50));

  return (
    <div style={{ position: 'relative' }}>
      {/* Loading spinner overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '120px',
            backgroundColor: 'white',
            borderRadius: '8px',
            zIndex: 999998,
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #4285f4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {/* Place details container */}
      <div
        ref={containerRef}
        style={{
          minHeight: '80px',
          width: '100%',
          colorScheme: 'light',
          // Force white background using CSS custom property from documentation
          '--gmp-mat-color-surface': '#ffffff',
          '--gmp-mat-color-on-surface': '#000000',
          '--gmp-mat-color-on-surface-variant': '#666666',
        } as React.CSSProperties}
      />
      
      {/* Close button - positioned above the panel */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '8px',
          zIndex: 999999,
          background: 'rgba(255, 255, 255, 0.95)',
          border: 'none',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '18px',
          color: '#666',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(245, 245, 245, 0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
        }}
      >
        ×
      </button>
      
      {/* Directions button - positioned dynamically based on container height */}
      {onDirections && (
        <button
          onClick={() => onDirections(placeId)}
          style={{
            position: 'absolute',
            top: `${buttonTopPosition}px`,
            right: '10px',
            zIndex: 999999,
            background: 'rgba(66, 133, 244, 0.95)',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            color: 'white',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(66, 133, 244, 1)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(66, 133, 244, 0.95)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M19.375 9.4984C19.3731 9.7625 19.2863 10.019 19.1275 10.23C18.9687 10.441 18.7462 10.5954 18.4929 10.6703L18.4773 10.675L12.3836 12.3812L10.6773 18.475L10.6726 18.4906C10.5976 18.7438 10.4432 18.9662 10.2323 19.125C10.0213 19.2838 9.76483 19.3706 9.50076 19.3726H9.47732C9.21837 19.375 8.96524 19.2958 8.75389 19.1462C8.54254 18.9965 8.38372 18.7841 8.29998 18.539L3.20311 4.79762C3.20146 4.79357 3.20015 4.78938 3.1992 4.78512C3.12303 4.56389 3.11048 4.32573 3.16297 4.09772C3.21546 3.86972 3.3309 3.66102 3.49613 3.49538C3.66137 3.32973 3.86978 3.21379 4.09766 3.16073C4.32553 3.10768 4.56373 3.11965 4.78514 3.19527L4.79764 3.19918L18.5414 8.29762C18.7902 8.38268 19.0054 8.54509 19.1553 8.76113C19.3053 8.97717 19.3823 9.23551 19.375 9.4984Z"
              fill="#FFFFFF"
            />
          </svg>
          Directions
        </button>
      )}
    </div>
  );
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  origin,
  destination,
  waypoints = [],
  routePolyline,
  routeSteps,
  internalRoutePolylines,
  onMarkerPress,
  initialRegion = DEFAULT_REGION,
  style,
  showD1Route = false,
  activeRoute = null,
  onActiveRouteChange,
  showLandmarks = true, // Default to true for backward compatibility
  showUserLocation = true, // Default to true for backward compatibility
  showMapControls = true, // Default to true for backward compatibility
  showBusStops = false, // Default to false for backward compatibility
  visibleBusStops, // Optional array of bus stop names to show
  visibleBusStopsColor,
  mapFilters: externalMapFilters,
  onMapFiltersChange,
  onMapTypeChangeReady,
  enablePlaceDetails = true, // Default to true for backward compatibility
  onMapItemSelect,
  selectedMapItem,
  forceResetCenter = false,
  showRouteConnectors = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isPlaceLoading, setIsPlaceLoading] = useState<boolean>(false);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [selectedSportsFacility, setSelectedSportsFacility] = useState<SportsFacility | null>(null);
  const [currentMapType, setCurrentMapType] = useState<'light' | 'dark' | google.maps.MapTypeId>('light'); // Track map type for styling
  const safeInitialRegion = useMemo(
    () => (isValidInitialRegion(initialRegion) ? initialRegion : DEFAULT_REGION),
    [initialRegion]
  );
  
  // Get user location for directions
  const { coords: userLocation } = useLocation();
  
  // Add logging wrapper for setSelectedPlaceId
  const setSelectedPlaceIdWithLogging = React.useCallback((placeId: string | null) => {
    console.log('[InteractiveMap] setSelectedPlaceId called with:', placeId);
    setSelectedPlaceId(placeId);
    if (placeId) {
      setIsPlaceLoading(true); // Start loading when a place is selected
    } else {
      setIsPlaceLoading(false); // Stop loading when cleared
    }
  }, []);
  
  // Log when selectedPlaceId changes
  useEffect(() => {
    console.log('[InteractiveMap] selectedPlaceId changed to:', selectedPlaceId);
  }, [selectedPlaceId]);
  
  const previousActiveRouteRef = useRef<RouteCode | null>(null);
  const isSyncingFromActiveRouteRef = useRef(false); // Track if we're syncing from activeRoute to prevent loops
  const savedFilterStateRef = useRef<Record<string, boolean> | null>(null); // Save filter state before route selection

  // Map filter state - use external state if provided, otherwise use internal state with localStorage persistence
  const [internalMapFilters, setInternalMapFilters] = useState<
    Record<string, boolean>
  >(() => {
    const defaultFilters = {
      important: true,
      'bus-stops': true,
      academic: false, // Always default to false
      residences: false,
      sports: false,
      'bus-route-a1': false,
      'bus-route-a2': false,
      'bus-route-d1': false,
      'bus-route-d2': false,
      'bus-route-e': false,
      'bus-route-k': false,
      'bus-route-l': false,
    };

    try {
      const saved = localStorage.getItem('nus-nextbus-map-filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Always override academic to be false on initial load
        return { ...parsed, academic: false };
      }
    } catch (error) {
      console.error('Error loading map filters:', error);
    }
    return defaultFilters;
  });

  // Use external filters if provided, otherwise use internal state
  const mapFilters = externalMapFilters || internalMapFilters;
  const setMapFilters = React.useCallback(
    (filters: Record<string, boolean>) => {
      if (onMapFiltersChange) {
        onMapFiltersChange(filters);
      } else {
        setInternalMapFilters(filters);
        try {
          localStorage.setItem(
            'nus-nextbus-map-filters',
            JSON.stringify(filters)
          );
        } catch (error) {
          console.error('Error saving map filters:', error);
        }
      }
    },
    [onMapFiltersChange]
  );

  // Determine if landmarks should be shown based on filters
  const shouldShowLandmarks = mapFilters.important && showLandmarks;
  const shouldShowPrinters = mapFilters.printers;
  const shouldShowSports = mapFilters.sports;

  const selectedPrinterId =
    selectedMapItem?.type === 'printer'
      ? selectedMapItem.printer.id
      : selectedPrinter?.id ?? null;
  const selectedSportsFacilityId =
    selectedMapItem?.type === 'sports'
      ? selectedMapItem.facility.id
      : selectedSportsFacility?.id ?? null;
  const selectedBusStopId =
    selectedMapItem?.type === 'place' && selectedMapItem.place.type === 'bus-stop'
      ? selectedMapItem.place.stopId || selectedMapItem.place.name
      : null;

  const connectorOrigin = React.useMemo<LatLng | undefined>(() => {
    if (origin) return origin;
    if (showUserLocation && userLocation) {
      return { lat: userLocation.latitude, lng: userLocation.longitude };
    }
    return undefined;
  }, [origin, showUserLocation, userLocation]);

  const connectorDestination = React.useMemo<LatLng | undefined>(() => {
    if (destination) return destination;
    if (!selectedMapItem) return undefined;
    if (selectedMapItem.type === 'place') {
      return {
        lat: selectedMapItem.place.coordinates.latitude,
        lng: selectedMapItem.place.coordinates.longitude,
      };
    }
    if (selectedMapItem.type === 'printer') {
      return selectedMapItem.printer.coordinates;
    }
    if (selectedMapItem.type === 'sports') {
      return selectedMapItem.facility.coordinates;
    }
    if (selectedMapItem.type === 'canteen') {
      return selectedMapItem.canteen.coords;
    }
    return undefined;
  }, [destination, selectedMapItem]);

  // Determine which bus route is selected from filters (radio button selection)
  const selectedFilterRoute = React.useMemo(() => {
    const routeKeys = Object.keys(mapFilters).filter(
      (key) => key.startsWith('bus-route-') && mapFilters[key]
    );
    if (routeKeys.length > 0) {
      return routeKeys[0].replace('bus-route-', '').toUpperCase() as RouteCode;
    }
    return null;
  }, [mapFilters]);

  // Create a single source of truth for the active route
  // Priority: selectedFilterRoute (from filter panel) > activeRoute (from nearest stops)
  // But when activeRoute changes from outside, update the filter to match
  const effectiveActiveRoute = selectedFilterRoute || activeRoute;

  // Sync filter panel when activeRoute changes from "nearest stops"
  React.useEffect(() => {
    const previousActiveRoute = previousActiveRouteRef.current;

    if (activeRoute && activeRoute !== previousActiveRoute) {
      // When a route is selected from "nearest stops" (new selection)
      // Save the current filter state before making changes
      if (!savedFilterStateRef.current) {
        savedFilterStateRef.current = {
          important: mapFilters.important || false,
          academic: mapFilters.academic || false,
          residences: mapFilters.residences || false,
          'bus-stops': mapFilters['bus-stops'] || false,
        };
      }
      
      // Update the filter panel to match
      isSyncingFromActiveRouteRef.current = true; // Set flag to prevent loop

      const routeFilterKey = `bus-route-${activeRoute.toLowerCase()}`;
      const updatedFilters = { ...mapFilters };

      // Deselect all bus-view radio buttons first
      Object.keys(updatedFilters).forEach((key) => {
        if (key === 'bus-stops' || key.startsWith('bus-route-')) {
          updatedFilters[key] = false;
        }
      });

      // Select the active route in the filter
      updatedFilters[routeFilterKey] = true;
      
      // Also uncheck landmarks, academic, and residences when a route is selected from nearest stops
      updatedFilters['important'] = false;
      updatedFilters['academic'] = false;
      updatedFilters['residences'] = false;

      setMapFilters(updatedFilters);

      previousActiveRouteRef.current = activeRoute;

      // Reset flag after a short delay to allow state to settle
      setTimeout(() => {
        isSyncingFromActiveRouteRef.current = false;
      }, 100);
    } else if (!activeRoute && previousActiveRoute) {
      // When activeRoute becomes null (deselected from "nearest stops")
      // Restore the saved filter state
      isSyncingFromActiveRouteRef.current = true; // Set flag to prevent loop

      const updatedFilters = { ...mapFilters };

      // Deselect all bus routes
      Object.keys(updatedFilters).forEach((key) => {
        if (key.startsWith('bus-route-')) {
          updatedFilters[key] = false;
        }
      });

      // Restore the previously saved state, or default to Bus Stops and Landmarks
      if (savedFilterStateRef.current) {
        updatedFilters['bus-stops'] = savedFilterStateRef.current['bus-stops'];
        updatedFilters['important'] = savedFilterStateRef.current['important'];
        updatedFilters['academic'] = savedFilterStateRef.current['academic'];
        updatedFilters['residences'] = savedFilterStateRef.current['residences'];
        
        // Clear the saved state
        savedFilterStateRef.current = null;
      } else {
        // Fallback to defaults if no saved state
        updatedFilters['bus-stops'] = true;
        updatedFilters['important'] = true;
      }

      setMapFilters(updatedFilters);

      previousActiveRouteRef.current = null;

      // Reset flag after a short delay
      setTimeout(() => {
        isSyncingFromActiveRouteRef.current = false;
      }, 100);
    }
  }, [activeRoute, mapFilters, setMapFilters]); // Added mapFilters and setMapFilters to dependencies

  // When filter route is selected, notify parent to clear activeRoute
  React.useEffect(() => {
    // Don't notify parent if we're syncing from activeRoute (to prevent loop)
    if (
      selectedFilterRoute &&
      activeRoute &&
      onActiveRouteChange &&
      !isSyncingFromActiveRouteRef.current
    ) {
      // Filter route is selected, so clear the activeRoute from parent
      onActiveRouteChange(null);
    }
  }, [selectedFilterRoute]); // Only depend on selectedFilterRoute

  // Determine if bus stops should be shown based on filters
  // Show bus stops if:
  // 1. effectiveActiveRoute is set (from either filter or nearest stops)
  // 2. "bus-stops" radio is selected
  // 3. visibleBusStops is provided (for internal route display)
  const shouldShowBusStops = effectiveActiveRoute
    ? true
    : (mapFilters['bus-stops'] && showBusStops) || (visibleBusStops && visibleBusStops.length > 0);

  const { mapRef, isMapCreated } = useGoogleMapsInit(
    mapContainerRef,
    safeInitialRegion,
    !!routePolyline // Don't pan/zoom if we have a route polyline
  );

  useEffect(() => {
    if (!forceResetCenter || !mapRef.current || !isMapCreated) return;
    if (routePolyline || internalRoutePolylines) return;
    mapRef.current.setCenter({
      lat: safeInitialRegion.latitude,
      lng: safeInitialRegion.longitude,
    });
    mapRef.current.setZoom(16);
  }, [
    forceResetCenter,
    isMapCreated,
    mapRef,
    routePolyline,
    internalRoutePolylines,
    safeInitialRegion,
  ]);

  const handleBusStopSelected = React.useCallback(
    (stop: BusStop) => {
      if (!enablePlaceDetails) return;
      const stopName = stop.ShortName || (stop as any).caption || stop.name;
      onMapItemSelect?.({
        type: 'place',
        place: {
          name: stopName,
          address: undefined,
          coordinates: { latitude: stop.latitude, longitude: stop.longitude },
          stopId: stop.name,
          type: 'bus-stop',
        },
      });
    },
    [enablePlaceDetails, onMapItemSelect]
  );

  // Fetch active buses for the selected route (use effectiveActiveRoute)
  const { data: activeBusesData } = useActiveBuses(
    effectiveActiveRoute as RouteCode,
    !!effectiveActiveRoute
  );
  const activeBuses = activeBusesData?.ActiveBusResult?.activebus || [];

  // Fetch service descriptions to get actual route colors from API
  const { data: serviceDescriptions } = useServiceDescriptions();

  // Get route color from API or use fallback
  const routeColor = React.useMemo(() => {
    // Use effectiveActiveRoute (single source of truth)
    if (!effectiveActiveRoute) return '#274F9C';

    // Try to get color from API
    const serviceDesc =
      serviceDescriptions?.ServiceDescriptionResult?.ServiceDescription?.find(
        (s) => s.Route === effectiveActiveRoute
      );

    if (serviceDesc?.Color) {
      // API returns hex without #, so add it
      return `#${serviceDesc.Color}`;
    }

    // Fallback colors (must match getRouteColor in utils.ts)
    const fallbackColors: Record<string, string> = {
      A1: '#FF0000', // Red
      A2: '#E3CE0B', // Yellow
      D1: '#C77DE2', // Light Purple
      D2: '#6F1B6F', // Dark Purple
      L: '#BFBFBF', // Gray
      E: '#00B050', // Green
      K: '#345A9B', // Blue
    };

    return fallbackColors[effectiveActiveRoute] || '#274F9C';
  }, [effectiveActiveRoute, serviceDescriptions]);

  // Fetch bus and stop data for filtered routes
  const filteredRouteCodes = React.useMemo(() => {
    const routes: RouteCode[] = [];
    Object.keys(mapFilters).forEach((key) => {
      if (key.startsWith('bus-route-') && mapFilters[key]) {
        const routeCode = key
          .replace('bus-route-', '')
          .toUpperCase() as RouteCode;
        routes.push(routeCode);
      }
    });
    return routes;
  }, [mapFilters]);

  // Fetch active buses for all filtered routes
  const filteredBusData1 = useActiveBuses(
    filteredRouteCodes[0],
    !!filteredRouteCodes[0]
  );
  const filteredBusData2 = useActiveBuses(
    filteredRouteCodes[1],
    !!filteredRouteCodes[1]
  );
  const filteredBusData3 = useActiveBuses(
    filteredRouteCodes[2],
    !!filteredRouteCodes[2]
  );
  const filteredBusData4 = useActiveBuses(
    filteredRouteCodes[3],
    !!filteredRouteCodes[3]
  );
  const filteredBusData5 = useActiveBuses(
    filteredRouteCodes[4],
    !!filteredRouteCodes[4]
  );
  const filteredBusData6 = useActiveBuses(
    filteredRouteCodes[5],
    !!filteredRouteCodes[5]
  );
  const filteredBusData7 = useActiveBuses(
    filteredRouteCodes[6],
    !!filteredRouteCodes[6]
  );
  const filteredBusData8 = useActiveBuses(
    filteredRouteCodes[7],
    !!filteredRouteCodes[7]
  );

  // Fetch pickup points for all filtered routes
  const filteredStopData1 = usePickupPoints(filteredRouteCodes[0]);
  const filteredStopData2 = usePickupPoints(filteredRouteCodes[1]);
  const filteredStopData3 = usePickupPoints(filteredRouteCodes[2]);
  const filteredStopData4 = usePickupPoints(filteredRouteCodes[3]);
  const filteredStopData5 = usePickupPoints(filteredRouteCodes[4]);
  const filteredStopData6 = usePickupPoints(filteredRouteCodes[5]);
  const filteredStopData7 = usePickupPoints(filteredRouteCodes[6]);
  const filteredStopData8 = usePickupPoints(filteredRouteCodes[7]);

  // Combine bus and stop data into Maps
  const busDataByRoute = React.useMemo(() => {
    const map = new Map<string, any>();
    const busDataArray = [
      filteredBusData1,
      filteredBusData2,
      filteredBusData3,
      filteredBusData4,
      filteredBusData5,
      filteredBusData6,
      filteredBusData7,
      filteredBusData8,
    ];
    filteredRouteCodes.forEach((routeCode, index) => {
      const buses = busDataArray[index]?.data?.ActiveBusResult?.activebus || [];
      map.set(routeCode, buses);
    });
    return map;
  }, [
    filteredRouteCodes,
    filteredBusData1.data,
    filteredBusData2.data,
    filteredBusData3.data,
    filteredBusData4.data,
    filteredBusData5.data,
    filteredBusData6.data,
    filteredBusData7.data,
    filteredBusData8.data,
  ]);

  const stopDataByRoute = React.useMemo(() => {
    const map = new Map<string, any>();
    const stopDataArray = [
      filteredStopData1,
      filteredStopData2,
      filteredStopData3,
      filteredStopData4,
      filteredStopData5,
      filteredStopData6,
      filteredStopData7,
      filteredStopData8,
    ];
    filteredRouteCodes.forEach((routeCode, index) => {
      const stops =
        stopDataArray[index]?.data?.PickupPointResult?.pickuppoint || [];
      map.set(routeCode, stops);
    });
    return map;
  }, [
    filteredRouteCodes,
    filteredStopData1.data,
    filteredStopData2.data,
    filteredStopData3.data,
    filteredStopData4.data,
    filteredStopData5.data,
    filteredStopData6.data,
    filteredStopData7.data,
    filteredStopData8.data,
  ]);

  useMapMarkers({
    mapRef,
    origin,
    destination,
    waypoints,
    onMarkerPress,
    activeRoute: effectiveActiveRoute,
  }); // Hide origin/waypoint markers when route selected
  
  // Render internal route polylines if available, otherwise render Google Maps route
  // Always call all hooks to maintain hook order (Rules of Hooks)
  useInternalRoutePolyline(mapRef, internalRoutePolylines);
  useMapPolyline(
    mapRef,
    internalRoutePolylines ? undefined : routePolyline,
    internalRoutePolylines ? undefined : routeSteps
  );
  useConnectorLines(
    mapRef,
    connectorOrigin,
    connectorDestination,
    routePolyline,
    routeSteps,
    internalRoutePolylines,
    showRouteConnectors
  ); // Draw dotted lines from user to route start and route end to destination
  
  useNUSCampusHighlight(mapRef, isMapCreated, showD1Route, mapFilters.academic || false, mapFilters.residences || false);
  useBusMarkers(mapRef, isMapCreated, activeBuses, routeColor, effectiveActiveRoute);
  // Don't render full route checkpoints when showing internal route polylines (which shows only the segment)
  useRouteCheckpoints(mapRef, internalRoutePolylines ? null : effectiveActiveRoute, routeColor);
  // Only show filtered bus routes if a filter route is selected (not when "Bus Stops" is selected)
  useFilteredBusRoutes(
    mapRef,
    selectedFilterRoute
      ? { [`bus-route-${selectedFilterRoute.toLowerCase()}`]: true }
      : {},
    busDataByRoute,
    stopDataByRoute
  );
  useLandmarkMarkers(
    mapRef,
    isMapCreated && shouldShowLandmarks,
    effectiveActiveRoute,
    setSelectedPlaceIdWithLogging // Pass the callback to show Place UI Kit
  ); // Control landmarks with filter
  usePrinterMarkers(
    mapRef,
    isMapCreated && shouldShowPrinters,
    effectiveActiveRoute,
    setSelectedPrinter,
    selectedPrinterId
  ); // Control printers with filter
  useSportsFacilityMarkers(
    mapRef,
    isMapCreated && shouldShowSports,
    effectiveActiveRoute,
    setSelectedSportsFacility,
    selectedSportsFacilityId
  ); // Control sports facilities with filter
  useBusStopMarkers(
    mapRef,
    isMapCreated,
    shouldShowBusStops,
    effectiveActiveRoute,
    routeColor,
    visibleBusStopsColor,
    visibleBusStops,
    handleBusStopSelected,
    selectedBusStopId
  ); // Control bus stops with filter, but always show when route selected
  useUserLocationMarker(mapRef, isMapCreated); // Add user location with directional arrow
  useDestinationMarker(mapRef, isMapCreated, destination, effectiveActiveRoute); // Add destination pin marker (hidden when route selected)
  usePlaceDetailsClick(mapRef, isMapCreated, setSelectedPlaceIdWithLogging, enablePlaceDetails, isPlaceLoading); // Handle place clicks with debouncing and abort control
  usePOIVisibilityControl(mapRef, isMapCreated); // Dynamically show/hide Google Maps POIs based on zoom
  useTiltControl(mapRef, isMapCreated); // Control 45-degree tilt in satellite/hybrid view based on zoom level

  const handleMapTypeChange = React.useCallback(
    (mapType: google.maps.MapTypeId | 'dark' | 'light') => {
      setCurrentMapType(mapType); // Track current map type
      if (mapRef.current) {
        if (mapType === 'dark') {
          // Apply dark mode styles
          mapRef.current.setMapTypeId('roadmap');
          const currentStyles = mapRef.current.get('styles') || [];
          // Filter out old dark mode styles and POI hiding styles, then re-add them
          const poiStyles = currentStyles.filter(
            (style: any) =>
              style.featureType === 'poi' ||
              style.featureType === 'poi.business' ||
              style.featureType === 'transit'
          );
          mapRef.current.setOptions({
            styles: [...DARK_MODE_STYLES, ...poiStyles],
          });
        } else if (mapType === 'light') {
          // Apply light mode (standard roadmap with only POI hiding)
          mapRef.current.setMapTypeId('roadmap');
          mapRef.current.setOptions({
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'poi.business',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'transit.station',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'transit.station.rail',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'transit.line',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
          });
        } else if (mapType === 'satellite') {
          // IMPORTANT: Google Maps styles API does NOT work with satellite imagery
          // The satellite map type shows imagery without labels by design
          // To show satellite imagery WITH labels, use 'hybrid' map type instead
          // Here we automatically convert 'satellite' to 'hybrid' to show labels
          mapRef.current.setMapTypeId('hybrid');
          // Clear any custom styles (styles don't apply to satellite/hybrid anyway)
          mapRef.current.setOptions({
            styles: [],
          });
        } else {
          // Standard map types (terrain, hybrid)
          mapRef.current.setMapTypeId(mapType);
          // Clear custom styles for these map types
          mapRef.current.setOptions({
            styles: [],
          });
        }
      }
    },
    []
  );

  // Pass map type change handler to parent when map is ready
  React.useEffect(() => {
    if (isMapCreated && onMapTypeChangeReady) {
      onMapTypeChangeReady(handleMapTypeChange);
    }
  }, [isMapCreated, onMapTypeChangeReady, handleMapTypeChange]);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
    >
      {!isMapCreated && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#E8EAF6',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              color: '#274F9C',
              fontWeight: '500',
            }}
          >
            Loading Map...
          </span>
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          backgroundColor: '#E8EAF6',
          filter: 'contrast(1.05) saturate(1.1)', // Slight enhancement to campus area
        }}
        className="google-map-container"
      />
      <style>{`
        .google-map-container .gm-style > div:first-child {
          filter: blur(0px) !important;
        }
        .google-map-container .gm-style img[src^="data:image/svg"] {
          overflow: visible !important;
        }
        .google-map-container .gm-style > div > div > div > div {
          overflall default Google Maps controls */
        .google-map-container .gmnoprint,
        .google-map-container .gm-bundled-control,
        .google-map-container .gm-control-active,
        .google-map-container button[draggable="false"],
        .google-map-container div[role="button"],
        .google-map-container .gm-svpc,
        .google-map-container .gm-style-mtc,
        .google-map-container button[aria-label*="Rotate"],
        .google-map-container button[aria-label*="Tilt"],
        .google-map-container button[aria-label*="Zoom"],
        .google-map-container button[aria-label*="compass"] {
          display: none !important;
        }
        /* Specifically target bottom-right controls container */
        .google-map-container .gm-style > div:not([class]) > div:last-child
        }
        .google-map-container .gm-control-active {
          display: none !important;
        }
      `}</style>
      {/* Always show controls, not just when map is loaded */}
      {showMapControls && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '20px',
            zIndex: 9999,
          }}
        >
          <MapTypeSelector
            onMapTypeChange={handleMapTypeChange}
            onFilterChange={(filters) => {
              console.log('Filter changes:', filters);
              setMapFilters(filters);
            }}
            filters={mapFilters}
          />
        </div>
      )}

      {/* Loading Placeholder */}
      {selectedPlaceId && isPlaceLoading && (
        <div
          style={{
            position: 'absolute',
            top: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            width: '90%',
            maxWidth: '400px',
            backgroundColor: currentMapType === 'dark' ? '#1e1e1e' : 'white',
            borderRadius: '12px',
            boxShadow: currentMapType === 'dark' 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '120px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #274F9C',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Place Details Compact Element */}
      {enablePlaceDetails && selectedPlaceId && isMapCreated && (
        <div
          style={{
            position: 'absolute',
            top: '84px', // Position below map controls with increased spacing
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            width: '90%',
            maxWidth: '400px',
            backgroundColor: currentMapType === 'dark' ? '#1e1e1e' : 'white',
            borderRadius: '12px',
            boxShadow: currentMapType === 'dark' 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            pointerEvents: 'auto',
            opacity: isPlaceLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
          onClick={() => console.log('[InteractiveMap] Place details container clicked')}
        >
          <PlaceDetailsCompact
            placeId={selectedPlaceId}
            colorMode="light"
            onClose={() => {
              console.log('[InteractiveMap] Close button clicked');
              setSelectedPlaceIdWithLogging(null);
            }}
            onLoadingChange={(loading) => {
              console.log('[InteractiveMap] Loading state changed:', loading);
              setIsPlaceLoading(loading);
            }}
            onDirections={async (placeId) => {
              console.log('[InteractiveMap] Directions button clicked for place:', placeId);
              
              try {
                // Fetch place details using Google Places API
                const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
                const place = new Place({
                  id: placeId,
                  requestedLanguage: 'en',
                });
                
                // Fetch the required fields
                await place.fetchFields({
                  fields: ['displayName', 'formattedAddress', 'location'],
                });
                
                const location = place.location;
                const displayName = place.displayName;
                const address = place.formattedAddress;
                
                console.log('[InteractiveMap] Place details fetched:', { displayName, address, location });
                
                // Get user location
                const userLat = userLocation?.latitude?.toString() || '';
                const userLng = userLocation?.longitude?.toString() || '';
                
                // Navigate to navigation page with proper parameters
                if (typeof window !== 'undefined') {
                  const params = new URLSearchParams({
                    destination: displayName || 'Selected Location',
                    destinationAddress: address || '',
                    destinationLat: location?.lat().toString() || '',
                    destinationLng: location?.lng().toString() || '',
                    userLat: userLat,
                    userLng: userLng,
                  });
                  
                  window.location.href = `/(app)/navigation?${params.toString()}`;
                }
              } catch (error) {
                console.error('[InteractiveMap] Error fetching place details:', error);
              }
            }}
          />
        </div>
      )}

      {/* Printer Details Modal */}
      {selectedPrinter && (
        <div
          style={{
            position: 'absolute',
            top: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            width: '90%',
            maxWidth: '400px',
            backgroundColor: currentMapType === 'dark' ? '#1e1e1e' : 'white',
            borderRadius: '12px',
            boxShadow: currentMapType === 'dark' 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            pointerEvents: 'auto',
            color: currentMapType === 'dark' ? '#ffffff' : '#000000',
          }}
        >
          {/* Header with close button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderBottom: currentMapType === 'dark' ? '1px solid #333' : '1px solid #e5e7eb',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {selectedPrinter.building} Printer
            </h3>
            <button
              onClick={() => setSelectedPrinter(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentMapType === 'dark' ? '#999' : '#666',
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: currentMapType === 'dark' ? '#999' : '#666',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Location
              </div>
              <div style={{ fontSize: '15px', lineHeight: '1.5' }}>
                {selectedPrinter.location}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: currentMapType === 'dark' ? '#999' : '#666',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Operating Hours
              </div>
              <div style={{ fontSize: '15px' }}>
                {selectedPrinter.hours}
              </div>
            </div>

            {/* Directions button */}
            <a
              href={selectedPrinter.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                backgroundColor: '#FF8C00',
                color: 'white',
                textAlign: 'center',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E67E00';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FF8C00';
              }}
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      )}

      {/* Sports Facility Details Modal */}
      {selectedSportsFacility && (
        <div
          style={{
            position: 'absolute',
            top: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            width: '90%',
            maxWidth: '400px',
            backgroundColor: currentMapType === 'dark' ? '#1e1e1e' : 'white',
            borderRadius: '12px',
            boxShadow: currentMapType === 'dark' 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            pointerEvents: 'auto',
            color: currentMapType === 'dark' ? '#ffffff' : '#000000',
          }}
        >
          {/* Header with close button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderBottom: currentMapType === 'dark' ? '1px solid #333' : '1px solid #e5e7eb',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {selectedSportsFacility.name}
            </h3>
            <button
              onClick={() => setSelectedSportsFacility(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentMapType === 'dark' ? '#999' : '#666',
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px' }}>
            {selectedSportsFacility.address && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: currentMapType === 'dark' ? '#999' : '#666',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Location
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.5' }}>
                  {selectedSportsFacility.address}
                </div>
              </div>
            )}

            {selectedSportsFacility.hours && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: currentMapType === 'dark' ? '#999' : '#666',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Operating Hours
                </div>
                <div style={{ fontSize: '15px' }}>
                  {selectedSportsFacility.hours}
                </div>
              </div>
            )}

            {/* Directions button */}
            <a
              href={selectedSportsFacility.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                backgroundColor: getSportsFacilityColor(selectedSportsFacility.type),
                color: 'white',
                textAlign: 'center',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                const baseColor = getSportsFacilityColor(selectedSportsFacility.type);
                // Darken the color on hover
                e.currentTarget.style.backgroundColor = baseColor.replace(/^#/, '#') + 'dd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getSportsFacilityColor(selectedSportsFacility.type);
              }}
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
