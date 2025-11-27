import polyline from '@mapbox/polyline';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  type MarkerPressEvent,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Svg, { Text as SvgText } from 'react-native-svg';

import type { RouteCode } from '@/api/bus';
import { useBusStops } from '@/api/bus';
import type { LatLng } from '@/api/google-maps';
import {
  NUS_CAMPUS_BOUNDARY,
  ORANGE_AREA_BOUNDARY,
  BLUE_AREA_BOUNDARY,
  DARK_BLUE_AREA_BOUNDARY,
  YELLOW_AREA_BOUNDARY,
  DARK_ORANGE_AREA_BOUNDARY,
  CDE_AREA_BOUNDARY,
  FASS_AREA_BOUNDARY,
  COMBIZ_AREA_BOUNDARY,
  LAW_AREA_BOUNDARY,
  PGPR_BOUNDARY,
  LIGHTHOUSE_BOUNDARY,
  PIONEER_HOUSE_BOUNDARY,
  HELIX_HOUSE_BOUNDARY,
  SHEARES_HALL_BOUNDARY,
  KENT_RIDGE_HALL_BOUNDARY,
  TEMASEK_HALL_BOUNDARY,
  EUSOFF_HALL_BOUNDARY,
  KING_EDWARD_VII_HALL_BOUNDARY,
  RAFFLES_HALL_BOUNDARY,
  CAPT_BOUNDARY,
  RC4_BOUNDARY,
  RVRC_BOUNDARY,
  TEMBUSU_COLLEGE_BOUNDARY,
  VALOUR_HOUSE_BOUNDARY,
  NUS_LANDMARKS,
  type Coordinate,
} from '@/lib/map-boundaries';

interface InteractiveMapProps {
  origin?: LatLng;
  destination?: LatLng;
  waypoints?: LatLng[];
  routePolyline?: string;
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
}) => {
  const mapRef = useRef<MapView>(null);
  const [internalMapType, setInternalMapType] = useState<
    'standard' | 'satellite' | 'hybrid' | 'terrain'
  >('standard');
  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);
  const [mapReady, setMapReady] = useState(false);
  const hasSetInitialRegion = useRef(false);
  const isInitializing = useRef(true);

  const mapType = externalMapType ?? internalMapType;

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
    console.log('[Map] mapReady effect triggered:', { mapReady, hasOrigin: !!origin, hasDestination: !!destination, waypointsCount: waypoints.length, hasSetInitialRegion: hasSetInitialRegion.current });
    if (mapReady && mapRef.current && !origin && !destination && waypoints.length === 0 && !hasSetInitialRegion.current) {
      console.log('[Map] Forcing region to:', initialRegion);
      // Mark as set IMMEDIATELY to prevent double-execution
      hasSetInitialRegion.current = true;
      isInitializing.current = true;
      
      // Only set region if there's no route being displayed
      setTimeout(() => {
        mapRef.current?.animateToRegion(initialRegion, 100);
        // After setting initial region, allow region updates
        setTimeout(() => {
          console.log('[Map] Initialization complete, enabling region tracking');
          isInitializing.current = false;
        }, 500);
      }, 100);
    }
  }, [mapReady, initialRegion, origin, destination, waypoints.length]);
  
  // Handle region changes
  const handleRegionChange = (region: Region) => {
    setCurrentRegion(region);
  };

  // Debug: Log the initialRegion being used
  useEffect(() => {
    console.log('[Map] initialRegion:', initialRegion);
    console.log('[Map] Expected zoom level:', Math.log2(360 / initialRegion.latitudeDelta).toFixed(2));
  }, [initialRegion]);

  // Fetch bus stops data
  const { data: busStopsData } = useBusStops();

  // Log zoom level changes for debugging
  useEffect(() => {
    console.log(
      `[Map Zoom] latitudeDelta: ${currentRegion.latitudeDelta.toFixed(6)}, zoom level: ${currentZoom}, coords: ${currentRegion.latitude.toFixed(6)}, ${currentRegion.longitude.toFixed(6)}`
    );
  }, [currentRegion.latitudeDelta, currentZoom, currentRegion.latitude, currentRegion.longitude]);

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

  // Fit map to show all markers
  useEffect(() => {
    // Only fit to coordinates if we actually have markers to show
    if (mapRef.current && (origin || destination || waypoints.length > 0)) {
      const coordinates = [
        origin && { latitude: origin.lat, longitude: origin.lng },
        destination && {
          latitude: destination.lat,
          longitude: destination.lng,
        },
        ...waypoints.map((wp) => ({ latitude: wp.lat, longitude: wp.lng })),
      ].filter(Boolean) as Coordinate[];

      if (coordinates.length > 0) {
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

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
        mapType={mapType}
        onRegionChangeComplete={handleRegionChange}
        onMapReady={() => setMapReady(true)}
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
          const baseSize = 40;
          const size = baseSize * scale;
          const color = getLandmarkColor(landmark.type);
          
          return (
            <Marker
              key={`landmark-${index}`}
              coordinate={landmark.coordinates}
              title={landmark.name}
              description={landmark.address}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              opacity={shouldShowLandmarks ? 1 : 0}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                  borderRadius: size / 2,
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                {/* Icon placeholder - can be enhanced with actual icons later */}
                <View
                  style={{
                    width: size * 0.6,
                    height: size * 0.6,
                    backgroundColor: '#FFFFFF',
                    borderRadius: (size * 0.6) / 2,
                  }}
                />
              </View>
            </Marker>
          );
        })}

        {/* Bus Stop Circle Markers - Blue dots, visible only at zoom 17+ */}
        {busStopsData?.BusStopsResult?.busstops?.map((stop) => {
          const showCircle = shouldShowBusStops && currentZoom >= 17;

          return (
            <Marker
              key={`bus-stop-circle-${stop.name}`}
              coordinate={{
                latitude: stop.latitude,
                longitude: stop.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              opacity={showCircle ? 1 : 0}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#274F9C',
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}
              />
            </Marker>
          );
        })}

        {/* Bus Stop Label Markers - Text labels with dynamic positioning */}
        {busStopsData?.BusStopsResult?.busstops?.map((stop) => {
          const stopName = stop.ShortName || stop.caption || stop.name;
          const allStops = busStopsData?.BusStopsResult?.busstops || [];
          const labelBelow = shouldLabelBelow(stop, allStops);
          const labelOffsetLat = labelBelow ? -0.0001 : 0.0001;
          
          // Determine if label should be visible based on zoom and filters
          const isLabelVisible = shouldShowBusStops && shouldShowStop(stopName);
          
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
              title={stopName}
              anchor={{ x: 0.5, y: labelBelow ? 0 : 1 }}
              tracksViewChanges={false}
              opacity={isLabelVisible ? 1 : 0}
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
                  {/* Blue text on top */}
                  <SvgText
                    x="100"
                    y="20"
                    fontSize={fontSize}
                    fontWeight="600"
                    fill="#274F9C"
                    textAnchor="middle"
                  >
                    {stopName}
                  </SvgText>
                </Svg>
              </View>
            </Marker>
          );
        })}

        {/* Origin Marker */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title="Your Location"
            description="Starting point"
            pinColor="#274F9C"
            onPress={handleOriginPress}
          />
        )}

        {/* Waypoint Markers */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={`waypoint-${index}`}
            coordinate={{ latitude: waypoint.lat, longitude: waypoint.lng }}
            title={`Stop ${index + 1}`}
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
            title="Destination"
            description="Final destination"
            pinColor="#D32F2F"
            onPress={handleDestinationPress}
          />
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#274F9C"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>
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
});
