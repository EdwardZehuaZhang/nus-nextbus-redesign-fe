import polyline from '@mapbox/polyline';
import { BookOpen, Bus, FirstAid, Subway } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, {
  Marker,
  type MarkerPressEvent,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import type { RouteCode } from '@/api/bus';
import { useBusStops } from '@/api/bus';
// Removed getRouteColor import; using explicit mapping to match web
import type { LatLng } from '@/api/google-maps';
import { useLocation } from '@/lib/hooks/use-location';
import { getTransitLineColor } from '@/lib/transit-colors';
import { getPlaceDetails } from '@/api/google-maps/places';
import { NUS_LANDMARKS } from '@/components/landmark-marker-icons';
import routeCheckpointsData from '@/data/route-checkpoints.json';
import {
  BLUE_AREA_BOUNDARY,
  CAPT_BOUNDARY,
  CDE_AREA_BOUNDARY,
  COMBIZ_AREA_BOUNDARY,
  type Coordinate,
  DARK_BLUE_AREA_BOUNDARY,
  DARK_ORANGE_AREA_BOUNDARY,
  EUSOFF_HALL_BOUNDARY,
  FASS_AREA_BOUNDARY,
  HELIX_HOUSE_BOUNDARY,
  KENT_RIDGE_HALL_BOUNDARY,
  KING_EDWARD_VII_HALL_BOUNDARY,
  LAW_AREA_BOUNDARY,
  LIGHTHOUSE_BOUNDARY,
  NUS_CAMPUS_BOUNDARY,
  ORANGE_AREA_BOUNDARY,
  PGPR_BOUNDARY,
  PIONEER_HOUSE_BOUNDARY,
  RAFFLES_HALL_BOUNDARY,
  RC4_BOUNDARY,
  RVRC_BOUNDARY,
  SHEARES_HALL_BOUNDARY,
  TEMASEK_HALL_BOUNDARY,
  TEMBUSU_COLLEGE_BOUNDARY,
  VALOUR_HOUSE_BOUNDARY,
  YELLOW_AREA_BOUNDARY,
} from '@/lib/map-boundaries';

// Helper to convert hex colors to rgba for iOS Google Maps reliability
const hexToRgba = (hex: string, alpha = 1): string => {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface InteractiveMapProps {
  origin?: LatLng;
  destination?: LatLng;
  waypoints?: LatLng[];
  routePolyline?: string;
  routeSteps?: any[];
  internalRoutePolylines?: {
    walkToStop: { lat: number; lng: number }[];
    busSegment: { lat: number; lng: number }[];
    walkFromStop: { lat: number; lng: number }[];
    busRouteColor?: string;
  };
  onMarkerPress?: (
    type: 'origin' | 'destination' | 'waypoint',
    index?: number
  ) => void;
  initialRegion?: Region;
  style?: any;
  mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain';
  onMapTypeChangeReady?: (
    handler: (mapType: 'standard' | 'satellite' | 'hybrid' | 'terrain') => void
  ) => void;
  showD1Route?: boolean;
  activeRoute?: RouteCode | null;
  onActiveRouteChange?: (route: RouteCode | null) => void;
  showBusStops?: boolean;
  showLandmarks?: boolean;
  showMapControls?: boolean;
  visibleBusStops?: string[];
  mapFilters?: Record<string, boolean>;
  onMapFiltersChange?: (filters: Record<string, boolean>) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 1.289, // Moved further down (south)
  longitude: 103.777, // Adjusted slightly right (east)
  latitudeDelta: 0.02, // Zoom level 14 - zoomed out to see full campus
  longitudeDelta: 0.02,
};

// Mobile zoom offset to align with web zoom levels
// Mobile zoom 14 (default latitudeDelta 0.02) should behave like web zoom 16
// This offset makes mobile zoom calculations match web behavior
const MOBILE_ZOOM_OFFSET = 2;

const getLandmarkColor = (type: string) => {
  switch (type) {
    case 'hospital':
      return '#D32F2F'; // Red
    case 'mrt':
      return '#274F9C'; // Blue
    case 'library':
      return '#FF8C00'; // Orange
    case 'bus-terminal':
      return '#00B050'; // Green
    default:
      return '#274F9C';
  }
};

/**
 * Native-style User Location Marker with heading arrow
 * Mimics the iOS blue dot with direction indicator
 */
const UserLocationMarker: React.FC<{
  heading?: number | null;
}> = ({ heading }) => {
  const size = 40;
  const hasHeading = heading !== null && heading !== undefined && !isNaN(heading);
  const rotation = hasHeading ? heading : 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer pulsing circle (light blue) */}
        <Circle 
          cx={size / 2} 
          cy={size / 2} 
          r={size / 2 - 2} 
          fill="#4A90E2" 
          opacity="0.3"
        />
        
        {/* Inner blue dot */}
        <Circle 
          cx={size / 2} 
          cy={size / 2} 
          r={9} 
          fill="#007AFF" 
          stroke="white" 
          strokeWidth="2.5"
        />
        
        {/* Direction arrow (only if heading available) */}
        {hasHeading && (
          <G
            origin={`${size / 2}, ${size / 2}`}
            rotation={rotation}
          >
            <Path
              d={`M ${size / 2} 6 L ${size / 2 + 4} ${size / 2 - 2} L ${size / 2} ${size / 2 - 6} L ${size / 2 - 4} ${size / 2 - 2} Z`}
              fill="white"
            />
          </G>
        )}
      </Svg>
    </View>
  );
};

/**
 * Pin marker component with icon inside - matches web version exactly
 */
