import polyline from '@mapbox/polyline';
import React, { useEffect, useRef, useState } from 'react';

import type { ActiveBus, BusStop, RouteCode } from '@/api/bus';
import {
  useActiveBuses,
  useBusStops,
  useCheckpoints,
  useServiceDescriptions,
} from '@/api/bus';
import type { LatLng } from '@/api/google-maps';
import { createBusMarkerSVG, svgToDataURL } from '@/components/bus-marker-icon';
import {
  getLandmarkMarkerSVG,
  NUS_LANDMARKS,
} from '@/components/landmark-marker-icons';
import { MapTypeSelector } from '@/components/map-type-selector';
import routeCheckpointsData from '@/data/route-checkpoints.json';
import { Env } from '@/lib/env';
import { useLocation } from '@/lib/hooks/use-location';

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
      console.log('📍 Right-clicked coordinates:');
      console.log(`  { lat: ${lat}, lng: ${lng} },`);
      if (navigator.clipboard) {
        const coordText = `{ lat: ${lat}, lng: ${lng} },`;
        navigator.clipboard.writeText(coordText);
        console.log('✅ Copied to clipboard!');
      }
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
    fillOpacity: 0.3,
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
    fillOpacity: 0.3,
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

// Hook to add NUS campus border and bus routes
const useNUSCampusHighlight = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapLoaded: boolean,
  showD1Route: boolean = false
) => {
  const campusBorderRef = useRef<google.maps.Polyline | null>(null);
  const campusOverlayRef = useRef<google.maps.Polygon | null>(null);
  const d1RouteRef = useRef<google.maps.Polyline | null>(null);

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
}: {
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  origin?: LatLng;
  destination?: LatLng;
  waypoints?: LatLng[];
  onMarkerPress?: (
    type: 'origin' | 'destination' | 'waypoint',
    index?: number
  ) => void;
}) => {
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = addMarkersAndFitBounds({
      map: mapRef.current,
      origin,
      waypoints,
      destination,
      onMarkerPress,
    });
  }, [origin, destination, waypoints, onMarkerPress, mapRef]);
};

