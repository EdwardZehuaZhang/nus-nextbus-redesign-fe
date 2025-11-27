import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { getPlaceAutocomplete } from '@/api/google-maps/places';
import type { PlaceAutocompleteResult } from '@/api/google-maps/types';
import { type BusStation, searchBusStations } from '@/lib/bus-stations';
import { type LocationCoords } from '@/lib/hooks/use-location';

// MapPin component - consistent across all pages
const MapPin = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 1.25C8.17727 1.25207 6.42979 1.97706 5.14092 3.26592C3.85206 4.55479 3.12707 6.30227 3.125 8.125C3.125 14.0078 9.375 18.4508 9.64141 18.6367C9.74649 18.7103 9.87169 18.7498 10 18.7498C10.1283 18.7498 10.2535 18.7103 10.3586 18.6367C10.625 18.4508 16.875 14.0078 16.875 8.125C16.8729 6.30227 16.1479 4.55479 14.8591 3.26592C13.5702 1.97706 11.8227 1.25207 10 1.25ZM10 5.625C10.4945 5.625 10.9778 5.77162 11.3889 6.04633C11.8 6.32103 12.1205 6.71148 12.3097 7.16829C12.4989 7.62511 12.5484 8.12777 12.452 8.61273C12.3555 9.09768 12.1174 9.54314 11.7678 9.89277C11.4181 10.2424 10.9727 10.4805 10.4877 10.577C10.0028 10.6734 9.50011 10.6239 9.04329 10.4347C8.58648 10.2455 8.19603 9.92505 7.92133 9.51393C7.64662 9.1028 7.5 8.61945 7.5 8.125C7.5 7.46196 7.76339 6.82607 8.23223 6.35723C8.70107 5.88839 9.33696 5.625 10 5.625Z"
      fill="#274F9C"
    />
  </Svg>
);

interface SearchResultsProps {
  searchText: string;
  userLocation: LocationCoords | null;
  onBusStationPress: (station: BusStation) => void;
  onGooglePlacePress: (place: PlaceAutocompleteResult) => void;
  containerClassName?: string;
  useStyleProp?: boolean; // For navigation page compatibility
}