const PinMarker: React.FC<{
  type: 'hospital' | 'mrt' | 'library' | 'bus-terminal';
  scale: number;
}> = ({ type, scale }) => {
  const color = getLandmarkColor(type);
  const width = 40 * scale;
  const height = 52 * scale;
  const iconSize = 22 * scale;
  const iconOffset = 9 * scale;

  // Select the appropriate icon component
  const IconComponent = {
    hospital: FirstAid,
    mrt: Subway,
    library: BookOpen,
    'bus-terminal': Bus,
  }[type];

  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <Svg width={width} height={height} viewBox="0 0 40 52">
        {/* Pin shape */}
        <Path
          d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z"
          fill={color}
        />
        {/* Icon inside the pin */}
        <G transform={`translate(${iconOffset}, ${iconOffset})`}>
          <IconComponent size={iconSize} color="white" weight="fill" />
        </G>
      </Svg>
    </View>
  );
};

/**
 * Calculate scale for landmark markers based on zoom level
 * Matches web version behavior (zoom levels now aligned)
 */
const getLandmarkScale = (zoom: number): number => {
  if (zoom <= 14) return 0.7;
  else if (zoom <= 15) return 0.85;
  else if (zoom === 16) return 1;
  else if (zoom === 17) return 1.15;
  else if (zoom === 18) return 1.3;
  else return 1.5;
};

