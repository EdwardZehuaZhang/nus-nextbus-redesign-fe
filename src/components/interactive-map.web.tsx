import polyline from '@mapbox/polyline';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LatLng } from '@/api/google-maps';
import { MapTypeSelector } from '@/components/map-type-selector';
import { Env } from '@/lib/env';

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
}

const DEFAULT_REGION = {
  latitude: 1.2976493, // NUS coordinates (exact center)
  longitude: 103.7766916,
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
      console.log('Google Maps already loaded');
      resolve();
      return;
    }

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      console.log('Google Maps script already in DOM, waiting for load...');
      // Script is loading, wait for it
      existingScript.addEventListener('load', () => {
        console.log('Google Maps loaded from existing script');
        resolve();
      });
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load Google Maps'))
      );
      return;
    }

    console.log('Loading Google Maps script...');
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Env.GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;

    script.addEventListener('load', () => {
      console.log('Google Maps script loaded successfully');
      resolve();
    });
    script.addEventListener('error', () => {
      console.error('Failed to load Google Maps script');
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
  return new google.maps.Map(container, {
    center: {
      lat: initialRegion.latitude,
      lng: initialRegion.longitude,
    },
    zoom: 14,
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
        stylers: [{ visibility: 'on' }],
      },
    ],
  });
};

// Custom hooks
const useGoogleMapsInit = (
  mapContainerRef: React.RefObject<HTMLDivElement | null>,
  initialRegion: { latitude: number; longitude: number }
) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isMapCreated, setIsMapCreated] = React.useState(false);

  useEffect(() => {
    console.log('Starting Google Maps initialization...');
    loadGoogleMapsScript()
      .then(() => {
        console.log('Google Maps script loaded, setting isLoaded to true');
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
      console.log('Creating new Google Map instance...');
      try {
        mapRef.current = createMapInstance(
          mapContainerRef.current,
          initialRegion
        );
        console.log('Google Map created successfully!');
        addCoordinateListener(mapRef.current);
        if (mapContainerRef.current) {
          preventContextMenu(mapContainerRef.current);
        }
        setIsMapCreated(true);
      } catch (error) {
        console.error('Error creating map:', error);
      }
    }
  }, [isLoaded, initialRegion, mapContainerRef]);

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

  console.log('✅ Top overlay polygon created with', topPath.length, 'points');

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

  console.log(
    '✅ Bottom overlay polygon created with',
    bottomPolylinePath.length,
    'points'
  );
};

// Helper function to create D1 bus route polyline
const createD1BusRoute = (map: google.maps.Map): google.maps.Polyline => {
  console.log('🚌 Creating D1 bus route...');
  const d1Route = new google.maps.Polyline({
    path: D1_BUS_ROUTE,
    geodesic: true,
    strokeColor: '#C77DE2', // D1 light purple color
    strokeOpacity: 1.0,
    strokeWeight: 4,
  });
  d1Route.setMap(map);
  console.log('✅ D1 bus route created with', D1_BUS_ROUTE.length, 'points');
  return d1Route;
};

// Helper function to create campus border with gray overlay outside
const createCampusBorderPolyline = (
  map: google.maps.Map
): { border: google.maps.Polyline; overlay: google.maps.Polygon | null } => {
  console.log('🎨 Creating NUS campus border...');

  const campusBorder = new google.maps.Polyline({
    path: NUS_CAMPUS_BOUNDARY,
    geodesic: true,
    strokeColor: '#808080',
    strokeOpacity: 1.0,
    strokeWeight: 3,
  });
  campusBorder.setMap(map);

  createOverlayPolygons(map);

  console.log('✅ Campus border and split overlays created');
  return { border: campusBorder, overlay: null };
};

// Hook to add NUS campus border and bus routes
const useNUSCampusHighlight = (
  mapRef: React.MutableRefObject<google.maps.Map | null>,
  isMapLoaded: boolean,
  showD1Route: boolean = false
) => {
  const testPolylineRef = useRef<google.maps.Polyline | null>(null);
  const campusBorderRef = useRef<google.maps.Polyline | null>(null);
  const campusOverlayRef = useRef<google.maps.Polygon | null>(null);
  const d1RouteRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    const map = mapRef.current;

    console.log('🗺️ Polyline Hook - State:', {
      hasMap: !!map,
      isMapLoaded,
      hasGoogle: !!(typeof window !== 'undefined' && window.google),
      testPolylineExists: !!testPolylineRef.current,
      campusBorderExists: !!campusBorderRef.current,
      campusOverlayExists: !!campusOverlayRef.current,
      d1RouteExists: !!d1RouteRef.current,
      showD1Route,
    });

    if (
      !map ||
      !isMapLoaded ||
      typeof window === 'undefined' ||
      !window.google
    ) {
      console.log('⏸️ Not ready to create polyline');
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
      console.log('✅ D1 route shown');
    } else if (!showD1Route && d1RouteRef.current) {
      // Hide D1 route
      d1RouteRef.current.setMap(null);
      d1RouteRef.current = null;
      console.log('❌ D1 route hidden');
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

  if (destination) {
    const marker = createMarker({
      position: { lat: destination.lat, lng: destination.lng },
      map,
      title: 'Destination',
      color: '#D32F2F',
      scale: 10,
      onClick: () => onMarkerPress?.('destination'),
    });
    markers.push(marker);
    bounds.extend(marker.getPosition()!);
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
        strokeWeight: 4,
        map: mapRef.current,
      });
    }
  }, [routePolyline, mapRef]);
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { mapRef, isMapCreated } = useGoogleMapsInit(
    mapContainerRef,
    initialRegion
  );

  useMapMarkers({ mapRef, origin, destination, waypoints, onMarkerPress });
  useMapPolyline(mapRef, routePolyline);
  useNUSCampusHighlight(mapRef, isMapCreated, showD1Route);

  const handleMapTypeChange = (mapType: google.maps.MapTypeId) => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(mapType);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {!isMapCreated && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EAF6',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8EAF6',
  },
  loadingText: {
    fontSize: 16,
    color: '#274F9C',
    fontWeight: '500',
  },
});
