import polyline from '@mapbox/polyline';
import React, { useEffect, useRef, useState } from 'react';

import type { ActiveBus, BusStop, RouteCode } from '@/api/bus';
import {
  useActiveBuses,
  useBusStops,
  useCheckpoints,
  usePickupPoints,
  useServiceDescriptions,
} from '@/api/bus';
import type { LatLng } from '@/api/google-maps';
import type { RouteStep } from '@/api/google-routes';
import { createBusMarkerSVG, svgToDataURL } from '@/components/bus-marker-icon';
import {
  getLandmarkMarkerSVG,
  NUS_LANDMARKS,
} from '@/components/landmark-marker-icons';
import { MapTypeSelector } from '@/components/map-type-selector';
import routeCheckpointsData from '@/data/route-checkpoints.json';
import { Env } from '@/lib/env';
import { useLocation } from '@/lib/hooks/use-location';
import { getTransitLineColor, PUBLIC_BUS_COLOR } from '@/lib/transit-colors';

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
      'gmp-place-standard-content': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface InteractiveMapProps {
  origin?: LatLng;
  destination?: LatLng;
  waypoints?: LatLng[];
  routePolyline?: string;
  routeSteps?: RouteStep[]; // Individual route steps for multi-colored rendering
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
}

// Use a campus-centered starting point. The user provided a screen-centered
// coordinate to try first so the map appears higher on the screen (accounts
// for the bottom panel overlay).
const DEFAULT_REGION = {
  latitude: 1.3965033959396037,
  longitude: 103.77708613739266,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const PADDING = { top: 50, right: 50, bottom: 50, left: 50 };

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
    if (window.google?.maps) {
      resolve();
      return;
    }

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      // Script is loading, wait for it
      existingScript.addEventListener('load', () => {
        resolve();
      });
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load Google Maps'))
      );
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Env.GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.addEventListener('load', () => {
      resolve();
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
}): google.maps.Marker => {
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
    <svg width="32" height="48" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
      <!-- Pin shape -->
      <path d="M 16 0 C 7.163 0 0 7.163 0 16 C 0 28 16 48 16 48 S 32 28 32 16 C 32 7.163 24.837 0 16 0 Z" 
            fill="#EA4335" stroke="white" stroke-width="2"/>
      <!-- Inner circle -->
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `;
};

// Helper to add coordinate listener for development
const addCoordinateListener = (map: google.maps.Map) => {
  map.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      // Just output the coordinate in the console for easy copying later
      console.log(`{ lat: ${lat}, lng: ${lng} },`);
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
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: false, // disables zoom buttons
    rotateControl: false, // disables camera control
    tiltControl: false, // disables camera tilt
    gestureHandling: 'greedy',
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
      return;
    }

    if (!mapRef.current) {
      try {
        mapRef.current = createMapInstance(
          mapContainerRef.current,
          initialRegion
        );
        addCoordinateListener(mapRef.current);
        // Move the chosen target slightly upward on the viewport so it isn't
        // obscured by the bottom panel. Offset value can be tuned if needed.
        // Skip vertical offset if we have a route polyline (it will fitBounds instead)
        if (!hasRoutePolyline) {
          try {
            applyVerticalOffset(
              mapRef.current,
              { lat: initialRegion.latitude, lng: initialRegion.longitude },
              200 // increase offset so the focal point appears higher on the viewport
            );
          } catch (e) {
            // ignore
          }
        }
        if (mapContainerRef.current) {
          preventContextMenu(mapContainerRef.current);
        }
        setIsMapCreated(true);
      } catch (error) {
        console.error('Error creating map:', error);
      }
    }
  }, [isLoaded, initialRegion, mapContainerRef, hasRoutePolyline]);

  // Pan to new center when initialRegion changes (after map is already created)
  // Skip this if we have a route polyline (the polyline hook will handle bounds)
  useEffect(() => {
    if (mapRef.current && isMapCreated && !hasRoutePolyline) {
      mapRef.current.panTo({
        lat: initialRegion.latitude,
        lng: initialRegion.longitude,
      });
      mapRef.current.setZoom(15); // Zoom level for city-scale view
    }
  }, [initialRegion.latitude, initialRegion.longitude, isMapCreated, hasRoutePolyline]);

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
      const showDetails = zoom >= 17; // Show POIs and road labels when zoomed in to 17 or more

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
  { lat: 1.2992376778515882, lng: 103.77464139390793 },{ lat: 1.2992023711240488, lng: 103.77450594235268 },{ lat: 1.2991433776946506, lng: 103.77441742945518 },{ lat: 1.2988533483799471, lng: 103.77426680045423 },{ lat: 1.2987063663315235, lng: 103.77417203546094 },{ lat: 1.2985240229640997, lng: 103.77401110292004 },{ lat: 1.2982780546546064, lng: 103.7737248383048 },{ lat: 1.2981463680081078, lng: 103.7735306553492 },{ lat: 1.2978755344123467, lng: 103.77317123934121 },{ lat: 1.2978755344123467, lng: 103.77317123934121 },{ lat: 1.2974253952461479, lng: 103.77297552166989 },{ lat: 1.296984141988323, lng: 103.77275089330755 },{ lat: 1.2966248180364428, lng: 103.77247666956511 },{ lat: 1.296375784471599, lng: 103.7721067872154 },{ lat: 1.296251253552375, lng: 103.771722723362 },{ lat: 1.2962673426880174, lng: 103.77108703982547 },{ lat: 1.2961788524407367, lng: 103.77097975146488 },{ lat: 1.2957724010832452, lng: 103.77090080678208 },{ lat: 1.2956595034812397, lng: 103.7708731088678 },{ lat: 1.2953473990741131, lng: 103.7707094941179 },{ lat: 1.2951409217506769, lng: 103.77060757017533 },{ lat: 1.295009332061492, lng: 103.77062069349252 },{ lat: 1.2948993895779914, lng: 103.77073602848016 },{ lat: 1.2947995028429624, lng: 103.77075204722705 },{ lat: 1.2944669938263527, lng: 103.77079228036227 },{ lat: 1.294349796625622, lng: 103.7708236767887 },{ lat: 1.2941307944675133, lng: 103.77091730179104 },{ lat: 1.2938143745144493, lng: 103.77130353988919 },{ lat: 1.2938143745144493, lng: 103.77130353988919 },{ lat: 1.2935755154858273, lng: 103.77217628419358 },{ lat: 1.2934339041367455, lng: 103.7721964479735 },{ lat: 1.2932843067076605, lng: 103.7725896212637 },{ lat: 1.2931917940674906, lng: 103.77282565565702 },{ lat: 1.2932104591923195, lng: 103.77320137608498 },{ lat: 1.2932104591923195, lng: 103.77320137608498 },{ lat: 1.2927787334967482, lng: 103.77354469883889 },{ lat: 1.292730045671177, lng: 103.77346989226791 },{ lat: 1.2923903959903105, lng: 103.77386085395541 },{ lat: 1.2923179947684342, lng: 103.77403653864589 },{ lat: 1.2922241413296127, lng: 103.77421758775439 },{ lat: 1.2922241413296127, lng: 103.77421758775439 },{ lat: 1.292512844821077, lng: 103.77468678676368 },{ lat: 1.2928666775438622, lng: 103.77492104279938 },{ lat: 1.2929843602452984, lng: 103.77499272581862 },{ lat: 1.2936859324952368, lng: 103.7752584200203 },{ lat: 1.2937607775220779, lng: 103.77534787113605 },{ lat: 1.2937607775220779, lng: 103.77534787113605 },{ lat: 1.2937953690843786, lng: 103.77545907054424 },{ lat: 1.2949434575337568, lng: 103.7749126471301 },
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
    strokeWeight: 4,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
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
    strokeWeight: 3,
    fillColor: '#FFFFFF', // White fill
    fillOpacity: 0.2, // Transparent overlay
    geodesic: true,
    clickable: false, // Allow clicks to pass through to the map
  });
  lawArea.setMap(map);
  return lawArea;
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

    constructor(
      position: google.maps.LatLng,
      text: string,
      color: string
    ) {
      super();
      this.position = position;
      this.text = text;
      this.color = color;
    }

    onAdd() {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.fontSize = '14px';
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
      div.style.whiteSpace = 'nowrap';
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
  showAcademicOverlays: boolean = false
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
  const orangeLabelRef = useRef<google.maps.OverlayView | null>(null);
  const blueLabelRef = useRef<google.maps.OverlayView | null>(null);
  const darkBlueLabelRef = useRef<google.maps.OverlayView | null>(null);
  const yellowLabelRef = useRef<google.maps.OverlayView | null>(null);
  const darkOrangeLabelRef = useRef<google.maps.OverlayView | null>(null);
  const cdeLabelRef = useRef<google.maps.OverlayView | null>(null);
  const fassLabelRef = useRef<google.maps.OverlayView | null>(null);
  const combizLabelRef = useRef<google.maps.OverlayView | null>(null);
  const lawLabelRef = useRef<google.maps.OverlayView | null>(null);

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
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [mapRef, isMapLoaded]);

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

    const map = mapRef.current;

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
  }, [showAcademicOverlays, mapRef]);
};

const addMarkersAndFitBounds = ({
  map,
  origin,
  waypoints,
  destination,
  onMarkerPress,
}: {
  map: google.maps.Map;
  origin?: LatLng;
  waypoints?: LatLng[];
  destination?: LatLng;
  onMarkerPress?: (
    type: 'origin' | 'destination' | 'waypoint',
    index?: number
  ) => void;
}): google.maps.Marker[] => {
  const markers: google.maps.Marker[] = [];
  const bounds = new google.maps.LatLngBounds();
  let hasMarkers = false;

  if (origin) {
    const marker = createMarker({
      position: { lat: origin.lat, lng: origin.lng },
      map,
      title: 'Your Location',
      color: '#274F9C',
      scale: 10,
      onClick: () => onMarkerPress?.('origin'),
    });
    markers.push(marker);
    bounds.extend(marker.getPosition()!);
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
    markers.push(marker);
    bounds.extend(marker.getPosition()!);
    hasMarkers = true;
  });

  // Don't create destination marker here - it's handled by useDestinationMarker hook
  // This prevents the default circle marker from appearing
  if (destination) {
    // Just extend bounds to include destination for proper map framing
    bounds.extend(new google.maps.LatLng(destination.lat, destination.lng));
    hasMarkers = true;
  }

  if (hasMarkers) {
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

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Don't create markers if a route is selected
    if (activeRoute) {
      return;
    }

    markersRef.current = addMarkersAndFitBounds({
      map: mapRef.current,
      origin,
      waypoints,
      destination,
      onMarkerPress,
    });

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [origin, destination, waypoints, onMarkerPress, mapRef, activeRoute]);
};

const useMapPolyline = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  routePolyline?: string,
  routeSteps?: RouteStep[]
) => {
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    // Clear existing polylines
    polylinesRef.current.forEach((poly) => poly.setMap(null));
    polylinesRef.current = [];

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
          strokeWeight: 6,
          map: mapRef.current,
        };
        
        if (step.travelMode === 'TRANSIT' && step.transitDetails) {
          const lineName = step.transitDetails.transitLine.nameShort || step.transitDetails.transitLine.name;
          
          // Try to get color from API first
          const apiColor = step.transitDetails.transitLine.color;
          if (apiColor) {
            strokeColor = apiColor.startsWith('#') ? apiColor : `#${apiColor}`;
          } else {
            // Fallback to helper function
            strokeColor = getTransitLineColor(lineName);
          }
          polylineOptions.strokeColor = strokeColor;
        } else if (step.travelMode === 'WALK') {
          strokeColor = '#7D7D7D'; // Gray for walking
          // Make walking segments dotted
          polylineOptions.strokeColor = strokeColor;
          polylineOptions.strokeOpacity = 0;
          polylineOptions.icons = [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              strokeWeight: 3,
              scale: 1,
            },
            offset: '0',
            repeat: '10px', // Increased gap between dots
          }];
        }

        const stepPolyline = new google.maps.Polyline(polylineOptions);

        polylinesRef.current.push(stepPolyline);
        
        // Extend bounds for this step
        decodedPath.forEach((point) => bounds.extend(point));
      });

      // Fit map to show all steps
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, {
          top: 100,
          right: 50,
          bottom: 400,
          left: 50,
        });
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
        strokeWeight: 6,
        map: mapRef.current,
      });

      polylinesRef.current.push(singlePolyline);

      // Fit map bounds to show entire route
      const bounds = new google.maps.LatLngBounds();
      decodedPath.forEach((point) => bounds.extend(point));
      mapRef.current.fitBounds(bounds, {
        top: 100,
        right: 50,
        bottom: 400,
        left: 50,
      });
    }

    return () => {
      polylinesRef.current.forEach((poly) => poly.setMap(null));
    };
  }, [routePolyline, routeSteps, mapRef]);
};