// Debug logging for route rendering
const DEBUG_ROUTES = false;
const logRoute = (message: string, data?: any) => {
  if (DEBUG_ROUTES) {
    console.log(`[BUS_ROUTE] ${message}`, data || '');
  }
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  origin,
  destination,
  waypoints = [],
  routePolyline,
  onMarkerPress,
  initialRegion = DEFAULT_REGION,
  style,
  mapType: externalMapType,
  onMapTypeChangeReady,
  showD1Route: _showD1Route = false,
  activeRoute: _activeRoute = null,
  onActiveRouteChange: _onActiveRouteChange,
  showBusStops = false,
  showLandmarks = true,
  showMapControls: _showMapControls = true,
  visibleBusStops,
  mapFilters = {},
  onMapFiltersChange: _onMapFiltersChange,
  routeSteps,
  internalRoutePolylines,
}) => {
  const mapRef = useRef<MapView>(null);
  const [internalMapType, setInternalMapType] = useState<
    'standard' | 'satellite' | 'hybrid' | 'terrain'
  >('standard');
  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);
  const [mapReady, setMapReady] = useState(false);
  const hasSetInitialRegion = useRef(false);
  const isInitializing = useRef(true);
  const hasFitToCoordinates = useRef(false); // Guard to prevent repeated fitToCoordinates calls
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address?: string;
    coordinates: { latitude: number; longitude: number };
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
  } | null>(null);

  const mapType = externalMapType ?? internalMapType;

  // Get user's current location from hook
  const { coords: userLocation } = useLocation();

  // Debug: Log user location
  useEffect(() => {
    console.log('[USER_LOCATION] Location update:', {
      hasLocation: !!userLocation,
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      heading: userLocation?.heading,
      accuracy: userLocation?.accuracy,
    });
  }, [userLocation]);

  // Initialize currentRegion with initialRegion when it changes
  useEffect(() => {
    setCurrentRegion(initialRegion);
  }, [initialRegion]);

  // Calculate Google Maps zoom level from latitudeDelta
  // Formula: zoom = ln(360 / latitudeDelta) / ln(2)
  // This matches Google Maps zoom levels (0 = world, 21 = building)
  // Add MOBILE_ZOOM_OFFSET to align with web zoom behavior
  const getZoomLevel = (latitudeDelta: number): number => {
    const zoom = Math.log2(360 / latitudeDelta);
    return Math.round(zoom) + MOBILE_ZOOM_OFFSET;
  };

  const currentZoom = getZoomLevel(currentRegion.latitudeDelta);

  // Generate custom map style based on zoom level to hide/show POI and road labels
  const customMapStyle = React.useMemo(() => {
    const showDetails = currentZoom >= 16;

    if (showDetails) {
      // Show all details at zoom 16+
      return [];
    }

    // Hide POI labels and road labels when zoomed out
    return [
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
        featureType: 'road',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ];
  }, [currentZoom]);

  // Force map to use correct initial region after it's ready - only once
  useEffect(() => {
    console.log('[Map] mapReady effect triggered:', {
      mapReady,
      hasOrigin: !!origin,
      hasDestination: !!destination,
      waypointsCount: waypoints.length,
      hasSetInitialRegion: hasSetInitialRegion.current,
    });
    if (
      mapReady &&
      mapRef.current &&
      !origin &&
      !destination &&
      waypoints.length === 0 &&
      !hasSetInitialRegion.current
    ) {
      console.log('[Map] Forcing region to:', initialRegion);
      // Mark as set IMMEDIATELY to prevent double-execution
      hasSetInitialRegion.current = true;
      isInitializing.current = true;

      // Only set region if there's no route being displayed
      setTimeout(() => {
        mapRef.current?.animateToRegion(initialRegion, 100);
        // After setting initial region, allow region updates
        setTimeout(() => {
          console.log(
            '[Map] Initialization complete, enabling region tracking'
          );
          isInitializing.current = false;
        }, 500);
      }, 100);
    }
  }, [mapReady, initialRegion, origin, destination, waypoints.length]);

  // Handle region changes
  const handleRegionChange = (region: Region) => {
    setCurrentRegion(region);
  };

  // Removed unused nearest-location helper to reduce component size and re-render cost

  // Map tap handler: show place details popup when tapping on map
  // Debug: Log the initialRegion being used
  useEffect(() => {
    console.log('[Map] initialRegion:', initialRegion);
    console.log(
      '[Map] Expected zoom level:',
      Math.log2(360 / initialRegion.latitudeDelta).toFixed(2)
    );
  }, [initialRegion]);

  // Fetch bus stops data
  const { data: busStopsData } = useBusStops();

  // Log zoom level changes for debugging
  useEffect(() => {
    console.log(
      `[Map Zoom] latitudeDelta: ${currentRegion.latitudeDelta.toFixed(6)}, zoom level: ${currentZoom}, coords: ${currentRegion.latitude.toFixed(6)}, ${currentRegion.longitude.toFixed(6)}`
    );
  }, [
    currentRegion.latitudeDelta,
    currentZoom,
    currentRegion.latitude,
    currentRegion.longitude,
  ]);

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

  // Helper function to determine if label should be below (south) based on nearby stops
  const shouldLabelBelow = (stop: any, allStops: any[]): boolean => {
    // Find nearby stops (within ~50 meters / 0.0005 degrees)
    const nearbyStops = allStops.filter((otherStop: any) => {
      if (otherStop.name === stop.name) return false;
      const latDiff = Math.abs(otherStop.latitude - stop.latitude);
      const lngDiff = Math.abs(otherStop.longitude - stop.longitude);
      return latDiff < 0.0005 && lngDiff < 0.0005;
    });

    // If there are nearby stops, check if this stop is more southern (lower latitude)
    if (nearbyStops.length > 0) {
      const hasStopToNorth = nearbyStops.some(
        (otherStop: any) => otherStop.latitude > stop.latitude
      );
      return hasStopToNorth; // Label below if this stop is more south
    }

    return false; // Default to label above
  };

  // Helper function to check if a stop should be shown at current zoom
  const shouldShowStop = (stopName: string): boolean => {
    // If visibleBusStops is provided, use that filter
    if (visibleBusStops && visibleBusStops.length > 0) {
      return visibleBusStops.includes(stopName);
    }

    // Show based on zoom level (now aligned with web):
    // - Zoom 17+: Show all stops
    // - Zoom 15-16: Show priority stops
    // - Zoom 14 and below: Show only zoom14 priority stops (minimal set)
    if (currentZoom >= 17) {
      return true; // Show all stops at zoom 17 and above
    } else if (currentZoom >= 15) {
      // Show priority stops at zoom 15-16
      return priorityStops.some((p) => stopName === p || stopName.trim() === p);
    } else {
      // Show only minimal priority stops at zoom 14 and below
      return zoom14PriorityStops.some(
        (p) => stopName === p || stopName.trim() === p
      );
    }
  };

  useEffect(() => {
    if (onMapTypeChangeReady) {
      onMapTypeChangeReady((newMapType) => {
        setInternalMapType(newMapType);
      });
    }
  }, [onMapTypeChangeReady]);

  const routeCoordinates = routePolyline
    ? polyline
        .decode(routePolyline)
        .map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
    : [];

  // Build segment polylines for transit routes (Google steps) or internal routes
  const transitSegments = React.useMemo(() => {
    if (internalRoutePolylines) {
      const toStop = (internalRoutePolylines.walkToStop || []).map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      }));
      const busSeg = (internalRoutePolylines.busSegment || []).map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      }));
      const fromStop = (internalRoutePolylines.walkFromStop || []).map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      }));

      const walkColor = '#274F9C';
      const busColor = internalRoutePolylines.busRouteColor || '#274F9C';

      return [
        toStop.length > 1
          ? {
              key: 'walk-to-stop',
              coordinates: toStop,
              strokeColor: hexToRgba(walkColor, 0.9),
              strokeColorArray: toStop.map(() => hexToRgba(walkColor, 0.9)),
              strokeWidth: 4,
              lineDashPattern: [6, 6],
              zIndex: 30,
            }
          : null,
        busSeg.length > 1
          ? {
              key: 'bus-segment',
              coordinates: busSeg,
              strokeColor: hexToRgba(busColor, 1),
              strokeColorArray: busSeg.map(() => hexToRgba(busColor, 1)),
              strokeWidth: 5,
              zIndex: 35,
            }
          : null,
        fromStop.length > 1
          ? {
              key: 'walk-from-stop',
              coordinates: fromStop,
              strokeColor: hexToRgba(walkColor, 0.9),
              strokeColorArray: fromStop.map(() => hexToRgba(walkColor, 0.9)),
              strokeWidth: 4,
              lineDashPattern: [6, 6],
              zIndex: 30,
            }
          : null,
      ].filter(Boolean) as any[];
    }

    if (routeSteps && routeSteps.length > 0) {
      return routeSteps
        .map((step: any, idx: number) => {
          if (!step?.polyline?.encodedPolyline) return null;
          const coordinates = polyline
            .decode(step.polyline.encodedPolyline)
            .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

          let strokeColor = '#9CA3AF';
          let lineDashPattern: number[] | undefined;
          let zIndex = 20;

          if (step.travelMode === 'TRANSIT' && step.transitDetails) {
            const lineName =
              step.transitDetails?.transitLine?.nameShort ||
              step.transitDetails?.transitLine?.name;
            const apiColor = step.transitDetails?.transitLine?.color;
            if (apiColor) {
              strokeColor = apiColor.startsWith('#') ? apiColor : `#${apiColor}`;
            } else {
              strokeColor = getTransitLineColor(lineName);
            }
            zIndex = 25;
          } else if (step.travelMode === 'WALK') {
            strokeColor = '#274F9C';
            lineDashPattern = [6, 6];
            zIndex = 15;
          }

          // Convert hex to RGBA for proper rendering on React Native Maps
          const rgbaColor = hexToRgba(strokeColor, 1);

          return {
            key: `step-${idx}`,
            coordinates,
            strokeColor: rgbaColor,
            strokeColorArray: coordinates.map(() => rgbaColor),
            strokeWidth: 4,
            lineDashPattern,
            zIndex,
          };
        })
        .filter(Boolean) as any[];
    }

    return [];
  }, [internalRoutePolylines, routeSteps]);

  // Static route colors (no API dependency)
  const routeColors: Record<string, string> = React.useMemo(
    () => ({
      A1: '#BE1E2D',
      A2: '#E3CE0B',
      D1: '#C77DE2',
      D2: '#6F1B6F',
      BTC: '#EF8136',
      L: '#BFBFBF',
      E: '#00B050',
      K: '#345A9B',
    }),
    []
  );

  // Derive active bus route codes from mapFilters (e.g. keys: bus-route-a1)
  const activeBusRouteCodes = React.useMemo(() => {
    const codes = Object.entries(mapFilters)
      .filter(([key, value]) => key.startsWith('bus-route-') && !!value)
      .map(([key]) => key.replace('bus-route-', '').toUpperCase());
    logRoute('Active bus route codes from filters', { codes });
    return codes;
  }, [mapFilters]);

  // Only render ACTIVE route polylines - prevents AIRGoogleMap insertReactSubview crash
  // Pre-render ALL bus routes once with stable coordinate arrays (like academic/residences)
  // Visibility is controlled by strokeColor, never by mounting/unmounting children
  const allRoutesPrecomputed = React.useMemo(() => {
    const codes = Object.keys(routeColors);
    const pre = codes.map((routeCode) => {
      const checkpoints = (routeCheckpointsData as Record<string, any>)[routeCode] || [];
      const coordinates = checkpoints.map((pt: any) => ({
        latitude: pt.latitude,
        longitude: pt.longitude,
      }));
      logRoute(`Precomputed ${routeCode} coordinates`, { count: coordinates.length });
      return { routeCode, coordinates };
    });
    return pre;
  }, [routeColors]);

  // Precompute route -> stop membership map (near checkpoint) on first load
  const routeStopMembershipRef = useRef<Map<string, Set<string>>>(new Map());
  useEffect(() => {
    const allStops = busStopsData?.BusStopsResult?.busstops;
    if (!allStops) return;
    
    // Only compute for routes we haven't seen yet
    const LAT_THRESHOLD = 0.0005;
    const LNG_THRESHOLD = 0.0005;
    Object.keys(routeColors).forEach((routeCode) => {
      if (routeStopMembershipRef.current.has(routeCode)) return;

      const checkpoints =
        (routeCheckpointsData as Record<string, any>)[routeCode] || [];
      const set = new Set<string>();
      allStops.forEach((stop: any) => {
        const match = checkpoints.some(
          (pt: any) =>
            Math.abs(pt.latitude - stop.latitude) < LAT_THRESHOLD &&
            Math.abs(pt.longitude - stop.longitude) < LNG_THRESHOLD
        );
        if (match) set.add(stop.name);
      });
      routeStopMembershipRef.current.set(routeCode, set);
      logRoute(`Computed stops for route ${routeCode}`, {
        stopCount: set.size,
      });
    });
  }, [busStopsData, routeColors]);

  const isStopVisibleForActiveRoutes = React.useCallback(
    (stop: any): boolean => {
      if (activeBusRouteCodes.length === 0) return true;
      return activeBusRouteCodes.some((code) =>
        routeStopMembershipRef.current.get(code)?.has(stop.name)
      );
    },
    [activeBusRouteCodes]
  );

  // Always render ALL bus stops; control visibility via opacity to keep children count/order stable
  const allBusStops: any[] = React.useMemo(() => {
    return busStopsData?.BusStopsResult?.busstops || [];
  }, [busStopsData]);

  // Extract individual filter values to ensure proper re-rendering
  const filterImportant = mapFilters?.important ?? false;
  const filterBusStops = mapFilters?.['bus-stops'] ?? false;
  const filterAcademic = mapFilters?.academic ?? false;
  const filterResidences = mapFilters?.residences ?? false;

  console.log('[Map] Filter values:', {
    important: filterImportant,
    busStops: filterBusStops,
    academic: filterAcademic,
    residences: filterResidences,
  });

  // Determine what to show based on filters
  const shouldShowLandmarks = showLandmarks && filterImportant;
  const shouldShowBusStops = showBusStops || filterBusStops;
  const shouldShowAcademic = filterAcademic;
  const shouldShowResidences = filterResidences;

  console.log('[Map] Display states:', {
    landmarks: shouldShowLandmarks,
    busStops: shouldShowBusStops,
    academic: shouldShowAcademic,
    residences: shouldShowResidences,
  });

  // Fit map to show all markers ONLY on initial route load (not on every render)
  useEffect(() => {
    // Only fit to coordinates if we actually have markers to show AND haven't fit yet
    if (mapRef.current && (origin || destination || waypoints.length > 0) && !hasFitToCoordinates.current) {
      const coordinates = [
        origin && { latitude: origin.lat, longitude: origin.lng },
        destination && {
          latitude: destination.lat,
          longitude: destination.lng,
        },
        ...waypoints.map((wp) => ({ latitude: wp.lat, longitude: wp.lng })),
      ].filter(Boolean) as Coordinate[];

      if (coordinates.length > 0) {
        hasFitToCoordinates.current = true; // Mark that we've fitted coordinates
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }, 100);
      }
    }
  }, [origin, destination, waypoints]);

  const handleOriginPress = (e: MarkerPressEvent) => {
    e.stopPropagation();
    onMarkerPress?.('origin');
  };

  const handleDestinationPress = (e: MarkerPressEvent) => {
    e.stopPropagation();
    onMarkerPress?.('destination');
  };

  const handleWaypointPress = (index: number) => (e: MarkerPressEvent) => {
    e.stopPropagation();
    onMarkerPress?.('waypoint', index);
  };

  const handleLandmarkPress =
    (landmark: (typeof NUS_LANDMARKS)[0]) => async (e: MarkerPressEvent) => {
      e.stopPropagation();

      // If we have a Google Place ID, fetch full details (matching web behavior)
      if (landmark.placeId) {
        try {
          const data = await getPlaceDetails(landmark.placeId);
          if (data.result) {
            const place: any = data.result;

            // Build photo URL if available
            let photoUrl: string | undefined;
            if (place.photos && place.photos.length > 0) {
              const photoReference = place.photos[0].photo_reference;
              const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
              photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
            }

            setSelectedPlace({
              name: place.name || landmark.name,
              address: place.formatted_address || landmark.address,
              coordinates: {
                latitude:
                  place.geometry?.location?.lat || landmark.coordinates.lat,
                longitude:
                  place.geometry?.location?.lng || landmark.coordinates.lng,
              },
              type: 'google-place',
              photo: photoUrl,
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
              priceLevel: place.price_level,
              openNow: place.opening_hours?.open_now,
            });
            return;
          }
        } catch (err) {
          console.error(
            '[Landmark] Failed to fetch place details for',
            landmark.name,
            err
          );
        }
      }

      // Fallback: just show basic landmark info
      setSelectedPlace({
        name: landmark.name,
        address: landmark.address,
        coordinates: {
          latitude: landmark.coordinates.lat,
          longitude: landmark.coordinates.lng,
        },
        type: landmark.type,
      });
    };

  const handleBusStopPress = (stop: any) => (e: MarkerPressEvent) => {
    e.stopPropagation();
    const stopName = stop.ShortName || stop.caption || stop.name;
    setSelectedPlace({
      name: stopName,
      address: undefined,
      coordinates: { latitude: stop.latitude, longitude: stop.longitude },
      type: 'bus-stop',
    });
  };

  // Handle Google Places POI clicks
  const handlePoiClick = async (event: any) => {
    const { placeId, name, coordinate } = event.nativeEvent;
    console.log('[Map] POI clicked:', { placeId, name, coordinate });

    if (!placeId) return;

    try {
      // Fetch place details from backend using the API helper
      const data = await getPlaceDetails(placeId);

      if (data.result) {
        const place = data.result as any;

        // Get photo URL if available - use Google's photo service directly
        let photoUrl: string | undefined;
        if (place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;
          const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
          // Use Google's Place Photo API directly
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
        }

        setSelectedPlace({
          name: place.name || name,
          address: place.formatted_address || place.vicinity,
          coordinates: {
            latitude: place.geometry?.location?.lat || coordinate.latitude,
            longitude: place.geometry?.location?.lng || coordinate.longitude,
          },
          type: 'google-place',
          photo: photoUrl,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          priceLevel: place.price_level,
          openNow: place.opening_hours?.open_now,
        });
      } else {
        // Fallback if API fails
        setSelectedPlace({
          name: name,
          address: undefined,
          coordinates: coordinate,
          type: 'google-place',
        });
      }
    } catch (error) {
      console.error('[Map] Error fetching place details:', error);
      // Fallback on error
      setSelectedPlace({
        name: name,
        address: undefined,
        coordinates: coordinate,
        type: 'google-place',
      });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={Platform.OS === 'android'}
        userLocationAnnotationTitle="My Location"
        userLocationCalloutEnabled={false}
        userLocationUpdateInterval={1000}
        showsMyLocationButton
        showsCompass
        showsScale
        mapType={mapType}
        onRegionChangeComplete={handleRegionChange}
        onMapReady={() => setMapReady(true)}
        onPoiClick={handlePoiClick}
        customMapStyle={customMapStyle}
        showsIndoors={currentZoom >= 17}
        showsTraffic={false}
        loadingEnabled={true}
        loadingIndicatorColor="#274F9C"
        loadingBackgroundColor="#ffffff"
      >
        {/* Campus Boundary - always shown */}
        <Polygon
          coordinates={NUS_CAMPUS_BOUNDARY}
          strokeColor="#274F9C"
          strokeWidth={2}
          fillColor="transparent"
        />

        {/* Gray overlay outside campus - creates dimming effect */}
        <Polygon
          coordinates={[
            // Large outer boundary covering the entire visible map area
            { latitude: 1.35, longitude: 103.65 },
            { latitude: 1.35, longitude: 103.9 },
            { latitude: 1.23, longitude: 103.9 },
            { latitude: 1.23, longitude: 103.65 },
            { latitude: 1.35, longitude: 103.65 },
          ]}
          holes={[
            // Campus boundary as a hole - this area stays clear
            NUS_CAMPUS_BOUNDARY,
          ]}
          strokeWidth={0}
          strokeColor="transparent"
          fillColor="rgba(0, 0, 0, 0.4)"
          tappable={false}
        />

        {/* Academic Area Overlays - Always rendered, visibility controlled */}
        <Polygon
          key="academic-orange"
          coordinates={ORANGE_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#FF0000' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(255, 0, 0, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-blue"
          coordinates={BLUE_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#1E90FF' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(30, 144, 255, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-darkblue"
          coordinates={DARK_BLUE_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#00008B' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(0, 0, 139, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-yellow"
          coordinates={YELLOW_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#FA9E0D' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(250, 158, 13, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-darkorange"
          coordinates={DARK_ORANGE_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#800080' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(128, 0, 128, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-cde"
          coordinates={CDE_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#D7AE63' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(215, 174, 99, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-fass"
          coordinates={FASS_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#006400' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(0, 100, 0, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-combiz"
          coordinates={COMBIZ_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#8B0000' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(139, 0, 0, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        <Polygon
          key="academic-law"
          coordinates={LAW_AREA_BOUNDARY}
          strokeColor={shouldShowAcademic ? '#FFFFFF' : 'transparent'}
          strokeWidth={shouldShowAcademic ? 2 : 0}
          fillColor={
            shouldShowAcademic ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
          }
          tappable={shouldShowAcademic}
        />
        {/* Residence Overlays - Always rendered, visibility controlled */}
        <Polygon
          key="residence-pgpr"
          coordinates={PGPR_BOUNDARY}
          strokeColor={shouldShowResidences ? '#136207' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(19, 98, 7, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-lighthouse"
          coordinates={LIGHTHOUSE_BOUNDARY}
          strokeColor={shouldShowResidences ? '#DDB42A' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(221, 180, 42, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-pioneer"
          coordinates={PIONEER_HOUSE_BOUNDARY}
          strokeColor={shouldShowResidences ? '#2F3487' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(47, 52, 135, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-helix"
          coordinates={HELIX_HOUSE_BOUNDARY}
          strokeColor={shouldShowResidences ? '#A51C38' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(165, 28, 56, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-sheares"
          coordinates={SHEARES_HALL_BOUNDARY}
          strokeColor={shouldShowResidences ? '#CC5500' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(204, 85, 0, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-kentridge"
          coordinates={KENT_RIDGE_HALL_BOUNDARY}
          strokeColor={shouldShowResidences ? '#1E3A8A' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(30, 58, 138, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-temasek"
          coordinates={TEMASEK_HALL_BOUNDARY}
          strokeColor={shouldShowResidences ? '#4A5568' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(74, 85, 104, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-eusoff"
          coordinates={EUSOFF_HALL_BOUNDARY}
          strokeColor={shouldShowResidences ? '#B8860B' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(184, 134, 11, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-kingedward"
          coordinates={KING_EDWARD_VII_HALL_BOUNDARY}
          strokeColor={shouldShowResidences ? '#8B0000' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(139, 0, 0, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-raffles"
          coordinates={RAFFLES_HALL_BOUNDARY}
          strokeColor={shouldShowResidences ? '#2D5016' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(45, 80, 22, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-capt"
          coordinates={CAPT_BOUNDARY}
          strokeColor={shouldShowResidences ? '#7B123A' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(123, 18, 58, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-rc4"
          coordinates={RC4_BOUNDARY}
          strokeColor={shouldShowResidences ? '#219181' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(33, 145, 129, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-rvrc"
          coordinates={RVRC_BOUNDARY}
          strokeColor={shouldShowResidences ? '#48256A' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(72, 37, 106, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-tembusu"
          coordinates={TEMBUSU_COLLEGE_BOUNDARY}
          strokeColor={shouldShowResidences ? '#02522F' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(2, 82, 47, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        <Polygon
          key="residence-valour"
          coordinates={VALOUR_HOUSE_BOUNDARY}
          strokeColor={shouldShowResidences ? '#340860' : 'transparent'}
          strokeWidth={shouldShowResidences ? 1 : 0}
          fillColor={
            shouldShowResidences ? 'rgba(52, 8, 96, 0.2)' : 'transparent'
          }
          tappable={shouldShowResidences}
        />
        {/* Landmark Markers - Pre-rendered, visibility controlled by opacity */}
        {NUS_LANDMARKS.map((landmark, index) => {
          const scale = getLandmarkScale(currentZoom);

          return (
            <Marker
              key={`landmark-${index}`}
              coordinate={{
                latitude: landmark.coordinates.lat,
                longitude: landmark.coordinates.lng,
              }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              opacity={shouldShowLandmarks ? 1 : 0}
              onPress={handleLandmarkPress(landmark)}
            >
              <PinMarker type={landmark.type} scale={scale} />
            </Marker>
          );
        })}
        {/* Bus Stop Circle Markers - Blue dots, visible only at zoom 17+ (filtered by route if active) */}
        {allBusStops.map((stop: any) => {
          const showCircle = shouldShowBusStops && currentZoom >= 17;
          const visibleByRoute = isStopVisibleForActiveRoutes(stop);
          const opacity = showCircle && visibleByRoute ? 1 : 0;
          // Choose circle color: if multiple routes active, color by first matching route membership
          let circleColor = '#274F9C';
          if (visibleByRoute) {
            // Try primary active route first
            if (
              _activeRoute &&
              routeStopMembershipRef.current
                .get(_activeRoute)
                ?.has(stop.name)
            ) {
              circleColor = routeColors[_activeRoute] || circleColor;
            } else {
              // Fallback: first filtered active route that includes this stop
              const matchCode = activeBusRouteCodes.find((code) =>
                routeStopMembershipRef.current.get(code)?.has(stop.name)
              );
              if (matchCode)
                circleColor = routeColors[matchCode] || circleColor;
            }
          }

          return (
            <Marker
              key={`bus-stop-circle-${stop.name}`}
              coordinate={{
                latitude: stop.latitude,
                longitude: stop.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              opacity={opacity}
              onPress={handleBusStopPress(stop)}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: circleColor,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}
              />
            </Marker>
          );
        })}
        {/* Bus Stop Label Markers - Text labels with dynamic positioning (filtered by route if active) */}
        {allBusStops.map((stop: any) => {
          const stopName = stop.ShortName || stop.caption || stop.name;
          const allStops = allBusStops;
          const labelBelow = shouldLabelBelow(stop, allStops);
          const labelOffsetLat = labelBelow ? -0.0001 : 0.0001;

          // Determine if label should be visible based on zoom and filters
          const visibleByRoute = isStopVisibleForActiveRoutes(stop);
          const isLabelVisible =
            shouldShowBusStops && shouldShowStop(stopName) && visibleByRoute;
          // Choose label color: per-route membership (same logic as circle)
          let labelColor = '#274F9C';
          if (visibleByRoute) {
            if (
              _activeRoute &&
              routeStopMembershipRef.current
                .get(_activeRoute)
                ?.has(stop.name)
            ) {
              labelColor = routeColors[_activeRoute] || labelColor;
            } else {
              const matchCode = activeBusRouteCodes.find((code) =>
                routeStopMembershipRef.current.get(code)?.has(stop.name)
              );
              if (matchCode) labelColor = routeColors[matchCode] || labelColor;
            }
          }

          // Calculate font size based on zoom level (matching web version)
          let fontSize = 12;
          let strokeWidth = 3;
          if (currentZoom >= 17) {
            fontSize = Math.min(18, 12 + (currentZoom - 16) * 2);
            strokeWidth = Math.min(4, 3 + (currentZoom - 16) * 0.3);
          }

          return (
            <Marker
              key={`bus-stop-label-${stop.name}`}
              coordinate={{
                latitude: stop.latitude + labelOffsetLat,
                longitude: stop.longitude,
              }}
              anchor={{ x: 0.5, y: labelBelow ? 0 : 1 }}
              tracksViewChanges={false}
              opacity={isLabelVisible ? 1 : 0}
              onPress={handleBusStopPress(stop)}
            >
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Svg width="200" height="30" viewBox="0 0 200 30">
                  {/* White stroke outline - rendered first (behind) */}
                  <SvgText
                    x="100"
                    y="20"
                    fontSize={fontSize}
                    fontWeight="600"
                    fill="none"
                    textAnchor="middle"
                    stroke="#FFFFFF"
                    strokeWidth={strokeWidth}
                  >
                    {stopName}
                  </SvgText>
                  {/* Route-colored text on top */}
                  <SvgText
                    x="100"
                    y="20"
                    fontSize={fontSize}
                    fontWeight="600"
                    fill={labelColor}
                    textAnchor="middle"
                  >
                    {stopName}
                  </SvgText>
                </Svg>
              </View>
            </Marker>
          );
        })}
        {/* Custom User Location Marker - Shows with heading if available */}
        {userLocation &&
          typeof userLocation.latitude === 'number' &&
          typeof userLocation.longitude === 'number' &&
          !isNaN(userLocation.latitude) &&
          !isNaN(userLocation.longitude) && (
            <Marker
              key="custom-user-location"
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              zIndex={1000}
            >
              <UserLocationMarker heading={userLocation.heading} />
            </Marker>
          )}
        
        {/* Origin Marker */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            pinColor="#274F9C"
            onPress={handleOriginPress}
          />
        )}
        {/* Waypoint Markers */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={`waypoint-${index}`}
            coordinate={{ latitude: waypoint.lat, longitude: waypoint.lng }}
            pinColor="#FF8C00"
            onPress={handleWaypointPress(index)}
          />
        ))}
        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.lat,
              longitude: destination.lng,
            }}
            pinColor="#D32F2F"
            onPress={handleDestinationPress}
          />
        )}
        {/* Transit/Internal Route Segments (colored per segment) */}
        {transitSegments.map((seg) => (
          <Polyline
            key={seg.key}
            coordinates={seg.coordinates}
            strokeColor={seg.strokeColor}
            strokeColors={seg.strokeColorArray}
            strokeWidth={seg.strokeWidth}
            lineCap="round"
            lineJoin="round"
            lineDashPattern={seg.lineDashPattern}
            zIndex={seg.zIndex}
          />
        ))}

        {/* Fallback: single polyline when no segmented steps are available */}
        {transitSegments.length === 0 && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#274F9C"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
        {/* Bus Route Polylines - normal visibility using filters/active route */}
        {allRoutesPrecomputed.map(({ routeCode, coordinates }, idx) => {
          if (coordinates.length === 0) return null;
          const isPrimaryActive = _activeRoute === routeCode;
          const isFilteredActive = activeBusRouteCodes.includes(routeCode);
          // Show only when an active route or filters are set, and this route matches
          const hasAnyRouteActive = !!_activeRoute || activeBusRouteCodes.length > 0;
          const isVisible = hasAnyRouteActive && (isPrimaryActive || isFilteredActive);

          // Use canonical palette but render via RGBA for iOS reliability
          const paletteColor = routeColors[routeCode] || '#000000';
          const rgbaColor = hexToRgba(paletteColor, 1);
          const strokeWidth = isVisible ? (isPrimaryActive ? 5 : 4) : 0;
          const zIndex = 100 + idx;

          logRoute(`Render ${routeCode}`, {
            anyActive: hasAnyRouteActive,
            visible: isVisible,
            coordCount: coordinates.length,
            color: rgbaColor,
            strokeWidth,
          });

          return (
            <Polyline
              key={`bus-route-${routeCode}`}
              coordinates={coordinates}
              strokeColor={rgbaColor}
              strokeColors={coordinates.map(() => rgbaColor)}
              strokeWidth={strokeWidth}
              lineCap="round"
              lineJoin="round"
              geodesic={false}
              zIndex={zIndex}
              tappable={false}
            />
          );
        })}
      </MapView>

      {/* Place Details Popup - positioned absolutely on screen like web version */}
      {selectedPlace && (
        <View style={styles.placePopupContainer}>
          <View style={styles.placeCard}>
            {/* Horizontal layout: Photo LEFT, Content RIGHT (matching web) */}
            <View style={styles.placeHorizontalRow}>
              {/* Left: Photo */}
              {selectedPlace.photo ? (
                <Image
                  source={{ uri: selectedPlace.photo }}
                  style={styles.placePhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placePhotoPlaceholder} />
              )}

              {/* Right: Content */}
              <View style={styles.placeTextContent}>
                {/* Title */}
                <Text style={styles.placeTitle} numberOfLines={2}>
                  {selectedPlace.name}
                </Text>

                {/* Rating row */}
                {selectedPlace.rating && (
                  <View style={styles.placeMetaRow}>
                    <Text style={styles.placeRatingText}>
                      {selectedPlace.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.placeRatingStar}> ★ </Text>
                    {selectedPlace.userRatingsTotal && (
                      <Text style={styles.placeRatingCount}>
                        ({selectedPlace.userRatingsTotal})
                      </Text>
                    )}
                  </View>
                )}

                {/* Type (e.g., Restaurant) + Price */}
                {selectedPlace.type === 'google-place' && (
                  <View style={styles.placeMetaRow}>
                    <Text style={styles.placeTypeText}>Restaurant</Text>
                    {selectedPlace.priceLevel && (
                      <Text style={styles.placeTypePriceText}>
                        {' · '}
                        {selectedPlace.priceLevel === 1
                          ? '$10-20'
                          : selectedPlace.priceLevel === 2
                            ? '$20-30'
                            : selectedPlace.priceLevel === 3
                              ? '$30-50'
                              : '$50+'}
                      </Text>
                    )}
                  </View>
                )}

                {/* Open status with hours */}
                {selectedPlace.openNow !== undefined && (
                  <Text
                    style={[
                      styles.placeOpenText,
                      { color: selectedPlace.openNow ? '#188038' : '#d93025' },
                    ]}
                  >
                    {selectedPlace.openNow ? 'Open' : 'Closed'}
                    <Text style={styles.placeHoursText}> · Closes 9:30 PM</Text>
                  </Text>
                )}
              </View>
            </View>

            {/* Buttons overlaid on the card - positioned absolutely like web */}
            <TouchableOpacity
              style={styles.placeCloseBtn}
              onPress={() => setSelectedPlace(null)}
            >
              <Text style={styles.placeCloseBtnText}>×</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.placeDirectionsBtn}>
              <Svg width={16} height={16} viewBox="0 0 20 20">
                <Path
                  d="M19.375 9.4984C19.3731 9.7625 19.2863 10.019 19.1275 10.23C18.9687 10.441 18.7462 10.5954 18.4929 10.6703L18.4773 10.675L12.3836 12.3812L10.6773 18.475L10.6726 18.4906C10.5976 18.7438 10.4432 18.9662 10.2323 19.125C10.0213 19.2838 9.76483 19.3706 9.50076 19.3726H9.47732C9.21837 19.375 8.96524 19.2958 8.75389 19.1462C8.54254 18.9965 8.38372 18.7841 8.29998 18.539L3.20311 4.79762C3.20146 4.79357 3.20015 4.78938 3.1992 4.78512C3.12303 4.56389 3.11048 4.32573 3.16297 4.09772C3.21546 3.86972 3.3309 3.66102 3.49613 3.49538C3.66137 3.32973 3.86978 3.21379 4.09766 3.16073C4.32553 3.10768 4.56373 3.11965 4.78514 3.19527L4.79764 3.19918L18.5414 8.29762C18.7902 8.38268 19.0054 8.54509 19.1553 8.76113C19.3053 8.97717 19.3823 9.23551 19.375 9.4984Z"
                  fill="#FFFFFF"
                />
              </Svg>
              <Text style={styles.placeDirectionsBtnText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  placePopupContainer: {
    position: 'absolute',
    top: 84,
    left: '5%',
    right: '5%',
    alignItems: 'center',
    zIndex: 999999,
    pointerEvents: 'box-none',
  },
  placeCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    position: 'relative',
  },
  // Horizontal layout: photo on left, text on right
  placeHorizontalRow: {
    flexDirection: 'row',
    padding: 12,
  },
  placePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e8eaed',
  },
  placeTextContent: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'flex-start',
  },
  placeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f1f1f',
    lineHeight: 20,
    marginBottom: 4,
  },
  placeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  placeRatingText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1f1f1f',
  },
  placeRatingStar: {
    fontSize: 14,
    color: '#fbbc04',
  },
  placeRatingCount: {
    fontSize: 14,
    color: '#70757a',
  },
  placePriceText: {
    fontSize: 14,
    color: '#70757a',
  },
  placeTypeText: {
    fontSize: 14,
    color: '#70757a',
  },
  placeTypePriceText: {
    fontSize: 14,
    color: '#70757a',
  },
  placeOpenText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  placeHoursText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#70757a',
  },
  // Buttons overlaid on card - positioned absolutely like web version
  placeCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },
  placeCloseBtnText: {
    fontSize: 22,
    color: '#5f6368',
    fontWeight: '300',
    lineHeight: 22,
  },
  placeDirectionsBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#1a73e8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    zIndex: 10,
  },
  placeDirectionsBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
});