// eslint-disable-next-line max-lines-per-function
export const SearchResults: React.FC<SearchResultsProps> = ({
  searchText,
  userLocation,
  onBusStationPress,
  onGooglePlacePress,
  containerClassName = '',
  useStyleProp = false,
}) => {
  const [busResults, setBusResults] = useState<BusStation[]>([]);
  const [googlePlaceResults, setGooglePlaceResults] = useState<
    PlaceAutocompleteResult[]
  >([]);

  // Handle search input changes with Google Maps API + local bus stations
  useEffect(() => {
    if (searchText.trim().length > 0) {
      // Search local bus stations
      const busStationResults = searchBusStations(searchText);
      setBusResults(busStationResults);

      // Search Google Places API for other locations via backend
      const searchPlaces = async () => {
        try {
          console.log('[SHARED SEARCH] 🔍 Searching with input:', searchText);

          // Calculate location bias if user location is available
          let location: { lat: number; lng: number } | undefined;
          let radius: number | undefined;

          if (userLocation?.latitude && userLocation?.longitude) {
            location = {
              lat: userLocation.latitude,
              lng: userLocation.longitude,
            };
            radius = 10000; // 10km radius in meters
          }

          // Call backend API for autocomplete
          const data = await getPlaceAutocomplete(
            searchText,
            undefined, // sessiontoken
            location,
            radius
          );

          if (data.predictions && data.predictions.length > 0) {
            // Backend returns the standard autocomplete format
            const convertedResults: PlaceAutocompleteResult[] =
              data.predictions.map((prediction: any) => ({
                description: prediction.description || '',
                matched_substrings: prediction.matched_substrings || [],
                place_id: prediction.place_id || '',
                reference: prediction.reference || prediction.place_id || '',
                structured_formatting: {
                  main_text: prediction.structured_formatting?.main_text || '',
                  main_text_matched_substrings:
                    prediction.structured_formatting
                      ?.main_text_matched_substrings || [],
                  secondary_text:
                    prediction.structured_formatting?.secondary_text || '',
                },
                terms: prediction.terms || [],
                types: prediction.types || [],
              }));

            setGooglePlaceResults(convertedResults.slice(0, 5)); // Limit to 5 results
          } else {
            setGooglePlaceResults([]);
          }
        } catch (error) {
          console.error('[SHARED SEARCH] ❌ Places API Error:', error);
          setGooglePlaceResults([]);
        }
      };

      searchPlaces();
    } else {
      setBusResults([]);
      setGooglePlaceResults([]);
    }
  }, [searchText, userLocation]);

  const renderIconContainer = (children: React.ReactNode) => {
    if (useStyleProp) {
      return (
        <View
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 18,
            backgroundColor: '#F5F5F5',
            padding: 8,
          }}
        >
          {children}
        </View>
      );
    }

    return (
      <View className="size-9 items-center justify-center rounded-full bg-neutral-100 p-2">
        {children}
      </View>
    );
  };

  const renderBusStationItem = (item: BusStation, index: number) => {
    const IconComponent = item.icon;

    if (useStyleProp) {
      return (
        <Pressable
          key={item.id}
          onPress={() => onBusStationPress(item)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 12,
            borderBottomWidth: index < busResults.length - 1 ? 1 : 0,
            borderBottomColor: '#E5E5E5',
          }}
        >
          {renderIconContainer(
            <IconComponent style={{ width: 20, height: 20 }} />
          )}
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '500',
              color: '#211F26',
            }}
          >
            {item.name}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={item.id}
        onPress={() => onBusStationPress(item)}
        className={`flex-row items-center gap-3 py-3 ${
          index < busResults.length - 1 ? 'border-b border-neutral-200' : ''
        }`}
      >
        {renderIconContainer(<IconComponent className="size-5" />)}
        <View className="flex-1">
          <Text className="text-base font-medium text-neutral-900">
            {item.name}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderGooglePlaceItem = (
    place: PlaceAutocompleteResult,
    index: number
  ) => {
    if (useStyleProp) {
      return (
        <Pressable
          key={place.place_id}
          onPress={() => onGooglePlacePress(place)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 12,
            borderBottomWidth: index < googlePlaceResults.length - 1 ? 1 : 0,
            borderBottomColor: '#E5E5E5',
          }}
        >
          {renderIconContainer(<MapPin />)}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: '#211F26',
              }}
            >
              {place.structured_formatting.main_text}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#737373',
                marginTop: 2,
              }}
            >
              {place.structured_formatting.secondary_text}
            </Text>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={place.place_id}
        onPress={() => onGooglePlacePress(place)}
        className={`flex-row items-center gap-3 py-3 ${
          index < googlePlaceResults.length - 1
            ? 'border-b border-neutral-200'
            : ''
        }`}
      >
        {renderIconContainer(<MapPin />)}
        <View className="flex-1">
          <Text className="text-base font-medium text-neutral-900">
            {place.structured_formatting.main_text}
          </Text>
          <Text className="text-sm text-neutral-500">
            {place.structured_formatting.secondary_text}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderSectionTitle = (title: string, count: number) => {
    if (useStyleProp) {
      return (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: '#737373',
            marginBottom: 12,
          }}
        >
          {title} ({count})
        </Text>
      );
    }

    return (
      <Text
        className="mb-3 text-sm font-medium text-neutral-500"
        style={{ fontFamily: 'Inter' }}
      >
        {title} ({count})
      </Text>
    );
  };

  const renderNoResults = () => {
    if (useStyleProp) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 16, color: '#737373' }}>
            No results found for &quot;{searchText}&quot;
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: '#A3A3A3',
              textAlign: 'center',
            }}
          >
            Try searching with different keywords
          </Text>
        </View>
      );
    }

    return (
      <View className="items-center py-8">
        <Text className="text-base text-neutral-500">
          No results found for &quot;{searchText}&quot;
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-400">
          Try searching with different keywords
        </Text>
      </View>
    );
  };

  return (
    <View className={containerClassName}>
      {/* Bus Stops Results */}
      {busResults.length > 0 && (
        <View style={{ marginBottom: googlePlaceResults.length > 0 ? 16 : 0 }}>
          {renderSectionTitle('Bus Stops', busResults.length)}
          {busResults.map((item, index) => renderBusStationItem(item, index))}
        </View>
      )}

      {/* Google Places Results */}
      {googlePlaceResults.length > 0 && (
        <View>
          {renderSectionTitle('Other Locations', googlePlaceResults.length)}
          {googlePlaceResults.map((place, index) =>
            renderGooglePlaceItem(place, index)
          )}
        </View>
      )}

      {/* No results message */}
      {busResults.length === 0 &&
        googlePlaceResults.length === 0 &&
        searchText.trim().length > 0 &&
        renderNoResults()}
    </View>
  );
};