// Hook to draw dotted connector lines from user location to route start and route end to destination
const useConnectorLines = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  origin?: LatLng,
  destination?: LatLng,
  routePolyline?: string
) => {
  const startConnectorRef = useRef<google.maps.Polyline | null>(null);
  const endConnectorRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    // Remove existing connector lines
    if (startConnectorRef.current) {
      startConnectorRef.current.setMap(null);
      startConnectorRef.current = null;
    }
    if (endConnectorRef.current) {
      endConnectorRef.current.setMap(null);
      endConnectorRef.current = null;
    }

    // Only draw connectors if we have a route
    if (routePolyline) {
      const decodedPath = polyline
        .decode(routePolyline)
        .map(([lat, lng]) => ({ lat, lng }));

      if (decodedPath.length > 0) {
        const routeStart = decodedPath[0];
        const routeEnd = decodedPath[decodedPath.length - 1];

        // Draw dotted line from user/origin location to route start
        if (origin) {
          const userLocation = { lat: origin.lat, lng: origin.lng };
          startConnectorRef.current = new google.maps.Polyline({
            path: [userLocation, routeStart],
            geodesic: true,
            strokeColor: '#274F9C',
            strokeOpacity: 0,
            strokeWeight: 0,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#274F9C',
                  fillOpacity: 0.8,
                  strokeColor: '#274F9C',
                  strokeOpacity: 1,
                  strokeWeight: 1,
                  scale: 3,
                },
                offset: '0',
                repeat: '15px',
              },
            ],
            map: mapRef.current,
          });
        }

        // Draw dotted line from route end to destination
        if (destination) {
          const destinationLocation = { lat: destination.lat, lng: destination.lng };
          endConnectorRef.current = new google.maps.Polyline({
            path: [routeEnd, destinationLocation],
            geodesic: true,
            strokeColor: '#274F9C',
            strokeOpacity: 0,
            strokeWeight: 0,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#274F9C',
                  fillOpacity: 0.8,
                  strokeColor: '#274F9C',
                  strokeOpacity: 1,
                  strokeWeight: 1,
                  scale: 3,
                },
                offset: '0',
                repeat: '15px',
              },
            ],
            map: mapRef.current,
          });
        }
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
  }, [origin, destination, routePolyline, mapRef]);
};