const useMapPolyline = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  routePolyline?: string
) => {
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !window.google)
      return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (routePolyline) {
      const decodedPath = polyline
        .decode(routePolyline)
        .map(([lat, lng]) => ({ lat, lng }));

      polylineRef.current = new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: '#274F9C',
        strokeOpacity: 1.0,
        strokeWeight: 6,
        map: mapRef.current,
      });

      // Fit map bounds to show entire route
      const bounds = new google.maps.LatLngBounds();
      decodedPath.forEach((point) => bounds.extend(point));
      mapRef.current.fitBounds(bounds, {
        top: 100,
        right: 50,
        bottom: 400, // More padding at bottom for the card
        left: 50,
      });
    }
  }, [routePolyline, mapRef]);
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
  showBusStops: boolean
) => {
  const circleMarkersRef = useRef<google.maps.Marker[]>([]);
  const labelMarkersRef = useRef<google.maps.Marker[]>([]);
  const { data: busStopsData } = useBusStops();

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
    ];

    // Function to check if a stop is a priority stop
    const isPriorityStop = (stop: BusStop) => {
      // Use exact match for ShortName to avoid "UHall" matching "Opp UHall"
      const isMatch = priorityStops.some((priority) =>
        stop.ShortName === priority ||
        stop.ShortName.trim() === priority
      );
      if (isMatch) {
        console.log('Priority stop found:', stop.ShortName, stop);
      }
      return isMatch;
    };

    // Function to update marker visibility based on zoom
    const updateMarkersVisibility = () => {
      const zoom = map.getZoom() || 16;
  const showAllStops = zoom >= 1; // Show all stops when zoomed in

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
    };

    busStops.forEach((stop: BusStop) => {
      const isStopPriority = isPriorityStop(stop);
      
      // Create circle marker
      const marker = new google.maps.Marker({
        position: { lat: stop.latitude, lng: stop.longitude },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#274F9C',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 4, // Reduced from 6 to make circles smaller
        },
        title: stop.ShortName, // Use short name for hover tooltip
        zIndex: 600, // Higher than Google Maps pins (500)
        visible: false, // Circles hidden by default when zoomed out
      });

      // Create label marker above the circle
      const label = new google.maps.Marker({
        position: { lat: stop.latitude + 0.0001, lng: stop.longitude },
        map: map,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="30">
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" 
                    fill="#274F9C" text-anchor="middle" stroke="#FFFFFF" stroke-width="3" paint-order="stroke">
                ${stop.ShortName}
              </text>
              <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="600" 
                    fill="#274F9C" text-anchor="middle">
                ${stop.ShortName}
              </text>
            </svg>
          `),
          anchor: new google.maps.Point(100, 15),
        },
        title: stop.ShortName, // Add title to label too for filtering
        zIndex: 601, // Higher than both Google Maps pins (500) and bus stop circles
        visible: isStopPriority, // Initially show only priority stop labels
      });

      circleMarkersRef.current.push(marker);
      labelMarkersRef.current.push(label);
    });

    // Set up zoom change listener
    const zoomListener = map.addListener('zoom_changed', updateMarkersVisibility);

    // Initial visibility update
    updateMarkersVisibility();

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
      circleMarkersRef.current.forEach((marker) => marker.setMap(null));
      labelMarkersRef.current.forEach((marker) => marker.setMap(null));
      circleMarkersRef.current = [];
      labelMarkersRef.current = [];
    };
  }, [mapRef, isMapCreated, showBusStops, busStopsData]);
};

// Hook to render destination marker with Google Maps pin icon
const useDestinationMarker = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapCreated: boolean,
  destination?: { lat: number; lng: number }
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

    // Create new destination marker if destination exists
    if (destination) {
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
  }, [mapRef, isMapCreated, destination]);

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
 * Custom hook to render landmark markers (hospital, MRT, library, bus terminal)
 */
const useLandmarkMarkers = (
  mapRef: React.RefObject<google.maps.Map | null>,
  isMapCreated: boolean
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
  }, [mapRef, isMapCreated]);

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
  onMarkerPress,
  initialRegion = DEFAULT_REGION,
  style,
  showD1Route = false,
  activeRoute = null,
  showLandmarks = true, // Default to true for backward compatibility
  showUserLocation = true, // Default to true for backward compatibility
  showMapControls = true, // Default to true for backward compatibility
  showBusStops = false, // Default to false for backward compatibility
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  
  const { mapRef, isMapCreated } = useGoogleMapsInit(
    mapContainerRef,
    initialRegion,
    !!routePolyline // Don't pan/zoom if we have a route polyline
  );

  // Fetch active buses for the selected route
  const { data: activeBusesData } = useActiveBuses(
    activeRoute as RouteCode,
    !!activeRoute
  );
  const activeBuses = activeBusesData?.ActiveBusResult?.activebus || [];

  // Fetch service descriptions to get actual route colors from API
  const { data: serviceDescriptions } = useServiceDescriptions();

  // Get route color from API or use fallback
  const routeColor = React.useMemo(() => {
    if (!activeRoute) return '#274F9C';

    // Try to get color from API
    const serviceDesc =
      serviceDescriptions?.ServiceDescriptionResult?.ServiceDescription?.find(
        (s) => s.Route === activeRoute
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

    return fallbackColors[activeRoute] || '#274F9C';
  }, [activeRoute, serviceDescriptions]);

  useMapMarkers({ mapRef, origin, destination, waypoints, onMarkerPress });
  useMapPolyline(mapRef, routePolyline);
  useConnectorLines(mapRef, origin, destination, routePolyline); // Draw dotted lines from user to route start and route end to destination
  useNUSCampusHighlight(mapRef, isMapCreated, showD1Route);
  useBusMarkers(mapRef, activeBuses, routeColor);
  useRouteCheckpoints(mapRef, activeRoute, routeColor);
  useLandmarkMarkers(mapRef, isMapCreated && showLandmarks);
  useBusStopMarkers(mapRef, isMapCreated, showBusStops); // Add bus stop markers with labels
  useUserLocationMarker(mapRef, isMapCreated); // Add user location with directional arrow
  useDestinationMarker(mapRef, isMapCreated, destination); // Add destination pin marker
  usePlaceDetailsClick(mapRef, isMapCreated, setSelectedPlaceId); // Handle place clicks

  const handleMapTypeChange = (mapType: google.maps.MapTypeId) => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(mapType);
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
        }}
      />
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
              // TODO: Implement filter logic for map layers
            }}
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