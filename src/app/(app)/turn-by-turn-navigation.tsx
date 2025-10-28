import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';

import {
  FocusAwareStatusBar,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import { XIcon } from '@/components/ui/icons/x-icon';
import { Env } from '@/lib/env';
import { useLocation } from '@/lib/hooks/use-location';

// Navigation Icons
const NavigationArrowLarge = () => (
  <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
    <Path
      d="M46.5 22.7962C46.4942 23.4301 46.2872 24.0456 45.906 24.5521C45.5249 25.0586 44.991 25.4289 44.3829 25.6089L44.3455 25.62L29.7206 29.7148L25.6258 44.3401L25.6147 44.3774C25.4346 44.9852 25.0644 45.5189 24.5575 45.9C24.0511 46.2812 23.4356 46.4894 22.8018 46.4942H22.7455C22.1241 46.5 21.5165 46.3099 21.0093 45.951C20.5021 45.5921 20.1209 45.0818 19.92 44.4936L7.6875 11.5142C7.68551 11.5065 7.68403 11.4985 7.68309 11.4904C7.51528 10.9533 7.48515 10.3818 7.59512 9.83052C7.70509 9.27934 7.95116 8.76644 8.31071 8.34091C8.67025 7.91539 9.13148 7.59309 9.65238 7.40575C10.1733 7.21841 10.7369 7.17271 11.283 7.27265L11.3063 7.28021L44.2994 19.9142C44.9566 20.1184 45.5329 20.5283 45.9528 21.0867C46.3726 21.6451 46.6175 22.3252 46.5525 23.0056L46.5 22.7962Z"
      fill="#274F9C"
    />
  </Svg>
);

export default function TurnByTurnNavigationPage() {
  const router = useRouter();
  const { destination, destinationLat, destinationLng, userLat, userLng } =
    useLocalSearchParams();
  const { coords: currentLocation } = useLocation();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState<string>(
    'Starting navigation...'
  );
  const [distance, setDistance] = useState<string>('--');
  const [eta, setEta] = useState<string>('--');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [steps, setSteps] = useState<google.maps.DirectionsStep[]>([]);

  // Utility function to strip HTML from instructions
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '');
  };

  // Update user location marker when location changes
  useEffect(() => {
    if (!currentLocation || !userMarkerRef.current || !mapRef.current) return;

    const newPosition = {
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
    };

    // Update marker position
    userMarkerRef.current.setPosition(newPosition);
    
    // Get heading (direction user is facing) - default to 0 if not available
    const heading = currentLocation.heading ?? 0;

    // Smoothly update camera with navigation-style view
    // Use setCenter, setHeading, setTilt, and setZoom individually
    // as moveCamera doesn't support all options in JavaScript API
    mapRef.current.panTo(newPosition);
    mapRef.current.setZoom(19); // Very close zoom for navigation
    
    // Set heading if available (rotates map to match direction)
    if (heading !== null && heading !== undefined) {
      mapRef.current.setHeading(heading);
    }
    
    // Try to set tilt (may not work if 45° imagery unavailable)
    mapRef.current.setTilt(45);

    // Check if we need to update the current step
    if (steps.length > 0 && currentStepIndex < steps.length) {
      const currentStep = steps[currentStepIndex];
      const stepEndLocation = currentStep.end_location;
      
      // Calculate distance to step end
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(newPosition),
        stepEndLocation
      );

      // If within 20 meters of step end, move to next step
      if (distance < 20 && currentStepIndex < steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setCurrentInstruction(steps[nextIndex].instructions);
      }
    }
  }, [currentLocation, steps, currentStepIndex]);

  // Load Google Maps Navigation SDK
  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (typeof window === 'undefined') return;

      // Check if already loaded
      if (window.google?.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${Env.GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.defer = true;

      script.addEventListener('load', () => {
        initializeMap();
      });

      script.addEventListener('error', () => {
        console.error('Failed to load Google Maps');
      });

      document.head.appendChild(script);
    };

    loadGoogleMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeMap = () => {
    if (!mapContainerRef.current || !window.google) return;

    const userLocation = {
      lat: parseFloat(userLat as string) || (currentLocation?.latitude ?? 1.2966),
      lng: parseFloat(userLng as string) || (currentLocation?.longitude ?? 103.7704),
    };

    const destLocation = {
      lat: parseFloat(destinationLat as string),
      lng: parseFloat(destinationLng as string),
    };

    // Create map instance with navigation-style settings
    const map = new google.maps.Map(mapContainerRef.current, {
      center: userLocation,
      zoom: 18, // Close zoom for navigation view
      heading: currentLocation?.heading ?? 0, // Initial heading from user's direction
      tilt: 45, // Angled perspective for better street view
      mapTypeId: 'roadmap', // Use roadmap with 45° imagery
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: false,
      rotateControl: true, // Allow user to adjust heading
      gestureHandling: 'greedy', // More responsive to gestures
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    mapRef.current = map;

    // Wait for map to be idle, then set tilt and heading
    // This ensures 45° imagery is loaded if available
    google.maps.event.addListenerOnce(map, 'idle', () => {
      // Force set tilt and heading after map loads
      map.setTilt(45);
      if (currentLocation?.heading) {
        map.setHeading(currentLocation.heading);
      }
    });

    // Add user location marker with custom blue dot
    userMarkerRef.current = new google.maps.Marker({
      position: userLocation,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    });

    // Get directions
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true, // Hide default A/B markers
      polylineOptions: {
        strokeColor: '#274F9C',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });

    directionsService.route(
      {
        origin: userLocation,
        destination: destLocation,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          
          const route = result.routes[0];
          const leg = route.legs[0];
          
          setDistance(leg.distance?.text || '--');
          setEta(leg.duration?.text || '--');
          setSteps(leg.steps);
          
          if (leg.steps.length > 0) {
            setCurrentInstruction(leg.steps[0].instructions);
          }

          setIsMapLoaded(true);
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FocusAwareStatusBar />
      <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#211F26',
              }}
            >
              Navigation to {destination}
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <XIcon />
          </Pressable>
        </View>

          {/* Map Container */}
          <View style={{ flex: 1, position: 'relative' }}>
            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#E8EAF6',
              }}
            />

            {/* Navigation Instructions Overlay */}
            {isMapLoaded && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  paddingHorizontal: 20,
                  paddingVertical: 24,
                  borderBottomLeftRadius: 20,
                  borderBottomRightRadius: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                {/* Current Instruction */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <NavigationArrowLarge />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: '#211F26',
                        marginBottom: 4,
                      }}
                    >
                      {stripHtml(currentInstruction)}
                    </Text>
                  </View>
                </View>

                {/* Trip Info */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#E5E5E5',
                    gap: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#737373',
                      }}
                    >
                      Distance:
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#211F26',
                      }}
                    >
                      {distance}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#737373',
                      }}
                    >
                      ETA:
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#274F9C',
                      }}
                    >
                      {eta}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Loading Indicator */}
            {!isMapLoaded && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: '#274F9C',
                    fontWeight: '500',
                  }}
                >
                  Loading navigation...
                </Text>
              </View>
            )}
          </View>
        </View>
    </View>
  );
}
