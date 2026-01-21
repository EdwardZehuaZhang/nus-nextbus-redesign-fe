import polyline from '@mapbox/polyline';
import { Barbell, BookOpen, BowlFood, Bus, FirstAid, Printer, Racquet, Subway, Waves } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  type MarkerPressEvent,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Svg, { Circle, G, Path, Text as SvgText, SvgXml } from 'react-native-svg';
import debounce from 'lodash.debounce';
import { useMapClustering } from '@/lib/hooks/use-map-clustering';
import { ClusterCircle } from '@/components/map/cluster-circle';

import type { RouteCode } from '@/api/bus';
import { useBusStops, useActiveBuses, useCheckpoints } from '@/api/bus';
// Removed getRouteColor import; using explicit mapping to match web
import type { LatLng } from '@/api/google-maps';
import { createBusMarkerSVG } from '@/components/bus-marker-icon';
import { useLocation } from '@/lib/hooks/use-location';
import { getTransitLineColor } from '@/lib/transit-colors';
import { getPlaceDetails } from '@/api/google-maps/places';
import { NUS_LANDMARKS } from '@/components/landmark-marker-icons';
import { NUS_PRINTERS, type Printer as PrinterLocation } from '@/data/printer-locations';
import { NUS_SPORTS_FACILITIES, type SportsFacility, getSportsFacilityColor } from '@/data/sports-facilities';
import { CANTEENS, type CanteenVenue, getCanteenColor } from '@/data/canteens';
import routeCheckpointsData from '@/data/route-checkpoints.json';

/**
 * Calculate bearing between two coordinates
 * @param from - Starting coordinate {lat, lng}
 * @param to - Ending coordinate {lat, lng}
 * @returns Bearing in degrees (0-360, where 0 is North, 90 is East, 180 is South, 270 is West)
 */
const calculateBearing = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

/**
 * Create a cache key for bearing calculations to memoize results
 * Rounds coordinates to 4 decimal places (~11 meters precision)
 */
const createBearingCacheKey = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): string => {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return `${round(from.lat)},${round(from.lng)}-${round(to.lat)},${round(to.lng)}`;
};

/**
 * Find the nearest upcoming checkpoint for a bus
 * @param busPos - Current bus position {lat, lng}
 * @param checkpoints - Array of route checkpoints
 * @param direction - Bus direction (1 = forward, 2 = reverse)
 * @returns Next checkpoint or null
 */