// Hook to render bus stop markers with labels
const useBusStopMarkers = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  showBusStops: boolean,
  activeRoute?: RouteCode | null,
  routeColor?: string
) => {
  const circleMarkersRef = useRef<google.maps.Marker[]>([]);
  const labelMarkersRef = useRef<google.maps.Marker[]>([]);
  const { data: busStopsData } = useBusStops();
  const { data: pickupPointsData } = usePickupPoints(activeRoute as RouteCode);

  useEffect(() => {
    if (!mapRef.current || !isMapCreated || typeof window === 'undefined' || !window.google) {
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

    // Get the pickup points for the active route (stops that belong to this route)
    const routeStopNames = new Set<string>();
    if (activeRoute && pickupPointsData?.PickupPointResult?.pickuppoint) {
      pickupPointsData.PickupPointResult.pickuppoint.forEach((pp: any) => {
        routeStopNames.add(pp.ShortName);
      });
    }

    // Log all bus stop names to debug
    console.log('All bus stops:', busStops.map((s: BusStop) => ({
      name: s.name,
      ShortName: s.ShortName,
      caption: s.caption
    })));

    // Priority stops that should always be shown (key locations)
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

    // Function to check if a stop is a priority stop
    const isPriorityStop = (stop: BusStop) => {
      // Use exact match for ShortName to avoid "UHall" matching "Opp UHall"
      const isMatch = priorityStops.some((priority) =>
        stop.ShortName === priority ||
        stop.ShortName.trim() === priority
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

      // If a route is selected, only show stops belonging to that route
      if (activeRoute) {
        // Handle circle markers - show only route stops AND only when zoomed in
        circleMarkersRef.current.forEach((marker) => {
          const title = marker.getTitle();
          const belongsToActiveRoute = title ? routeStopNames.has(title) : false;
          marker.setVisible(belongsToActiveRoute && showAllStops); // Added zoom check
        });

        // Handle label markers - show route stops (labels visible at all zoom levels)
        labelMarkersRef.current.forEach((marker) => {
          const title = marker.getTitle();
          const belongsToActiveRoute = title ? routeStopNames.has(title) : false;
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
          const isPriority = title
            ? priorityStops.some((p) => title === p || title.trim() === p)
            : false;

          // Show all stops when zoomed in, or only priority stops when zoomed out
          marker.setVisible(showAllStops || isPriority);
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
        const stopColor = (activeRoute && isRouteStop && routeColor) ? routeColor : '#274F9C';
        const labelBelow = shouldLabelBelow(stop);
        const svgAnchorY = labelBelow ? 5 : 25;

        const newIcon = {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="250" height="40">
              <text x="125" y="25" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" 
                    fill="${stopColor}" text-anchor="middle" stroke="#FFFFFF" stroke-width="${strokeWidth}" paint-order="stroke">
                ${stop.ShortName}
              </text>
              <text x="125" y="25" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" 
                    fill="${stopColor}" text-anchor="middle">
                ${stop.ShortName}
              </text>
            </svg>
          `),
          anchor: new google.maps.Point(125, svgAnchorY),
        };

        marker.setIcon(newIcon);
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
        const hasStopToNorth = nearbyStops.some((otherStop: BusStop) => 
          otherStop.latitude > stop.latitude
        );
        return hasStopToNorth; // Label below if this stop is more south (has stops north of it)
      }
      
      return false; // Default to label above
    };

    busStops.forEach((stop: BusStop) => {
      const isStopPriority = isPriorityStop(stop);
      const isRouteStop = belongsToRoute(stop);
      
      // Determine the color to use
      const stopColor = (activeRoute && isRouteStop && routeColor) ? routeColor : '#274F9C';
      
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
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="30">
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" 
                    fill="${stopColor}" text-anchor="middle" stroke="#FFFFFF" stroke-width="3" paint-order="stroke">
                ${stop.ShortName}
              </text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" 
                    fill="${stopColor}" text-anchor="middle">
                ${stop.ShortName}
              </text>
            </svg>
          `),
          anchor: new google.maps.Point(100, svgAnchorY),
        },
        title: stop.ShortName, // Add title to label too for filtering
        zIndex: 601, // Higher than both Google Maps pins (500) and bus stop circles
        visible: activeRoute ? isRouteStop : isStopPriority, // Show route stops if route selected, else priority stops
      });

      circleMarkersRef.current.push(marker);
      labelMarkersRef.current.push(label);
    });

    // Set up zoom change listener to update both visibility and size
    const zoomListener = map.addListener('zoom_changed', () => {
      updateMarkersVisibility();
      updateLabelSizes();
    });

    // Initial visibility and size update
    updateMarkersVisibility();
    updateLabelSizes();

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      circleMarkersRef.current.forEach((marker) => marker.setMap(null));
      labelMarkersRef.current.forEach((marker) => marker.setMap(null));
      circleMarkersRef.current = [];
      labelMarkersRef.current = [];
    };
  }, [mapRef, isMapCreated, showBusStops, busStopsData, activeRoute, pickupPointsData, routeColor]);
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
    if (!mapRef.current || !isMapCreated || typeof window === 'undefined' || !window.google) {
      return;
    }

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    // Create new destination marker if destination exists and no route is selected
    if (destination && !activeRoute) {
      const iconSvg = createDestinationPinSVG();
      const iconUrl = svgToDataURL(iconSvg);

      markerRef.current = new google.maps.Marker({
        position: destination,
        map: mapRef.current,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(32, 48),
          anchor: new google.maps.Point(16, 48), // Anchor at bottom center of pin
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
  activeBuses: ActiveBus[],
  routeColor: string = '#274F9C'
) => {
  const busMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google) {
      return;
    }

    const map = mapRef.current;

    // Remove existing bus markers
    busMarkersRef.current.forEach((marker) => marker.setMap(null));
    busMarkersRef.current = [];

    // Create new markers for each active bus
    activeBuses.forEach((bus) => {
      const { lat, lng, veh_plate, direction } = bus;

      // Use horizontal flip for reverse direction instead of rotation
      const flipHorizontal = direction === 2;

      // Create SVG icon for bus marker with route color
      const iconSvg = createBusMarkerSVG(routeColor, flipHorizontal);
      const iconUrl = svgToDataURL(iconSvg);

      // Create marker
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16), // Center the icon
        },
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
  }, [mapRef, activeBuses, routeColor]);

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
      strokeWeight: 4,
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
    BTC: '#EF8136',
    L: '#BFBFBF',
    E: '#00B050',
    K: '#345A9B',
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
        const checkpoints = (routeCheckpointsData as Record<string, any>)[routeCode];
        
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
            strokeWeight: 4,
            map,
          });

          polylinesRef.current.set(routeCode, polyline);
        }
      }

      // Update bus markers
      const buses = busDataByRoute.get(routeCode) || [];
      const existingBusMarkers = busMarkersRef.current.get(routeCode) || [];
      existingBusMarkers.forEach((marker) => marker.setMap(null));

      const newBusMarkers: google.maps.Marker[] = [];
      buses.forEach((bus: any) => {
        const { lat, lng, veh_plate, direction, speed } = bus;
        const flipHorizontal = direction === 2;
        const iconSvg = createBusMarkerSVG(routeColor, flipHorizontal);
        const iconUrl = svgToDataURL(iconSvg);

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
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

      // Update stop markers
      const stops = stopDataByRoute.get(routeCode) || [];
      const existingStopMarkers = stopMarkersRef.current.get(routeCode) || [];
      existingStopMarkers.forEach((marker) => marker.setMap(null));

      const newStopMarkers: google.maps.Marker[] = [];
      stops.forEach((stop: any) => {
        const marker = new google.maps.Marker({
          position: { lat: stop.latitude, lng: stop.longitude },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: routeColor,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          title: stop.name,
          zIndex: 500,
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
    });

    // Cleanup on unmount
    return () => {
      polylinesRef.current.forEach((polyline) => {
        polyline.setMap(null);
      });
      polylinesRef.current.clear();

      busMarkersRef.current.forEach((markers) => {
        markers.forEach((marker) => marker.setMap(null));
      });
      busMarkersRef.current.clear();

      stopMarkersRef.current.forEach((markers) => {
        markers.forEach((marker) => marker.setMap(null));
      });
      stopMarkersRef.current.clear();
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
  activeRoute?: RouteCode | null
) => {
  const landmarkMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapCreated || typeof window === 'undefined' || !window.google) {
      return;
    }

    // Remove existing landmark markers
    landmarkMarkersRef.current.forEach((marker) => marker.setMap(null));
    landmarkMarkersRef.current = [];

    // Don't create landmark markers if a route is selected
    if (activeRoute) {
      return;
    }

    // Create markers for each landmark
    NUS_LANDMARKS.forEach((landmark) => {
      const marker = new google.maps.Marker({
        position: landmark.coordinates,
        map,
        icon: {
          url: getLandmarkMarkerSVG(landmark.type),
          scaledSize: new google.maps.Size(40, 52),
          anchor: new google.maps.Point(20, 52),
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

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      landmarkMarkersRef.current.push(marker);
    });

    // Cleanup
    return () => {
      landmarkMarkersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [mapRef, isMapCreated, activeRoute]);

  return landmarkMarkersRef;
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
    if (!mapRef.current || !isMapCreated || typeof window === 'undefined' || !window.google) {
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
          scaledSize: new google.maps.Size(48, 48),
          anchor: new google.maps.Point(24, 24),
        });
      } else {
        // Create new marker
        userMarkerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
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
        const heading =
          (event as any).webkitCompassHeading || event.alpha || 0;
        headingRef.current = heading;

        // Update marker rotation if we have location
        if (userLocation && userMarkerRef.current) {
          updateUserMarker(userLocation.latitude, userLocation.longitude, heading);
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
    if (userLocation) {
      updateUserMarker(userLocation.latitude, userLocation.longitude, headingRef.current);
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

// Hook to handle place details when clicking on POIs
const usePlaceDetailsClick = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  onPlaceSelected: (placeId: string | null) => void
) => {
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

    // Add click listener to the map
    const clickListener = map.addListener(
      'click',
      (event: google.maps.MapMouseEvent & { placeId?: string }) => {
        if (event.placeId) {
          // User clicked on a POI (Point of Interest)
          event.stop(); // Prevent default info window
          onPlaceSelected(event.placeId);
        } else {
          // User clicked on empty map area - close place details
          onPlaceSelected(null);
        }
      }
    );

    return () => {
      if (clickListener) {
        google.maps.event.removeListener(clickListener);
      }
    };
  }, [mapRef, isMapCreated, onPlaceSelected]);
};

// PlaceDetailsCompact Component using Google Places UI Kit
const PlaceDetailsCompact: React.FC<{
  placeId: string;
  onClose: () => void;
}> = ({ placeId, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const placeDetailsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined' || !window.google) {
      return;
    }

    // Dynamically create the place details element
    const loadPlacesLibrary = async () => {
      try {
        // Import the places library
        await google.maps.importLibrary('places');

        // Create the custom elements
        const placeDetails = document.createElement('gmp-place-details-compact') as HTMLElement;
        const placeRequest = document.createElement('gmp-place-details-place-request') as HTMLElement;
        const contentConfig = document.createElement('gmp-place-standard-content') as HTMLElement;

        // Set the place ID
        placeRequest.setAttribute('place', placeId);

        // Append elements
        placeDetails.appendChild(placeRequest);
        placeDetails.appendChild(contentConfig);

        // Set attributes
        placeDetails.setAttribute('orientation', 'horizontal');
        placeDetails.setAttribute('truncation-preferred', '');

        // Clear and append to container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(placeDetails);
          placeDetailsRef.current = placeDetails;
        }
      } catch (error) {
        console.error('Error loading place details:', error);
      }
    };

    loadPlacesLibrary();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [placeId]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 1,
          background: 'rgba(255, 255, 255, 0.95)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
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
      
      {/* Place details container */}
      <div
        ref={containerRef}
        style={{
          minHeight: '80px',
          width: '100%',
        }}
      />
    </div>
  );
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  origin,
  destination,
  waypoints = [],
  routePolyline,
  routeSteps,
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const previousActiveRouteRef = useRef<RouteCode | null>(null);
  const isSyncingFromActiveRouteRef = useRef(false); // Track if we're syncing from activeRoute to prevent loops
  
  // Map filter state - controlled internally with localStorage persistence
  const [mapFilters, setMapFilters] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('nus-nextbus-map-filters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading map filters:', error);
    }
    return {
      important: true,
      'bus-stops': true,
      academic: false,
      residences: false,
      'bus-route-a1': false,
      'bus-route-a2': false,
      'bus-route-d1': false,
      'bus-route-d2': false,
      'bus-route-btc': false,
      'bus-route-e': false,
      'bus-route-k': false,
      'bus-route-l': false,
    };
  });

  // Determine if landmarks should be shown based on filters
  const shouldShowLandmarks = mapFilters.important && showLandmarks;
  
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
      
      setMapFilters(updatedFilters);
      
      // Save to localStorage
      try {
        localStorage.setItem('nus-nextbus-map-filters', JSON.stringify(updatedFilters));
      } catch (error) {
        console.error('Error saving filters:', error);
      }
      
      previousActiveRouteRef.current = activeRoute;
      
      // Reset flag after a short delay to allow state to settle
      setTimeout(() => {
        isSyncingFromActiveRouteRef.current = false;
      }, 100);
    } else if (!activeRoute && previousActiveRoute) {
      // When activeRoute becomes null (deselected from "nearest stops")
      // Revert to "Bus Stops" as default
      isSyncingFromActiveRouteRef.current = true; // Set flag to prevent loop
      
      const updatedFilters = { ...mapFilters };
      
      // Deselect all bus routes
      Object.keys(updatedFilters).forEach((key) => {
        if (key.startsWith('bus-route-')) {
          updatedFilters[key] = false;
        }
      });
      
      // Select "Bus Stops"
      updatedFilters['bus-stops'] = true;
      
      setMapFilters(updatedFilters);
      
      // Save to localStorage
      try {
        localStorage.setItem('nus-nextbus-map-filters', JSON.stringify(updatedFilters));
      } catch (error) {
        console.error('Error saving filters:', error);
      }
      
      previousActiveRouteRef.current = null;
      
      // Reset flag after a short delay
      setTimeout(() => {
        isSyncingFromActiveRouteRef.current = false;
      }, 100);
    }
  }, [activeRoute]); // Only depend on activeRoute
  
  // When filter route is selected, notify parent to clear activeRoute
  React.useEffect(() => {
    // Don't notify parent if we're syncing from activeRoute (to prevent loop)
    if (selectedFilterRoute && activeRoute && onActiveRouteChange && !isSyncingFromActiveRouteRef.current) {
      // Filter route is selected, so clear the activeRoute from parent
      onActiveRouteChange(null);
    }
  }, [selectedFilterRoute]); // Only depend on selectedFilterRoute
  
  // Determine if bus stops should be shown based on filters
  // Show bus stops if:
  // 1. effectiveActiveRoute is set (from either filter or nearest stops)
  // 2. "bus-stops" radio is selected
  const shouldShowBusStops = effectiveActiveRoute
    ? true
    : mapFilters['bus-stops'] && showBusStops;
  
  const { mapRef, isMapCreated } = useGoogleMapsInit(
    mapContainerRef,
    initialRegion,
    !!routePolyline // Don't pan/zoom if we have a route polyline
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
      BTC: '#EF8136', // Orange
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
        const routeCode = key.replace('bus-route-', '').toUpperCase() as RouteCode;
        routes.push(routeCode);
      }
    });
    return routes;
  }, [mapFilters]);

  // Fetch active buses for all filtered routes
  const filteredBusData1 = useActiveBuses(filteredRouteCodes[0], !!filteredRouteCodes[0]);
  const filteredBusData2 = useActiveBuses(filteredRouteCodes[1], !!filteredRouteCodes[1]);
  const filteredBusData3 = useActiveBuses(filteredRouteCodes[2], !!filteredRouteCodes[2]);
  const filteredBusData4 = useActiveBuses(filteredRouteCodes[3], !!filteredRouteCodes[3]);
  const filteredBusData5 = useActiveBuses(filteredRouteCodes[4], !!filteredRouteCodes[4]);
  const filteredBusData6 = useActiveBuses(filteredRouteCodes[5], !!filteredRouteCodes[5]);
  const filteredBusData7 = useActiveBuses(filteredRouteCodes[6], !!filteredRouteCodes[6]);
  const filteredBusData8 = useActiveBuses(filteredRouteCodes[7], !!filteredRouteCodes[7]);

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
    const busDataArray = [filteredBusData1, filteredBusData2, filteredBusData3, filteredBusData4,
                          filteredBusData5, filteredBusData6, filteredBusData7, filteredBusData8];
    filteredRouteCodes.forEach((routeCode, index) => {
      const buses = busDataArray[index]?.data?.ActiveBusResult?.activebus || [];
      map.set(routeCode, buses);
    });
    return map;
  }, [filteredRouteCodes, filteredBusData1.data, filteredBusData2.data, filteredBusData3.data, 
      filteredBusData4.data, filteredBusData5.data, filteredBusData6.data, filteredBusData7.data, filteredBusData8.data]);

  const stopDataByRoute = React.useMemo(() => {
    const map = new Map<string, any>();
    const stopDataArray = [filteredStopData1, filteredStopData2, filteredStopData3, filteredStopData4,
                           filteredStopData5, filteredStopData6, filteredStopData7, filteredStopData8];
    filteredRouteCodes.forEach((routeCode, index) => {
      const stops = stopDataArray[index]?.data?.PickupPointResult?.pickuppoint || [];
      map.set(routeCode, stops);
    });
    return map;
  }, [filteredRouteCodes, filteredStopData1.data, filteredStopData2.data, filteredStopData3.data,
      filteredStopData4.data, filteredStopData5.data, filteredStopData6.data, filteredStopData7.data, filteredStopData8.data]);

  useMapMarkers({ mapRef, origin, destination, waypoints, onMarkerPress, activeRoute: effectiveActiveRoute }); // Hide origin/waypoint markers when route selected
  useMapPolyline(mapRef, routePolyline, routeSteps);
  useConnectorLines(mapRef, origin, destination, routePolyline); // Draw dotted lines from user to route start and route end to destination
  useNUSCampusHighlight(mapRef, isMapCreated, showD1Route, mapFilters.academic);
  useBusMarkers(mapRef, activeBuses, routeColor);
  useRouteCheckpoints(mapRef, effectiveActiveRoute, routeColor);
  // Only show filtered bus routes if a filter route is selected (not when "Bus Stops" is selected)
  useFilteredBusRoutes(
    mapRef,
    selectedFilterRoute ? { [`bus-route-${selectedFilterRoute.toLowerCase()}`]: true } : {},
    busDataByRoute,
    stopDataByRoute
  );
  useLandmarkMarkers(mapRef, isMapCreated && shouldShowLandmarks, effectiveActiveRoute); // Control landmarks with filter
  useBusStopMarkers(mapRef, isMapCreated, shouldShowBusStops, effectiveActiveRoute, routeColor); // Control bus stops with filter, but always show when route selected
  useUserLocationMarker(mapRef, isMapCreated); // Add user location with directional arrow
  useDestinationMarker(mapRef, isMapCreated, destination, effectiveActiveRoute); // Add destination pin marker (hidden when route selected)
  usePlaceDetailsClick(mapRef, isMapCreated, setSelectedPlaceId); // Handle place clicks
  usePOIVisibilityControl(mapRef, isMapCreated); // Dynamically show/hide Google Maps POIs based on zoom

  const handleMapTypeChange = (mapType: google.maps.MapTypeId | 'dark' | 'light') => {
    if (mapRef.current) {
      if (mapType === 'dark') {
        // Apply dark mode styles
        mapRef.current.setMapTypeId('roadmap');
        const currentStyles = mapRef.current.get('styles') || [];
        // Filter out old dark mode styles and POI hiding styles, then re-add them
        const poiStyles = currentStyles.filter((style: any) => 
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
      } else {
        // Standard map types (satellite, terrain, hybrid)
        mapRef.current.setMapTypeId(mapType);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
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
      `}</style>
      {/* Always show controls, not just when map is loaded */}
      {showMapControls && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
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
      
      {/* Place Details Compact Element */}
      {selectedPlaceId && isMapCreated && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            width: '90%',
            maxWidth: '400px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
          }}
        >
          <PlaceDetailsCompact
            placeId={selectedPlaceId}
            onClose={() => setSelectedPlaceId(null)}
          />
        </div>
      )}
    </div>
  );
};