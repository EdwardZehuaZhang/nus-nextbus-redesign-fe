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

// Custom hooks
const useGoogleMapsInit = (
  mapContainerRef: React.RefObject<HTMLDivElement | null>,
  initialRegion: { latitude: number; longitude: number }
) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

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
    console.log('Map initialization effect:', {
      isLoaded,
      hasContainer: !!mapContainerRef.current,
      hasGoogle: !!window.google,
      hasMap: !!mapRef.current,
    });

    if (!isLoaded || !mapContainerRef.current || !window.google) {
      console.log('Not ready to initialize map yet');
      return;
    }

    if (!mapRef.current) {
      console.log('Creating new Google Map instance...');
      try {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center: {
            lat: initialRegion.latitude,
            lng: initialRegion.longitude,
          },
          zoom: 14, // Good zoom level for NUS campus view
          mapTypeControl: false, // Disable default controls
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }],
            },
          ],
        });
        console.log('Google Map created successfully!');
      } catch (error) {
        console.error('Error creating map:', error);
      }
    }
  }, [isLoaded, initialRegion, mapContainerRef]);

  return mapRef;
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);
  const mapRef = useGoogleMapsInit(mapContainerRef, initialRegion);

  // Check if map is loaded
  useEffect(() => {
    if (mapRef.current) {
      setIsMapLoaded(true);
    }
  }, [mapRef]);

  useMapMarkers({ mapRef, origin, destination, waypoints, onMarkerPress });
  useMapPolyline(mapRef, routePolyline);

  const handleMapTypeChange = (mapType: google.maps.MapTypeId) => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(mapType);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {!isMapLoaded && (
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