const findNextCheckpoint = (
  busPos: { lat: number; lng: number },
  checkpoints: { latitude: number; longitude: number }[],
  direction: 1 | 2
): { lat: number; lng: number } | null => {
  if (!checkpoints || checkpoints.length === 0) return null;

  const orderedCheckpoints =
    direction === 2 ? [...checkpoints].reverse() : checkpoints;

  let minDistance = Infinity;
  let closestIndex = -1;

  orderedCheckpoints.forEach((checkpoint, index) => {
    const distance = Math.sqrt(
      Math.pow(checkpoint.latitude - busPos.lat, 2) +
        Math.pow(checkpoint.longitude - busPos.lng, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  if (closestIndex !== -1 && closestIndex < orderedCheckpoints.length - 1) {
    const nextCheckpoint = orderedCheckpoints[closestIndex + 1];
    return { lat: nextCheckpoint.latitude, lng: nextCheckpoint.longitude };
  }

  if (closestIndex === orderedCheckpoints.length - 1) {
    const checkpoint = orderedCheckpoints[closestIndex];
    return { lat: checkpoint.latitude, lng: checkpoint.longitude };
  }

  return null;
};

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
  | { type: 'printer'; printer: PrinterLocation }
  | { type: 'sports'; facility: SportsFacility }
  | { type: 'canteen'; canteen: CanteenVenue };

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
  onMapItemSelect?: (selection: MapSelection | null) => void;
  enablePlaceDetails?: boolean;
  selectedMapItem?: MapSelection | null;
  forceResetCenter?: boolean;
}

const DEFAULT_REGION: Region = {
  latitude: 1.289, // Moved further down (south)
  longitude: 103.777, // Adjusted slightly right (east)
  latitudeDelta: 0.02, // Zoom level 14 - zoomed out to see full campus
  longitudeDelta: 0.02,
};

const isValidInitialRegion = (region: Region): boolean => {
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
    case 'printer':
      return '#FF8C00'; // Orange
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
  type: 'hospital' | 'mrt' | 'library' | 'bus-terminal' | 'printer';
  scale: number;
}> = ({ type, scale }) => {
  const color = getLandmarkColor(type);
  const width = 40 * scale;
  const height = 52 * scale;
  // IMPORTANT: Keep icon sizing/positioning in viewBox units.
  // The outer SVG already scales via its `width/height`, so multiplying by `scale`
  // here would effectively apply scale twice and make icons look tiny/misaligned.
  // Match the web marker glyph sizing (see `createPinMarkerWithIcon`).
  const iconSize = 24;
  const iconTranslateX = 20 - iconSize / 2;
  const iconTranslateY = 20 - iconSize / 2;

  // Select the appropriate icon component
  const IconComponent = {
    hospital: FirstAid,
    mrt: Subway,
    library: BookOpen,
    'bus-terminal': Bus,
    printer: Printer,
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
        <G transform={`translate(${iconTranslateX}, ${iconTranslateY})`}>
          <IconComponent size={iconSize} color="white" weight="fill" />
        </G>
      </Svg>
    </View>
  );
};

/**
 * Calculate scale for landmark markers based on zoom level
 * Matches web version behavior (zoom levels now aligned)
 * Reduced base scale to 0.7 for important markers
 */
const getLandmarkScale = (zoom: number): number => {
  if (zoom <= 14) return 0.49;
  else if (zoom <= 15) return 0.595;
  else if (zoom === 16) return 0.7;
  else if (zoom === 17) return 0.805;
  else if (zoom === 18) return 0.91;
  else return 1.05;
};

/**
 * Circular marker for sports facilities, printers, and canteens (smaller than landmarks)
 * 30x30px base size with colored circle and white icon
 */
const CircularMarker: React.FC<{
  type: 'gym' | 'swimming' | 'badminton' | 'printer' | 'canteen';
  scale: number;
  isDimmed?: boolean;
}> = ({ type, scale, isDimmed = false }) => {
  const dimmedColor = '#D1D5DB';
  const color = isDimmed
    ? dimmedColor
    : type === 'printer'
      ? '#FF8C00'
      : type === 'canteen'
        ? getCanteenColor()
        : getSportsFacilityColor(type);
  const size = 30 * scale;
  
  // Darker border color (30% darker)
  const darkerColor = color.replace(/^#/, '');
  const r = parseInt(darkerColor.substring(0, 2), 16);
  const g = parseInt(darkerColor.substring(2, 4), 16);
  const b = parseInt(darkerColor.substring(4, 6), 16);
  const borderColor = `#${Math.round(r * 0.7).toString(16).padStart(2, '0')}${Math.round(g * 0.7).toString(16).padStart(2, '0')}${Math.round(b * 0.7).toString(16).padStart(2, '0')}`;

  // Select the appropriate icon component
  const IconComponent = {
    gym: Barbell,
    swimming: Waves,
    badminton: Racquet,
    printer: Printer,
    canteen: BowlFood,
  }[type];

  const iconSize = 16; // Fixed size in viewBox units, no scaling

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 30 30">
        {/* White background circle */}
        <Circle cx="15" cy="15" r="13" fill="white" stroke={borderColor} strokeWidth="2.5" />
        {/* Colored circle */}
        <Circle cx="15" cy="15" r="10.5" fill={color} />
        {/* Icon */}
        <G transform={`translate(${15 - iconSize / 2}, ${15 - iconSize / 2})`}>
          <IconComponent size={iconSize} color="white" weight="fill" />
        </G>
      </Svg>
    </View>
  );
};

/**
 * Calculate scale for circular markers (sports and printers) based on zoom level
 * Smaller than landmarks
 */
const getCircularMarkerScale = (zoom: number): number => {
  if (zoom <= 14) return 0.6;
  else if (zoom <= 15) return 0.75;
  else if (zoom === 16) return 0.9;
  else if (zoom === 17) return 1.0;
  else if (zoom === 18) return 1.15;
  else return 1.3;
};

/**
 * Memoized Bus Stop Label Marker Component
 * Prevents unnecessary re-renders during map pans/zooms by isolating label rendering logic
 */
interface BusStopLabelProps {
  stop: any;
  isLabelVisible: boolean;
  isLabelClickable: boolean;
  labelColor: string;
  currentZoom: number;
  onPress: (e: MarkerPressEvent) => void;
  shouldLabelBelow: boolean;
}

// Crash-safe label rendering strategy:
// - Stable keys: key uses stop.name only (no color/version in key)
// - Color updates: a short tracksViewChanges pulse (~250ms) when labelColor/visibility changes
// - This avoids mass remounts/reordering that can trigger AIRGoogleMap insertReactSubview crashes on iOS
const BusStopLabelMarker = React.memo<BusStopLabelProps>(({ 
  stop,
  isLabelVisible,
  isLabelClickable,
  labelColor,
  currentZoom,
  onPress,
  shouldLabelBelow,
}) => {
  const stopName = stop.ShortName || stop.caption || stop.name;
  const labelOffsetLat = shouldLabelBelow ? -0.0001 : 0.0001;

  // Calculate font size based on zoom level (matching web version)
  let fontSize = 12;
  let strokeWidth = 3;
  if (currentZoom >= 17) {
    fontSize = Math.min(18, 12 + (currentZoom - 16) * 2);
    strokeWidth = Math.min(4, 3 + (currentZoom - 16) * 0.3);
  }
  const labelWidth = Math.min(
    200,
    Math.max(60, Math.ceil(stopName.length * fontSize * 0.6))
  );
  const labelHeight = Math.max(22, Math.ceil(fontSize + 10));
  const textY = Math.round(labelHeight * 0.7);

  // Ensure label color changes are rendered even with tracksViewChanges optimization
  const [trackChanges, setTrackChanges] = React.useState(false);
  const prevColorRef = React.useRef(labelColor);
  React.useEffect(() => {
    if (prevColorRef.current !== labelColor || isLabelVisible) {
      setTrackChanges(true);
      const t = setTimeout(() => setTrackChanges(false), 250);
      prevColorRef.current = labelColor;
      return () => clearTimeout(t);
    }
  }, [labelColor, isLabelVisible]);

  return (
    <Marker
      key={`bus-stop-label-${stop.name}`}
      coordinate={{
        latitude: stop.latitude + labelOffsetLat,
        longitude: stop.longitude,
      }}
      anchor={{ x: 0.5, y: shouldLabelBelow ? 0 : 1 }}
      tracksViewChanges={trackChanges}
      opacity={isLabelVisible ? 1 : 0}
      onPress={isLabelClickable ? onPress : undefined}
      zIndex={60}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg
          width={labelWidth}
          height={labelHeight}
          viewBox={`0 0 ${labelWidth} ${labelHeight}`}
        >
          {/* White stroke outline - rendered first (behind) */}
          <SvgText
            x={labelWidth / 2}
            y={textY}
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
            x={labelWidth / 2}
            y={textY}
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
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if key props change
  return (
    prevProps.isLabelVisible === nextProps.isLabelVisible &&
    prevProps.labelColor === nextProps.labelColor &&
    prevProps.currentZoom === nextProps.currentZoom &&
    prevProps.shouldLabelBelow === nextProps.shouldLabelBelow &&
    prevProps.stop.latitude === nextProps.stop.latitude &&
    prevProps.stop.longitude === nextProps.stop.longitude &&
    prevProps.stop.name === nextProps.stop.name
  );
});

BusStopLabelMarker.displayName = 'BusStopLabelMarker';

// Debug logging for route rendering
const DEBUG_ROUTES = false;
const logRoute = (message: string, data?: any) => {
  if (DEBUG_ROUTES) {
    console.log(`[BUS_ROUTE] ${message}`, data || '');
  }
};

export const InteractiveMap = React.memo<InteractiveMapProps>(({
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
  onMapItemSelect,
  enablePlaceDetails = true,
  selectedMapItem,
  forceResetCenter = false,
}) => {
  const mapRef = useRef<MapView>(null);
  const [internalMapType, setInternalMapType] = useState<
    'standard' | 'satellite' | 'hybrid' | 'terrain'
  >('standard');

  // Bearing calculation cache to avoid recalculating every 20 seconds
  const bearingCacheRef = useRef<Map<string, number>>(new Map());

  // State tracking refs for route selection sync (prevents infinite loops)
  const previousActiveRouteRef = useRef<RouteCode | null>(null);
  const isSyncingFromActiveRouteRef = useRef(false);
  const savedFilterStateRef = useRef<Record<string, boolean> | null>(null);

  // Calculate effective active route (priority: filter panel > nearest stops prop)
  const selectedFilterRoute = React.useMemo(() => {
    const codes = Object.entries(mapFilters)
      .filter(([key, value]) => key.startsWith('bus-route-') && !!value)
      .map(([key]) => key.replace('bus-route-', '').toUpperCase());
    return codes.length === 1 ? (codes[0] as RouteCode) : null;
  }, [mapFilters]);

  const effectiveActiveRoute = selectedFilterRoute || _activeRoute;
  const [deferredActiveRoute, setDeferredActiveRoute] = useState<RouteCode | null>(
    effectiveActiveRoute
  );
  const safeInitialRegion = React.useMemo(
    () => (isValidInitialRegion(initialRegion) ? initialRegion : DEFAULT_REGION),
    [initialRegion]
  );
  const [currentRegion, setCurrentRegion] = useState<Region>(safeInitialRegion);
  const [mapReady, setMapReady] = useState(false);
  const hasSetInitialRegion = useRef(false);
  const isInitializing = useRef(true);
  const hasFitToCoordinates = useRef(false); // Guard to prevent repeated fitToCoordinates calls
  const emitSelection = React.useCallback(
    (selection: MapSelection | null) => {
      onMapItemSelect?.(selection);
    },
    [onMapItemSelect]
  );

  // Defer heavy map updates (bus stops/labels/polylines) to keep live buses responsive
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDeferredActiveRoute(effectiveActiveRoute);
    }, 0);

    return () => clearTimeout(timeout);
  }, [effectiveActiveRoute]);

  // Get user's current location from hook
  const { coords: userLocation } = useLocation();

  // Debug: Log user location (dev only)
  // useEffect(() => {
  //   if (!__DEV__) return;
  //   console.log('[USER_LOCATION] Location update:', {
  //     hasLocation: !!userLocation,
  //     latitude: userLocation?.latitude,
  //     longitude: userLocation?.longitude,
  //     heading: userLocation?.heading,
  //     accuracy: userLocation?.accuracy,
  //   });
  // }, [userLocation]);

  // Initialize currentRegion with initialRegion when it changes
  useEffect(() => {
    setCurrentRegion(safeInitialRegion);
  }, [safeInitialRegion]);

  // Force reset map center when requested (e.g., on navigation screen focus)
  useEffect(() => {
    if (!forceResetCenter || !mapReady || !mapRef.current) {
      if (forceResetCenter) {
      }
      return;
    }
    if (routePolyline || internalRoutePolylines) {
      return;
    }
    mapRef.current.animateToRegion(safeInitialRegion, 100);
  }, [
    forceResetCenter,
    mapReady,
    routePolyline,
    internalRoutePolylines,
    safeInitialRegion,
  ]);

  // Fallback: mark map ready shortly after mount to avoid blocking live markers
  useEffect(() => {
    if (mapReady) return;
    const timeout = setTimeout(() => {
      if (mapRef.current) {
        setMapReady(true);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [mapReady]);

  // Calculate Google Maps zoom level from latitudeDelta
  // Formula: zoom = ln(360 / latitudeDelta) / ln(2)
  // This matches Google Maps zoom levels (0 = world, 21 = building)
  // Add MOBILE_ZOOM_OFFSET to align with web zoom behavior
  const getZoomLevel = (latitudeDelta: number): number => {
    const zoom = Math.log2(360 / latitudeDelta);
    return Math.round(zoom) + MOBILE_ZOOM_OFFSET;
  };

  const currentZoom = getZoomLevel(currentRegion.latitudeDelta);

  const mapBounds = React.useMemo(() => {
    const lat = currentRegion.latitude;
    const lng = currentRegion.longitude;
    const latDelta = currentRegion.latitudeDelta;
    const lngDelta = currentRegion.longitudeDelta;
    return {
      ne: { lat: lat + latDelta / 2, lng: lng + lngDelta / 2 },
      sw: { lat: lat - latDelta / 2, lng: lng - lngDelta / 2 },
    };
  }, [currentRegion]);

  // Generate custom map style based on zoom level to hide/show POI and road labels
  const customMapStyle = React.useMemo(() => {
    const showDetails = currentZoom >= 16;

    // Always hide region/locality labels (Clementi, Queenstown, Holland Village, etc.)
    // and country/geographic labels (Singapore, Malaysia, Sentosa, Bukom Island, etc.)
    const baseStyles = [
      {
        featureType: 'administrative.locality',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'administrative.neighborhood',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'administrative.country',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'administrative.province',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'administrative.land_parcel',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'landscape',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'water',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ];

    if (showDetails) {
      // Show all other details at zoom 16+ but keep region labels hidden
      return baseStyles;
    }

    // Hide POI labels and road labels when zoomed out, plus region labels
    return [
      ...baseStyles,
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

  // Note: Initial region animation is now handled by forceResetCenter effect
  // This effect is kept for reference but is no longer needed since navigation.tsx sets forceResetCenter on focus
  // Removed duplicate animateToRegion to prevent conflicting animations

  // Handle region changes
  const handleRegionChange = (region: Region) => {
    setCurrentRegion(region);
  };

  const handleRegionChangeDebounced = React.useMemo(
    () => debounce((region: Region) => setCurrentRegion(region), 150),
    []
  );

  const { data: busStopsData } = useBusStops();

  // Log zoom level changes for debugging
  useEffect(() => {
    let stopVisibilityMode = '';
    if (currentZoom <= 13) {
      stopVisibilityMode = 'HIDE ALL STOPS';
    } else if (currentZoom === 14) {
      stopVisibilityMode = 'Show only 4 key stops';
    } else if (currentZoom >= 15 && currentZoom <= 16) {
      stopVisibilityMode = 'Show priority stops';
    } else if (currentZoom >= 17) {
      stopVisibilityMode = 'Show all stops';
    } else {
      stopVisibilityMode = 'HIDE ALL STOPS';
    }
    console.log(`[MapZoomLevel] Zoom ${currentZoom}: ${stopVisibilityMode}`);
  }, [currentZoom]);

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

  // Key stops to show at zoom 18 (very zoomed out)
  const zoom18KeyStops = [
    'UTown',
    'UHC',
    'KR Bus Ter',
    'KR MRT',
    'TCOMS',
  ];

  // Priority stops that should be shown at zoom level 15-16 (expanded key locations)
  const priorityStops = [
    'COM 3',
    'TCOMS',
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

    // Show based on zoom level:
    // - Zoom 13 and below: Hide all stops
    // - Zoom 14: Show only 4 key stops
    // - Zoom 15-16: Show priority stops
    // - Zoom 17+: Show all stops
    
    if (currentZoom <= 13) {
      return false; // Hide all stops at zoom 13 and below
    } else if (currentZoom === 14) {
      const isKeyStop = zoom18KeyStops.some((p) => stopName === p || stopName.trim() === p);
      return isKeyStop; // Show only 4 key stops at zoom 14
    } else if (currentZoom >= 15 && currentZoom <= 16) {
      // Show priority stops at zoom 15-16
      const isPriority = priorityStops.some((p) => stopName === p || stopName.trim() === p);
      return isPriority;
    } else if (currentZoom >= 17) {
      // Show all stops at zoom 17+
      return true;
    } else {
      // Default: hide
      return false;
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

  // Safe-decode helper: wrap decode in try/catch but don't filter coordinates
  const tryDecodePolyline = (encoded?: string) => {
    if (!encoded) return [];
    try {
      const pts = polyline.decode(encoded);
      return Array.isArray(pts) && pts.length > 0
        ? pts.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
        : [];
    } catch (err) {
      return [];
    }
  };

  // Build segment polylines for transit routes (Google steps) or internal routes
  const transitSegments = React.useMemo(() => {
    if (internalRoutePolylines) {
      const toStop = (internalRoutePolylines.walkToStop || [])
        .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
        .map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
        }));
      const busSeg = (internalRoutePolylines.busSegment || [])
        .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
        .map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
        }));
      const fromStop = (internalRoutePolylines.walkFromStop || [])
        .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
        .map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
        }));

      const walkColor = '#274F9C';
      const busColor = internalRoutePolylines.busRouteColor || '#274F9C';

      console.log('🗺️ [ROUTE_COORDS_NATIVE] Internal route polylines:', {
        walkToStopPoints: toStop.length > 0 ? `${toStop.length} points - First: ${toStop[0]?.latitude},${toStop[0]?.longitude}` : 'empty',
        busSegmentPoints: busSeg.length > 0 ? `${busSeg.length} points - First: ${busSeg[0]?.latitude},${busSeg[0]?.longitude}` : 'empty',
        walkFromStopPoints: fromStop.length > 0 ? `${fromStop.length} points - First: ${fromStop[0]?.latitude},${fromStop[0]?.longitude}` : 'empty',
        busColor: busColor,
      });

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
          const coordinates = tryDecodePolyline(step.polyline.encodedPolyline);
          if (coordinates.length < 2) return null;

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

  // Generate stable MapView key to force remount when route structure changes
  // This prevents iOS AIRGoogleMap crash from child count changes during render
  const mapViewKey = React.useMemo(() => {
    // If no route data exists, use stable "no-route" key
    if (!internalRoutePolylines && (!routeSteps || routeSteps.length === 0)) {
      return 'map-no-route';
    }
    
    // Generate key based on route structure (not content)
    const segmentCount = transitSegments.length;
    const routeHash = internalRoutePolylines 
      ? `internal-${segmentCount}`
      : `steps-${routeSteps?.length || 0}-${segmentCount}`;
    
    return `map-${routeHash}`;
  }, [internalRoutePolylines, routeSteps, transitSegments.length]);

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
      R1: '#FF7913',
      R2: '#008200',
      P: '#838383',
    }),
    []
  );

  // Fetch live bus locations for the active route
  const { data: activeBusesData } = useActiveBuses(
    effectiveActiveRoute as RouteCode,
    !!effectiveActiveRoute
  );
  const activeBuses = activeBusesData?.ActiveBusResult?.activebus || [];
  const routeColor = effectiveActiveRoute ? routeColors[effectiveActiveRoute] : '#274F9C';

  // Fetch checkpoints for bearing calculation
  const { data: checkpointsData } = useCheckpoints(
    effectiveActiveRoute as RouteCode
  );
  const checkpoints = effectiveActiveRoute
    ? checkpointsData?.CheckPointResult?.CheckPoint || []
    : [];

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
    if (!allStops) {
      console.log('🗺️ [MEMBERSHIP] No bus stops data available');
      return;
    }
    
    console.log(`🗺️ [MEMBERSHIP] Computing for ${Object.keys(routeColors).length} routes with ${allStops.length} stops`);
    
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
      console.log(`🗺️ [MEMBERSHIP] Route ${routeCode}: ${set.size} stops`);
    });
  }, [busStopsData, routeColors]);

  // Sync activeRoute prop changes to mapFilters (when route selected from nearest stops)
  React.useEffect(() => {
    if (isSyncingFromActiveRouteRef.current) {
      return; // Prevent infinite loop
    }

    const previousActiveRoute = previousActiveRouteRef.current;

    if (_activeRoute && _activeRoute !== previousActiveRoute) {
      // Route was selected from nearest stops - update filter panel
      const routeFilterKey = `bus-route-${_activeRoute.toLowerCase()}`;
      const updatedFilters = { ...mapFilters };

      // Deselect all bus-route filters
      Object.keys(updatedFilters).forEach((key) => {
        if (key.startsWith('bus-route-')) {
          updatedFilters[key] = false;
        }
      });

      // Select the active route
      updatedFilters[routeFilterKey] = true;
  // Auto-enable bus stops when a route is selected so they're visible
  updatedFilters['bus-stops'] = true;

      // Hide landmarks, academic, residences when route selected
      updatedFilters['important'] = false;
      updatedFilters['academic'] = false;
      updatedFilters['residences'] = false;

      isSyncingFromActiveRouteRef.current = true;
      _onMapFiltersChange?.(updatedFilters);
      setTimeout(() => {
        isSyncingFromActiveRouteRef.current = false;
      }, 100);

      previousActiveRouteRef.current = _activeRoute;
    } else if (!_activeRoute && previousActiveRoute) {
      // Route was deselected - restore saved filter state if available
      if (savedFilterStateRef.current) {
        isSyncingFromActiveRouteRef.current = true;
        _onMapFiltersChange?.(savedFilterStateRef.current);
        setTimeout(() => {
          isSyncingFromActiveRouteRef.current = false;
        }, 100);
        savedFilterStateRef.current = null;
      }
      previousActiveRouteRef.current = null;
    }
  }, [_activeRoute, mapFilters, _onMapFiltersChange]);

  // Sync filter changes back to activeRoute (when route selected from filter panel)
  React.useEffect(() => {
    if (isSyncingFromActiveRouteRef.current) {
      return; // Prevent infinite loop
    }

    if (selectedFilterRoute && selectedFilterRoute !== _activeRoute) {
      // Filter panel selection changed - notify parent
      _onActiveRouteChange?.(selectedFilterRoute);
    } else if (!selectedFilterRoute && _activeRoute) {
      // All routes deselected in filter panel
      _onActiveRouteChange?.(null);
    }
  }, [selectedFilterRoute, _activeRoute, _onActiveRouteChange]);

  const isStopVisibleForActiveRoutes = React.useCallback(
    (stop: any): boolean => {
      // If deferredActiveRoute is set, only show stops on that route
      if (deferredActiveRoute) {
        const membership = routeStopMembershipRef.current.get(deferredActiveRoute);
        const isVisible = membership?.has(stop.name) || false;
        if (stop.name === 'Central Library' || stop.name === 'KE7') {
          console.log(`🗺️ [VISIBLE] ${stop.name}: ${isVisible} (${deferredActiveRoute} members: ${membership?.size || 0})`);
        }
        return isVisible;
      }
      // Otherwise use filter-based codes
      if (activeBusRouteCodes.length === 0) return true;
      return activeBusRouteCodes.some((code) =>
        routeStopMembershipRef.current.get(code)?.has(stop.name)
      );
    },
    [deferredActiveRoute, activeBusRouteCodes]
  );

  // Always render ALL bus stops; control visibility via opacity to keep children count/order stable
  const allBusStops: any[] = React.useMemo(() => {
    return busStopsData?.BusStopsResult?.busstops || [];
  }, [busStopsData]);

  

  const clusteredInputMarkers = React.useMemo(() => {
    if (!allBusStops || allBusStops.length === 0) return [] as { id: string; name: string; latitude: number; longitude: number }[];
    // PERFORMANCE OPTIMIZATION: Pre-filter markers to only include visible stops before passing to Supercluster
    // This reduces O(n log n) clustering computation on unfiltered data
    // Filter by: route membership, zoom level visibility, and custom filters
    return allBusStops
      .filter((stop: any) => isStopVisibleForActiveRoutes(stop) && shouldShowStop(stop.name))
      .map((stop: any) => ({
        id: stop.name,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
      }));
  }, [allBusStops, isStopVisibleForActiveRoutes, currentZoom, visibleBusStops]);

  const { displayMarkers: clusteredMarkers } = useMapClustering(
    clusteredInputMarkers,
    currentZoom,
    mapBounds
  );

  // Extract individual filter values to ensure proper re-rendering
  const filterImportant = mapFilters?.important ?? false;
  const filterBusStops = mapFilters?.['bus-stops'] ?? false;
  const filterAcademic = mapFilters?.academic ?? false;
  const filterResidences = mapFilters?.residences ?? false;


  // Determine what to show based on filters
  const shouldShowLandmarks = showLandmarks && filterImportant;
  const shouldShowPrinters = (mapFilters?.printers ?? false) && currentZoom !== 14;
  const shouldShowSports = (mapFilters?.sports ?? false) && currentZoom !== 14;
  const shouldShowCanteens = (mapFilters?.canteens ?? false) && currentZoom !== 14;
  // Fix: Only show bus stops if BOTH showBusStops prop AND filterBusStops are true
  const shouldShowBusStops = showBusStops && filterBusStops;
  const shouldShowAcademic = filterAcademic;
  const shouldShowResidences = filterResidences;

  // NOTE: Keep circles/labels mounted; control visibility via opacity
  // This avoids AIRGoogleMap insertReactSubview crash from child reordering on iOS.

  // Log bus stop visibility summary
  useEffect(() => {
    if (shouldShowBusStops && clusteredInputMarkers.length > 0) {
      console.log(`[BusStopsVisibility] Zoom ${currentZoom}: ${clusteredInputMarkers.length} stops visible (out of ${allBusStops.length} total)`);
      console.log(`[BusStopsVisibility] Visible stops: ${clusteredInputMarkers.map((m) => m.name).join(', ')}`);
    }
  }, [clusteredInputMarkers, currentZoom, shouldShowBusStops, allBusStops.length]);

  const selectedPrinterId =
    selectedMapItem?.type === 'printer' ? selectedMapItem.printer.id : null;
  const selectedSportsFacilityId =
    selectedMapItem?.type === 'sports' ? selectedMapItem.facility.id : null;
  const selectedCanteenId =
    selectedMapItem?.type === 'canteen' ? selectedMapItem.canteen.id : null;
  const selectedBusStopId =
    selectedMapItem?.type === 'place' && selectedMapItem.place.type === 'bus-stop'
      ? selectedMapItem.place.stopId || selectedMapItem.place.name
      : null;

  // PERFORMANCE: Memoize label properties to only recalculate on zoom/filter changes, not on every active bus update
  const busStopLabelProps = React.useMemo(() => {
    const allStops = allBusStops;
    return allBusStops.map((stop: any) => {
      const stopName = stop.ShortName || stop.caption || stop.name;
      const labelBelow = shouldLabelBelow(stop, allStops);
      const stopId = stop.name || stopName;
      const stopKey = stop.name || stop.ShortName || stop.caption;

      // Determine if label should be visible based on zoom and filters
      const visibleByRoute = isStopVisibleForActiveRoutes(stop);
      const isLabelVisible =
        shouldShowBusStops && shouldShowStop(stopName) && visibleByRoute;
      const isLabelClickable = isLabelVisible;
      // Choose label color: per-route membership (same logic as circle)
      // DEFAULT bus stop label color.
      // Change here if you want a different fallback (when no route color applies).
      // Note: Labels update color via useMemo + a short tracksViewChanges pulse in BusStopLabelMarker.
      // Do NOT change other '#274F9C' occurrences for this purpose.
      let labelColor = '#274F9C';
      const isRouteStop = deferredActiveRoute
        ? routeStopMembershipRef.current.get(deferredActiveRoute)?.has(stopKey)
        : false;
      if (deferredActiveRoute && isRouteStop) {
        // When a route is active, use its color for member stops
        labelColor = routeColors[deferredActiveRoute] || labelColor;
      } else if (visibleByRoute) {
        // Multiple filters active - color by first matching route
        const matchCode = activeBusRouteCodes.find((code) =>
          routeStopMembershipRef.current.get(code)?.has(stopKey)
        );
        if (matchCode) {
          labelColor = routeColors[matchCode] || labelColor;
        }
      }
      if (selectedBusStopId && selectedBusStopId !== stopId) {
        labelColor = '#D1D5DB';
      }

      return {
        stop,
        isLabelVisible,
        isLabelClickable,
        labelColor,
        shouldLabelBelow: labelBelow,
      };
    });
  }, [
    allBusStops,
    deferredActiveRoute,
    shouldShowBusStops,
    activeBusRouteCodes,
    routeStopMembershipRef,
    selectedBusStopId,
    isStopVisibleForActiveRoutes,
    currentZoom,
    visibleBusStops,
    routeColors,
    shouldShowStop,
  ]);

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
            edgePadding: { top: 320, right: 260, bottom: 560, left: 260 },
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
      if (!enablePlaceDetails) return;

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

            emitSelection({
              type: 'place',
              place: {
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
              },
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
      const safePlaceType: MapPlaceSelection['type'] =
        landmark.type === 'hospital' ||
        landmark.type === 'mrt' ||
        landmark.type === 'library' ||
        landmark.type === 'bus-terminal'
          ? landmark.type
          : 'location';

      emitSelection({
        type: 'place',
        place: {
          name: landmark.name,
          address: landmark.address,
          coordinates: {
            latitude: landmark.coordinates.lat,
            longitude: landmark.coordinates.lng,
          },
          type: safePlaceType,
        },
      });
    };

  const handlePrinterPress = (printer: PrinterLocation) => (e: MarkerPressEvent) => {
    e.stopPropagation();
    emitSelection({ type: 'printer', printer });
  };

  const handleSportsFacilityPress = (facility: SportsFacility) => (e: MarkerPressEvent) => {
    e.stopPropagation();
    emitSelection({ type: 'sports', facility });
  };

  const handleCanteenPress = (canteen: CanteenVenue) => (e: MarkerPressEvent) => {
    e.stopPropagation();
    emitSelection({ type: 'canteen', canteen });
  };

  const handleBusStopPress = (stop: any) => (e: MarkerPressEvent) => {
    e.stopPropagation();
    if (!enablePlaceDetails) return;
    const stopName = stop.ShortName || stop.caption || stop.name;
    emitSelection({
      type: 'place',
      place: {
        name: stopName,
        address: undefined,
        coordinates: { latitude: stop.latitude, longitude: stop.longitude },
        stopId: stop.name,
        type: 'bus-stop',
      },
    });
  };

  // Handle Google Places POI clicks
  // Handle map press to allow normal press detection
  const handleMapPress = (_event: any) => {};

  const handlePoiClick = async (event: any) => {
    const { placeId, name, coordinate } = event.nativeEvent;

    if (!placeId || !enablePlaceDetails) return;

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

        emitSelection({
          type: 'place',
          place: {
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
          },
        });
      } else {
        // Fallback if API fails
        emitSelection({
          type: 'place',
          place: {
            name: name,
            address: undefined,
            coordinates: coordinate,
            type: 'google-place',
          },
        });
      }
    } catch (error) {
      // Fallback on error
      emitSelection({
        type: 'place',
        place: {
          name: name,
          address: undefined,
          coordinates: coordinate,
          type: 'google-place',
        },
      });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        key={mapViewKey}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={safeInitialRegion}
        showsUserLocation={Platform.OS === 'android'}
        userLocationAnnotationTitle="My Location"
        userLocationCalloutEnabled={false}
        userLocationUpdateInterval={1000}
        showsMyLocationButton
        showsCompass
        showsScale
        mapType={externalMapType ?? internalMapType}
        onRegionChangeComplete={handleRegionChangeDebounced}
        onMapReady={() => {
          setMapReady(true);
        }}
        onMapLoaded={() => {
          setMapReady(true);
        }}
        onPress={handleMapPress}
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
            { latitude: 85.55, longitude: 31.65 },
            { latitude: 85.55, longitude: 203.9 },
            { latitude: -85.23, longitude: 203.9 },
            { latitude: -85.23, longitude: 31.65 },
            { latitude: 1.35, longitude: 31.65 },
          ]}
          holes={[
            // Campus boundary as a hole - this area stays clear
            NUS_CAMPUS_BOUNDARY,
          ]}
          strokeWidth={0}
          strokeColor="transparent"
          fillColor="rgba(0, 0, 0, 0.222)"
          tappable={false}
        />

        {/* Complementary overlay - covers the opposite side of Earth */}
        <Polygon
          coordinates={[
            { latitude: 85.55, longitude: 31.65 },
            { latitude: 85.55, longitude: -141.65 },
            { latitude: -85.23, longitude: -141.65 },
            { latitude: -85.23, longitude: 31.65 },
          ]}
          strokeWidth={0}
          strokeColor="transparent"
          fillColor="rgba(0, 0, 0, 0.222)"
          tappable={false}
        />

        {/* Additional overlay - fills gap between complementary and original */}
        <Polygon
          coordinates={[
            { latitude: 85.55, longitude: -141.65 },
            { latitude: 85.55, longitude: -156.1 },
            { latitude: -85.23, longitude: -156.1 },
            { latitude: -85.23, longitude: -141.65 },
          ]}
          strokeWidth={0}
          strokeColor="transparent"
          fillColor="rgba(0, 0, 0, 0.222)"
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
              zIndex={20}
            >
              <PinMarker type={landmark.type} scale={scale} />
            </Marker>
          );
        })}
        {/* Printer Markers - Pre-rendered, visibility controlled by opacity */}
        {NUS_PRINTERS.map((printer, index) => {
          const scale = getCircularMarkerScale(currentZoom);
          const isDimmed =
            selectedPrinterId !== null && selectedPrinterId !== printer.id;
          const isPrinterClickable = shouldShowPrinters;

          return (
            <Marker
              key={`printer-${index}`}
              coordinate={{
                latitude: printer.coordinates.lat,
                longitude: printer.coordinates.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              opacity={shouldShowPrinters ? 1 : 0}
              onPress={isPrinterClickable ? handlePrinterPress(printer) : undefined}
              zIndex={20}
            >
              <CircularMarker type="printer" scale={scale} isDimmed={isDimmed} />
            </Marker>
          );
        })}
        {/* Sports Facility Markers - Pre-rendered, visibility controlled by opacity */}
        {NUS_SPORTS_FACILITIES.map((facility, index) => {
          const scale = getCircularMarkerScale(currentZoom);
          const isDimmed =
            selectedSportsFacilityId !== null &&
            selectedSportsFacilityId !== facility.id;
          const isSportsClickable = shouldShowSports;

          return (
            <Marker
              key={`sports-${index}`}
              coordinate={{
                latitude: facility.coordinates.lat,
                longitude: facility.coordinates.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              opacity={shouldShowSports ? 1 : 0}
              onPress={isSportsClickable ? handleSportsFacilityPress(facility) : undefined}
              zIndex={20}
            >
              <CircularMarker type={facility.type} scale={scale} isDimmed={isDimmed} />
            </Marker>
          );
        })}
        {/* Canteen Markers - Pre-rendered, visibility controlled by opacity */}
        {CANTEENS.map((canteen, index) => {
          const scale = getCircularMarkerScale(currentZoom);
          const isDimmed =
            selectedCanteenId !== null && selectedCanteenId !== canteen.id;
          const isCanteenClickable = shouldShowCanteens;

          return (
            <Marker
              key={`canteen-${index}`}
              coordinate={{
                latitude: canteen.coords.lat,
                longitude: canteen.coords.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              opacity={shouldShowCanteens ? 1 : 0}
              onPress={isCanteenClickable ? handleCanteenPress(canteen) : undefined}
              zIndex={20}
            >
              <CircularMarker type="canteen" scale={scale} isDimmed={isDimmed} />
            </Marker>
          );
        })}
        {/* Cluster markers disabled - removed red circles with numbers per user request
        {shouldShowBusStops && currentZoom < 17 && clusteredMarkers
          .filter((m) => m.isCluster)
          .map((cluster) => (
            <Marker
              key={cluster.id}
              coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              opacity={shouldShowBusStops ? 1 : 0}
              zIndex={45}
            >
              <ClusterCircle count={cluster.clusterCount || 0} />
            </Marker>
          ))}
        */}

        {/* Bus Stop Circle Markers - Blue dots, visible only at zoom 17+ (filtered by route if active) */}
        {allBusStops.map((stop: any) => {
          const showCircle = shouldShowBusStops && currentZoom >= 17;
          const visibleByRoute = isStopVisibleForActiveRoutes(stop);
          const opacity = showCircle && visibleByRoute ? 1 : 0;
          const stopId = stop.name || stop.ShortName || stop.caption;
          const isCircleClickable = showCircle && visibleByRoute;
          const stopKey = stop.name || stop.ShortName || stop.caption;
          const isRouteStop = deferredActiveRoute
            ? routeStopMembershipRef.current.get(deferredActiveRoute)?.has(stopKey)
            : false;
          
          // Choose circle color: if multiple routes active, color by first matching route membership
          // DEFAULT bus stop circle color (small dot).
          // Change here if you want a different fallback (when no route color applies).
          // Circles do not remount on color change; avoid key changes to prevent native crashes.
          let circleColor = '#274F9C';
          if (deferredActiveRoute && isRouteStop) {
            // When a route is active, use its color for member stops
            circleColor = routeColors[deferredActiveRoute] || circleColor;
            // Debug sample stops
            if (stop.name === 'Central Library' || stop.name === 'KE7') {
              console.log(`🗺️ [CIRCLE] ${stop.name}: color=${circleColor} (route=${deferredActiveRoute})`);
            }
          } else if (visibleByRoute) {
            // Multiple filters active - color by first matching route
            const matchCode = activeBusRouteCodes.find((code) =>
              routeStopMembershipRef.current.get(code)?.has(stopKey)
            );
            if (matchCode) {
              circleColor = routeColors[matchCode] || circleColor;
            }
          }

          if (selectedBusStopId && selectedBusStopId !== stopId) {
            circleColor = '#D1D5DB';
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
              onPress={isCircleClickable ? handleBusStopPress(stop) : undefined}
              zIndex={50}
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
        {busStopLabelProps.map((props) => (
          <BusStopLabelMarker
            key={`bus-stop-label-${props.stop.name}`}
            stop={props.stop}
            isLabelVisible={props.isLabelVisible}
            isLabelClickable={props.isLabelClickable}
            labelColor={props.labelColor}
            currentZoom={currentZoom}
            onPress={handleBusStopPress(props.stop)}
            shouldLabelBelow={props.shouldLabelBelow}
          />
        ))}
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
        {/* Live bus markers moved after polylines to minimize index shifts */}

        {/* Bus Route Polylines - normal visibility using filters/active route */}
        {allRoutesPrecomputed.map(({ routeCode, coordinates }, idx) => {
          if (coordinates.length === 0) return null;
          const isPrimaryActive = effectiveActiveRoute === routeCode;
          const isFilteredActive = activeBusRouteCodes.includes(routeCode);
          // Show only when an active route or filters are set, and this route matches
          const hasAnyRouteActive = !!effectiveActiveRoute || activeBusRouteCodes.length > 0;
          const isVisible = hasAnyRouteActive && (isPrimaryActive || isFilteredActive);

          // Use canonical palette but render via RGBA for iOS reliability
          const paletteColor = routeColors[routeCode] || '#000000';
          const rgbaColor = hexToRgba(paletteColor, 1);
          const strokeWidth = isVisible ? (isPrimaryActive ? 3 : 2) : 0;
          const zIndex = 100 + idx;

          logRoute(`Render ${routeCode}`, {
            anyActive: hasAnyRouteActive,
            visible: isVisible,
            coordCount: coordinates.length,
            color: rgbaColor,
            strokeWidth,
          });

          // Disable simplification to maintain accurate route coordinates matching web version
          const effectiveCoordinates = coordinates;
          return (
            <Polyline
              key={`bus-route-${routeCode}`}
              coordinates={effectiveCoordinates}
              strokeColor={rgbaColor}
              strokeColors={effectiveCoordinates.map(() => rgbaColor)}
              strokeWidth={strokeWidth}
              lineCap="round"
              lineJoin="round"
              geodesic={false}
              zIndex={zIndex}
              tappable={false}
            />
          );
        })}

        {/* Live Bus Location Markers - Using SVG icons matching web version */}
        {effectiveActiveRoute && activeBuses.map((bus: any, idx: number) => {
          if (!bus.lat || !bus.lng) return null;

          // Calculate bearing using proper checkpoint data with memoization
          let bearing = 0; // Default to pointing right (East)
          const nextCheckpoint = findNextCheckpoint(
            { lat: bus.lat, lng: bus.lng },
            checkpoints,
            bus.direction
          );

          if (nextCheckpoint) {
            const cacheKey = createBearingCacheKey(
              { lat: bus.lat, lng: bus.lng },
              nextCheckpoint
            );

            // Check cache first to avoid recalculating
            if (bearingCacheRef.current.has(cacheKey)) {
              bearing = bearingCacheRef.current.get(cacheKey)!;
            } else {
              // Calculate and cache the bearing
              bearing = calculateBearing(
                { lat: bus.lat, lng: bus.lng },
                nextCheckpoint
              );
              bearingCacheRef.current.set(cacheKey, bearing);
            }
          }

          // Create SVG marker matching web version (28x28)
          const flipHorizontal = bus.direction === 2;
          const arrowRotation = bearing - 90; // Convert bearing to SVG rotation
          const svgXml = createBusMarkerSVG(routeColor, flipHorizontal, arrowRotation);

          // Debug first bus bearing
          if (idx === 0 && effectiveActiveRoute) {
            console.log(
              `🚌 [BUS] Route ${effectiveActiveRoute}: bearing=${bearing.toFixed(1)}°, arrow=${arrowRotation.toFixed(1)}°, dir=${bus.direction}`
            );
          }

          return (
            <Marker
              key={`bus-${effectiveActiveRoute || 'none'}-${bus.veh_plate || idx}`}
              coordinate={{
                latitude: bus.lat,
                longitude: bus.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              zIndex={100}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <SvgXml xml={svgXml} width={28} height={28} />
              </View>
            </Marker>
          );
        })}
      </MapView>

    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
