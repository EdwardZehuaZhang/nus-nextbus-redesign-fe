import { router, usePathname } from 'expo-router';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Animated, TextInput, Keyboard, Platform, Dimensions, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { storage } from '@/lib/storage';

import {
  calculateDistance,
  formatArrivalTime,
  formatDistance,
  getRouteColor,
  passengerLoadToCrowding,
  sortShuttlesByArrival,
  useBusStops,
  useServiceDescriptions,
  useShuttleService,
} from '@/api';

import { getPlaceDetails } from '@/api/google-maps/places';
import type { PlaceAutocompleteResult } from '@/api/google-maps/types';
import { Frame } from '@/components/frame';
import { InteractiveMap, type MapSelection } from '@/components/interactive-map';
import { MapTypeSelector } from '@/components/map-type-selector';
import { SportsAndPrintersBubbles } from '@/components/sports-printers-bubbles';
import {
  FocusAwareStatusBar,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useModal,
  View,
} from '@/components/ui';
import {
  AvgCapacityIcon,
  BookOpen,
  BriefcaseIcon,
  FirstAid,
  HouseIcon,
  MaxCapacityIcon,
  MinCapacityIcon,
  PlusIcon,
  Search as SearchIcon,
  Train,
  Van,
} from '@/components/ui/icons';

import { SearchResults } from '@/components/shared-search';
import {
  type BusStation,
  getBusStationById,
} from '@/lib/bus-stations';
import { type LocationCoords, useLocation } from '@/lib/hooks/use-location';
import {
  type FavoriteRoute,
  getFavorites,
  updateFavoriteLabel,
} from '@/lib/storage/favorites';
import {
  addRecentSearch,
  getRecentSearches,
} from '@/lib/storage/recent-searches';


type BusRoute = {
  route: string;
  color: string;
  isPublicBus?: boolean;
  times: {
    time: string;
    crowding: 'low' | 'medium' | 'high';
    textColor?: string;
  }[];
};

type TabItem = {
  id: string;
  label: string;
};

type RecentSearchItem = {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
};

type PopularSearchItem = {
  id: string;
  title: string;
  image: string;
};

const popularSearches: PopularSearchItem[] = [
  {
    id: '1',
    title: 'UTown\n#NUS Sign',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/b856d37c98b5af1af81ac3776772df08e3da947a?width=308',
  },
  {
    id: '2',
    title: 'Lee Kong Chian Natural History Museum',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/3a44d7def88d02e89437d93d830cf08200a94a57?width=308',
  },
  {
    id: '3',
    title: 'UTown Infinite Pool',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '4',
    title: 'Science Library',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '5',
    title: 'Kent Ridge MRT',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '6',
    title: 'Central Library',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '7',
    title: 'Engineering Library',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '8',
    title: 'COM3 Building',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
];

const CrowdingIndicator = ({
  crowding,
}: {
  crowding: 'low' | 'medium' | 'high';
}) => {
  const getCapacityIcon = () => {
    // Use fixed size - icons will scale naturally with flex
    const iconWidth = 32;
    const iconHeight = 24;

    switch (crowding) {
      case 'low':
        return <MinCapacityIcon width={iconWidth} height={iconHeight} />;
      case 'medium':
        return <AvgCapacityIcon width={iconWidth} height={iconHeight} />;
      case 'high':
        return <MaxCapacityIcon width={iconWidth} height={iconHeight} />;
      default:
        return <MinCapacityIcon width={iconWidth} height={iconHeight} />;
    }
  };

  return (
    <View
      className="flex-row items-center justify-center"
      style={{ flexShrink: 0, minWidth: 32 }}
    >
      {getCapacityIcon()}
    </View>
  );
};

// Calculate optimal font size based on text length and container width
const calculateFontSize = (
  textLength: number,
  containerWidth: number,
  currentFontSize: number
): number => {
  const estimatedTextWidth = textLength * currentFontSize * 0.6;
  if (estimatedTextWidth > containerWidth * 0.95) {
    const scale = (containerWidth * 0.95) / estimatedTextWidth;
    return Math.max(10.4, Math.min(16, currentFontSize * scale));
  }
  return currentFontSize < 16 ? 16 : currentFontSize;
};

// Dynamic font size component for bus timing
const DynamicBusTime = ({
  time,
  textColor,
}: {
  time: string;
  textColor?: string;
}) => {
  const [fontSize, setFontSize] = React.useState(16);
  const containerRef = React.useRef<any>(null);
  const lastCalculatedSizeRef = React.useRef<number>(16);

  React.useEffect(() => {
    if (containerRef.current && typeof window !== 'undefined') {
      const measureContainer = () => {
        try {
          containerRef.current?.measure?.(
            (_x: number, _y: number, width: number) => {
              if (width > 0) {
                const newSize = calculateFontSize(time.length, width, 16);
                // Only update if the change is significant (> 0.5px) to prevent oscillation
                if (Math.abs(newSize - lastCalculatedSizeRef.current) > 0.5) {
                  lastCalculatedSizeRef.current = newSize;
                  setFontSize(newSize);
                }
              }
            }
          );
        } catch {
          const element = containerRef.current as HTMLElement;
          if (element?.offsetWidth) {
            const newSize = calculateFontSize(
              time.length,
              element.offsetWidth,
              16
            );
            // Only update if the change is significant (> 0.5px) to prevent oscillation
            if (Math.abs(newSize - lastCalculatedSizeRef.current) > 0.5) {
              lastCalculatedSizeRef.current = newSize;
              setFontSize(newSize);
            }
          }
        }
      };

      const timer = setTimeout(measureContainer, 50);
      return () => clearTimeout(timer);
    }
  }, [time]); // Removed fontSize from dependencies to prevent infinite loop

  return (
    <View
      ref={containerRef}
      style={{
        flex: 1,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: fontSize,
          fontWeight: '500',
          fontFamily: 'Inter',
        }}
      >
        {time}
      </Text>
    </View>
  );
};

const BusRouteCard = ({
  route,
  isSelected = false,
  onPress,
}: {
  route: BusRoute;
  isSelected?: boolean;
  onPress?: () => void;
}) => {
  const isDisabled = route.isPublicBus;
  
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={{
        flex: 1,
        transform: isSelected ? [{ scale: 1.05 }] : [{ scale: 1 }],
      }}
    >
      <View
        style={{
          position: 'relative',
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          borderWidth: 1,
          borderColor: '#e5e5e5',
          borderTopWidth: 0,
        }}
      >
        {/* Selection indicator overlay - doesn't affect layout */}
        {isSelected && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 3,
              borderColor: route.color,
              borderRadius: 6,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
        
        {/* Route Header */}
        <View
          className="h-8 items-center justify-center shadow-sm"
          style={{ 
            backgroundColor: route.color,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            overflow: 'hidden',
          }}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: '#FFFFFF', fontFamily: 'Inter', fontWeight: '600' }}
          >
            {route.route}
          </Text>
        </View>

        {/* Times List - Only show first 2 times (next bus and next next bus) */}
        <BusTimingRows times={route.times.slice(0, 2)} />
      </View>
    </Pressable>
  );
};

const BusTimingRows = ({ times }: { times: BusRoute['times'] }) => {
  // Filter out N/A times to hide entire rows
  const validTimes = times.filter((timeItem) => timeItem.time !== 'N/A');
  
  return (
    <View
      style={{
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
        overflow: 'hidden',
      }}
    >
      {validTimes.map((timeItem, index) => {
        const isLast = index === validTimes.length - 1;
        return (
          <View 
            key={`timing-${index}`}
            style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: isLast ? 0 : 1,
              borderColor: '#e5e5e5',
            }}
          >
            <DynamicBusTime
              time={timeItem.time}
              textColor={timeItem.textColor}
            />
            <CrowdingIndicator crowding={timeItem.crowding} />
          </View>
        );
      })}
    </View>
  );
};

const SearchBar = ({ onSearchPress }: { onSearchPress?: () => void }) => {
  const [searchText, setSearchText] = React.useState('');
  const textInputRef = React.useRef<any>(null);

  const handleFocus = () => {
    // Trigger search mode when user focuses on search
    console.log('[SEARCH BAR] ⌨️ TextInput focused - keyboard should appear');
    if (onSearchPress) {
      onSearchPress();
    }
  };

  const handleContainerPress = () => {
    console.log('[SEARCH BAR] 🖱️ Container pressed - focusing input');
    if (onSearchPress) {
      onSearchPress();
    }
    // Delay focus slightly to ensure search mode animation completes
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 100);
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 shadow-sm" style={{ height: 40 }}>
        <SearchIcon />
        <TextInput
          ref={textInputRef}
          placeholder="Search for location..."
          placeholderTextColor="#737373"
          value={searchText}
          onChangeText={setSearchText}
          onFocus={handleFocus}
          editable={true}
          keyboardType="default"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit={false}
          style={{
            flex: 1,
            fontSize: 16,
            color: '#09090B',
            height: 40,
            paddingVertical: 0,
            paddingHorizontal: 0,
            margin: 0,
            textAlignVertical: 'center', // Android centering
            includeFontPadding: false as any, // Android typography padding
            lineHeight: 20, // match text-base (~16) with comfortable line height
            transform: [{ translateY: 2 }], // slight downward nudge for proper alignment
            outlineWidth: 0,
            // @ts-ignore - Web-specific properties to remove Safari focus outline
            outlineStyle: 'none',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
          } as any}
        />
      </View>
    </View>
  );
};

// Helper components for SearchContent
const RecentSearchCard = ({
  item,
  isLast,
  onPress,
}: {
  item: RecentSearchItem;
  isLast: boolean;
  onPress: () => void;
}) => {
  const IconComponent = item.icon;
  return (
    <View>
      <Pressable className="flex-row items-center gap-2 py-2" onPress={onPress}>
        <View className="size-9 items-center justify-center rounded-full bg-neutral-100 p-2">
          <IconComponent className="size-5" />
        </View>
        <Text className="flex-1 text-base font-medium text-neutral-900">
          {item.title}
        </Text>
      </Pressable>
      {!isLast && <View className="my-2 h-px w-full bg-neutral-200" />}
    </View>
  );
};


const PopularSearchCard = ({
  item,
  showAllPopular,
  onPress,
}: {
  item: PopularSearchItem;
  showAllPopular: boolean;
  onPress: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={showAllPopular ? { flex: 1 } : { flex: 1, minWidth: 150 }}
    >
      <View className="relative h-[116px] overflow-hidden rounded-md">
        <Image
          source={{ uri: item.image }}
          contentFit="cover"
          className="absolute inset-0 size-full"
          style={{ borderRadius: '6px' }}
          placeholder={undefined}
        />
        <View className="absolute inset-x-0 bottom-0 p-3">
          <Text className="text-lg font-bold leading-tight text-white">
            {item.title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const ActionButtons = () => {
  return null; // MapTypeSelector is now rendered in InteractiveMap component
};

const TabBar = ({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) => {
  return (
    <View className="flex-row">
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <View
            key={tab.id}
            className="flex-row"
            style={
              isActive
                ? { flexShrink: 0 }
                : { flexShrink: 1, maxWidth: '100%', minWidth: 0 }
            }
          >
            <Pressable
              className={`border-neutral-200 px-4 py-2 ${
                isActive
                  ? 'rounded-t-md border-x border-b-0 border-t bg-white'
                  : 'rounded-tr-md border-y border-r bg-white opacity-60'
              } ${index === 0 ? 'border-l' : ''}`}
              onPress={() => onTabChange(tab.id)}
              style={!isActive ? { maxWidth: '100%' } : undefined}
            >
              <Text
                className={`text-base ${
                  isActive
                    ? 'font-medium text-neutral-900'
                    : 'font-normal text-neutral-500'
                }`}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={!isActive ? { maxWidth: '100%' } : undefined}
              >
                {tab.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

const FavoriteButton = ({
  item,
  userLocation,
  onUpdate,
}: {
  item: FavoriteRoute;
  userLocation: LocationCoords | null;
  onUpdate: () => void;
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(
    item.to ? `${item.from} - ${item.to}` : item.from
  );
  const inputRef = React.useRef<TextInput>(null);
  const hasSelectedText = React.useRef(false);

  // Update editText when item changes
  React.useEffect(() => {
    setEditText(item.to ? `${item.from} - ${item.to}` : item.from);
  }, [item.from, item.to]);

  const renderIcons = () => {
    if (item.icon === 'home-work') {
      return (
        <View className="flex-row items-center gap-2.5 rounded-full bg-neutral-100 p-2">
          <HouseIcon width={20} height={20} fill="#274F9C" />
          <BriefcaseIcon width={20} height={20} fill="#274F9C" />
        </View>
      );
    } else if (item.icon === 'home') {
      return (
        <View className="flex items-center justify-center rounded-full bg-neutral-100 p-2">
          <HouseIcon width={20} height={20} fill="#274F9C" />
        </View>
      );
    } else if (item.icon === 'work') {
      return (
        <View className="flex items-center justify-center rounded-full bg-neutral-100 p-2">
          <BriefcaseIcon width={20} height={20} fill="#274F9C" />
        </View>
      );
    } else {
      // Default icon when no icon is set
      return (
        <View className="flex items-center justify-center rounded-full bg-neutral-100 p-2">
          <Train width={20} height={20} fill="#274F9C" />
        </View>
      );
    }
  };

  const handlePress = () => {
    // Don't navigate if we're editing
    if (isEditing) {
      return;
    }
    // Navigate to navigation page with the route and user location
    router.push({
      pathname: '/(app)/navigation',
      params: {
        customOrigin: item.fromId,
        destination: item.toId,
        userLat: userLocation?.latitude?.toString(),
        userLng: userLocation?.longitude?.toString(),
      },
    });
  };

  const handleTextPress = (e: any) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  // Select all text when entering edit mode (only once)
  React.useEffect(() => {
    if (isEditing && inputRef.current && !hasSelectedText.current) {
      hasSelectedText.current = true;
      // Small delay to ensure the input is focused first
      setTimeout(() => {
        const currentText = editText;
        inputRef.current?.setNativeProps?.({
          selection: { start: 0, end: currentText.length },
        });
        // For web, use the DOM API
        if (typeof window !== 'undefined') {
          const input = inputRef.current as any;
          if (input?.select) {
            input.select();
          }
        }
      }, 100);
    }
    // Reset the flag when exiting edit mode
    if (!isEditing) {
      hasSelectedText.current = false;
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (!editText.trim()) {
      // If empty, just cancel edit
      setIsEditing(false);
      setEditText(item.to ? `${item.from} - ${item.to}` : item.from);
      return;
    }

    // Save the entire text as the label - split by dash if present, otherwise use as single label
    const trimmedText = editText.trim();
    const dashIndex = trimmedText.indexOf('-');
    
    if (dashIndex > 0) {
      // Has a dash separator - split into from and to
      const from = trimmedText.substring(0, dashIndex).trim();
      const to = trimmedText.substring(dashIndex + 1).trim();
      updateFavoriteLabel(item.id, from, to || item.to);
    } else {
      // No dash - use entire text as "from" and empty string as "to"
      updateFavoriteLabel(item.id, trimmedText, '');
    }
    
    setIsEditing(false);
    onUpdate(); // Refresh the favorites list
  };

  return (
    <Pressable
      className="min-w-[64px] max-w-[140px] flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm"
      onPress={handlePress}
      disabled={isEditing}
    >
      {renderIcons()}
      {isEditing ? (
        <View className="w-full" style={{ height: 36 }}>
          <TextInput
            ref={inputRef}
            value={editText}
            onChangeText={setEditText}
            onBlur={handleSaveEdit}
            onSubmitEditing={handleSaveEdit}
            autoFocus
            multiline
            numberOfLines={2}
            style={{
              color: '#274F9C',
              fontSize: 14,
              fontWeight: '500',
              textAlign: 'center',
              lineHeight: 18,
              height: 36,
              width: '100%',
              paddingVertical: 0,
              paddingHorizontal: 0,
              fontFamily: 'Inter',
              outline: 'none',
            }}
            className="w-full text-center"
          />
        </View>
      ) : (
        <View style={{ height: 36, width: '100%' }}>
          <Pressable onPress={handleTextPress}>
            <Text
              className="text-center text-sm font-medium"
              style={{ color: '#274F9C', lineHeight: 18 }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.to ? `${item.from} - ${item.to}` : item.from}
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

const AddButton = ({ onSearchPress }: { onSearchPress: () => void }) => {
  return (
    <Pressable
      className="size-12 items-center justify-center self-center"
      onPress={onSearchPress}
    >
      <PlusIcon width={20} height={20} fill="#274F9C" />
    </Pressable>
  );
};

const FavoritesSection = ({ onSearchPress }: { onSearchPress: () => void }) => {
  const [favorites, setFavorites] = React.useState<FavoriteRoute[]>([]);
  
  // Get user's current location to pass to navigation
  const { coords: userLocation } = useLocation();

  // Load favorites from storage
  const loadFavorites = React.useCallback(() => {
    const stored = getFavorites();
    setFavorites(stored);
  }, []);

  React.useEffect(() => {
    loadFavorites();

    // Set up an interval to refresh favorites (in case they're added from another screen)
    const interval = setInterval(loadFavorites, 1000);

    return () => clearInterval(interval);
  }, [loadFavorites]);

  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-neutral-500" style={{ fontFamily: 'Inter' }}>
        Favourites
      </Text>
      {favorites.length === 0 ? (
        <View className="rounded-2xl p-4">
          <Text className="text-center text-sm text-neutral-400">
            No favourites added yet
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {favorites.map((item) => (
            <FavoriteButton
              key={item.id}
              item={item}
              userLocation={userLocation}
              onUpdate={loadFavorites}
            />
          ))}
          <AddButton onSearchPress={onSearchPress} />
        </ScrollView>
      )}
    </View>
  );
};

/* eslint-disable max-lines-per-function */
const NearestStopsSection = ({
  activeTab,
  onTabChange,
  selectedRoute,
  onRouteClick,
}: {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  selectedRoute: string | null;
  onRouteClick: (routeName: string) => void;
}) => {
  // Get user's current location
  const { coords: userLocation, error: locationError, loading: locationLoading } = useLocation();

  // Log user location when homepage loads
  React.useEffect(() => {
    console.log('🏠 Homepage (Transit) Loaded - User Location:');
    if (locationLoading) {
      console.log('   Status: Loading location...');
    } else if (locationError) {
      console.log('   Status: Error -', locationError);
      console.log('   Will use fallback location (SDE3)');
    } else if (userLocation) {
      console.log('   ✅ GPS Location:', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
    } else {
      console.log('   Status: No location available yet');
    }
  }, [userLocation, locationError, locationLoading]);

  // Fallback to SDE3 coordinates if geolocation fails
  const SDE3_FALLBACK_COORDS: LocationCoords = {
    latitude: 1.2976164142477022,
    longitude: 103.77048361789565,
  };

  // Use actual location if available, otherwise fall back to SDE3
  const effectiveLocation = userLocation || (locationError ? SDE3_FALLBACK_COORDS : null);

  // Fetch all bus stops from the API
  const { data: busStopsData } = useBusStops();

  // Calculate nearest stops based on user location
  const nearestStops = React.useMemo(() => {
    if (!effectiveLocation || !busStopsData?.BusStopsResult?.busstops) {
      // Return empty array if no location - we'll show error message instead
      return [];
    }

    const stops = busStopsData.BusStopsResult.busstops
      .map((stop) => {
        const distance = calculateDistance({
          lat1: effectiveLocation.latitude,
          lon1: effectiveLocation.longitude,
          lat2: stop.latitude,
          lon2: stop.longitude,
        });

        return {
          id: stop.name, // Use 'name' field (API code like 'YIH', 'CLB', 'UHC-OPP') for ShuttleService endpoint
          label: `${stop.ShortName} (${formatDistance(distance)})`,
          distance,
        };
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 2); // Get the 2 nearest stops

    return stops;
  }, [effectiveLocation, busStopsData]);

  // Update activeTab when nearest stops change (only if current tab is not in nearest stops)
  React.useEffect(() => {
    if (
      nearestStops.length > 0 &&
      !nearestStops.find((s) => s.id === activeTab)
    ) {
      onTabChange(nearestStops[0].id);
    }
  }, [nearestStops, activeTab, onTabChange]);

  // Fetch shuttle service data for the active bus stop
  const { data: shuttleData, isLoading } = useShuttleService(activeTab);

  // Fetch service descriptions to get route colors
  const { data: serviceDescriptions } = useServiceDescriptions();

  // Create a color map from service descriptions
  const colorMap = React.useMemo(() => {
    if (!serviceDescriptions?.ServiceDescriptionResult?.ServiceDescription) {
      return {};
    }

    return serviceDescriptions.ServiceDescriptionResult.ServiceDescription.reduce(
      (map, service) => {
        map[service.Route] = service.Color;
        return map;
      },
      {} as Record<string, string>
    );
  }, [serviceDescriptions]);

  // Transform API data to match the BusRoute format
  const currentBusRoutes: BusRoute[] = React.useMemo(() => {
    if (!shuttleData?.ShuttleServiceResult?.shuttles) {
      return [];
    }

    // Sort shuttles by arrival time (closest first)
    const sortedShuttles = sortShuttlesByArrival(
      shuttleData.ShuttleServiceResult.shuttles
    );

    return sortedShuttles
      .map((shuttle) => {
        // Remove "PUB:" prefix from public bus routes and convert to uppercase
        const routeName = shuttle.name.replace(/^PUB:/, '').toUpperCase();

        // Use special color for public buses, otherwise use route color
        const isPublicBus = shuttle.name.startsWith('PUB:');
        const routeColor = isPublicBus
          ? '#55DD33'
          : getRouteColor(shuttle.name, colorMap[shuttle.name]);

        return {
          route: routeName,
          color: routeColor,
          isPublicBus: isPublicBus,
          times: [
            {
              time: formatArrivalTime(shuttle.arrivalTime),
              crowding: passengerLoadToCrowding(shuttle.passengers),
              textColor: '#211F26',
            },
            {
              time: formatArrivalTime(shuttle.nextArrivalTime),
              crowding: passengerLoadToCrowding(shuttle.nextPassengers),
              textColor: '#737373',
            },
          ],
        };
      })
      .filter((route) => {
        // Filter out routes where all timings are N/A
        const hasValidTiming = route.times.some((t) => t.time !== 'N/A');
        return hasValidTiming;
      });
  }, [shuttleData, colorMap]);

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-medium text-neutral-500" style={{ fontFamily: 'Inter' }}>
        Nearest Stops
      </Text>

      {nearestStops.length === 0 ? (
        <View className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <View className="items-center">
            <Text className="mb-2 text-center text-base font-semibold text-neutral-700">
              Location Unavailable
            </Text>
            <Text className="text-center text-sm text-neutral-500">
              {locationLoading
                ? 'Getting your location...'
                : locationError
                  ? `Error: ${locationError}`
                  : 'Unable to determine your location. Please enable location services in your browser.'}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <TabBar
            tabs={nearestStops}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />

          <View className="rounded-b-md border border-t-0 border-neutral-200 bg-white p-2 shadow-sm">
            {isLoading ? (
              <View className="items-center py-8">
                <Text className="text-sm text-neutral-500">
                  Loading bus data...
                </Text>
              </View>
            ) : currentBusRoutes.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-sm text-neutral-500">No buses available</Text>
              </View>
            ) : (
              <View className="gap-2">
                <View className="flex-row gap-2">
                  {currentBusRoutes.slice(0, 3).map((route) => (
                    <BusRouteCard
                      key={route.route}
                      route={route}
                      isSelected={selectedRoute === route.route}
                      onPress={() => onRouteClick(route.route)}
                    />
                  ))}
                  {currentBusRoutes.length < 3 &&
                    Array.from({ length: 3 - currentBusRoutes.length }).map(
                      (_, i) => <View key={`empty-${i}`} className="flex-1" />
                    )}
                </View>
                {currentBusRoutes.length > 3 && (
                  <View className="flex-row gap-2">
                    {currentBusRoutes.slice(3, 6).map((route) => (
                      <BusRouteCard
                        key={route.route}
                        route={route}
                        isSelected={selectedRoute === route.route}
                        onPress={() => onRouteClick(route.route)}
                      />
                    ))}
                    {currentBusRoutes.length < 6 &&
                      Array.from({
                        length: 6 - currentBusRoutes.length,
                      }).map((_, i) => (
                        <View key={`empty-row2-${i}`} className="flex-1" />
                      ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
};

/* eslint-disable max-lines-per-function */
const SearchContent = ({ onCancel }: { onCancel: () => void }) => {
  const [searchText, setSearchText] = React.useState('');
  const [recentSearches, setRecentSearches] = React.useState<
    RecentSearchItem[]
  >([]);
  const [showAllRecent, setShowAllRecent] = React.useState(false);
  const [showAllPopular, setShowAllPopular] = React.useState(false);
  const { coords: userLocation } = useLocation();

  // Load recent searches on component mount
  React.useEffect(() => {
    const loadRecentSearches = () => {
      const stored = getRecentSearches();
      const uiRecentSearches: RecentSearchItem[] = stored.map((item) => ({
        id: item.id,
        title: item.name,
        icon: getIconForType(item.type),
      }));
      setRecentSearches(uiRecentSearches);
    };

    loadRecentSearches();
  }, []);

  // Helper function to get icon component for type
  const getIconForType = (type: string) => {
    switch (type) {
      case 'mrt':
        return Train;
      case 'library':
      case 'academic':
        return BookOpen;
      case 'medical':
        return FirstAid;
      default:
        return Van;
    }
  };



  const handleResultPress = (item: BusStation) => {
    addRecentSearch(item);
    // Navigate to navigation page with user location
    router.push({
      pathname: '/navigation' as any,
      params: { 
        destination: item.name,
        userLat: userLocation?.latitude?.toString(),
        userLng: userLocation?.longitude?.toString(),
      },
    });
  };

  const handleGooglePlacePress = async (place: PlaceAutocompleteResult) => {
    console.log('[GOOGLE PLACE] 🖱️ Clicked:', place.structured_formatting.main_text);
    console.log('[GOOGLE PLACE] 📍 Place ID:', place.place_id);
    
    try {
      console.log('[GOOGLE PLACE] 🔍 Fetching place details from backend API...');
      
      // Use backend API for place details
      const placeDetailsData = await getPlaceDetails(place.place_id);
      
      if (placeDetailsData.status === 'OK' && placeDetailsData.result) {
        const placeDetails = placeDetailsData.result;
        console.log('[GOOGLE PLACE] ✅ Got details from backend:', placeDetails);
        
        const destinationLat = placeDetails.geometry?.location?.lat;
        const destinationLng = placeDetails.geometry?.location?.lng;
        
        console.log('[GOOGLE PLACE] 🧭 Coordinates:', { lat: destinationLat, lng: destinationLng });
        console.log('[GOOGLE PLACE] 🚀 Navigating to navigation page...');

        // Navigate to navigation page with place details and user location
        router.push({
          pathname: '/navigation' as any,
          params: {
            destination: place.structured_formatting.main_text,
            destinationAddress: placeDetails.formatted_address || place.description,
            destinationLat: destinationLat?.toString(),
            destinationLng: destinationLng?.toString(),
            userLat: userLocation?.latitude?.toString(),
            userLng: userLocation?.longitude?.toString(),
          },
        });
      } else {
        console.error('[GOOGLE PLACE] ❌ Backend API error:', placeDetailsData.status);
      }
    } catch (error) {
      console.error('[GOOGLE PLACE] ❌ Error getting place details:', error);
    }
  };

  const handleRecentPress = (item: RecentSearchItem) => {
    const station = getBusStationById(item.id);
    if (station) {
      addRecentSearch(station);
      router.push({
        pathname: '/navigation' as any,
        params: { 
          destination: item.title,
          userLat: userLocation?.latitude?.toString(),
          userLng: userLocation?.longitude?.toString(),
        },
      });
    }
  };

  const renderPopularItem = (item: PopularSearchItem) => {
    const handleNavPress = () => {
      router.push({
        pathname: '/navigation' as any,
        params: { 
          destination: item.title.replace('\n', ' '),
          userLat: userLocation?.latitude?.toString(),
          userLng: userLocation?.longitude?.toString(),
        },
      });
    };

    return (
      <PopularSearchCard
        key={item.id}
        item={item}
        showAllPopular={showAllPopular}
        onPress={handleNavPress}
      />
    );
  };

  const renderPopularSearches = () => {
    const displayItems = showAllPopular
      ? popularSearches
      : popularSearches.slice(0, 3);

    if (showAllPopular) {
      // Create rows with 2 items each
      const rows: PopularSearchItem[][] = [];
      for (let i = 0; i < displayItems.length; i += 2) {
        rows.push(displayItems.slice(i, i + 2));
      }

      return (
        <View className="w-full" style={{ gap: 8 }}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row" style={{ gap: 8 }}>
              {row.map((item) => renderPopularItem(item))}
            </View>
          ))}
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        style={{ marginLeft: -20, marginRight: -20, paddingLeft: 20 }}
      >
        {displayItems.map((item) => renderPopularItem(item))}
      </ScrollView>
    );
  };

  return (
    <>
      {/* Search Header */}
      <View className="mb-5 flex-row items-center gap-4">
        <View className="flex-1 flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 shadow-sm" style={{ height: 40 }}>
          <SearchIcon />
          <TextInput
            className="flex-1 text-base text-neutral-900"
            placeholder="Search for location..."
            placeholderTextColor="#737373"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus={true}
            style={{
              height: 40,
              paddingVertical: 0,
              textAlignVertical: 'center', // Android centering
              includeFontPadding: false as any, // Android typography padding
              lineHeight: 20, // match text-base (~16) with comfortable line height
              transform: [{ translateY: -2 }], // slight upward nudge to visually center
              outlineWidth: 0,
              // @ts-ignore - Web-specific properties to remove Safari focus outline
              outlineStyle: 'none',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            } as any}
          />
        </View>
        <Pressable onPress={onCancel}>
          <Text className="text-base font-medium" style={{ color: '#274F9C', fontFamily: 'Inter' }}>
            Cancel
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {searchText.trim().length > 0 ? (
          <SearchResults
            searchText={searchText}
            userLocation={userLocation}
            onBusStationPress={handleResultPress}
            onGooglePlacePress={handleGooglePlacePress}
            containerClassName="gap-4"
          />
        ) : (
          <View>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View className="mb-8">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-neutral-500" style={{ fontFamily: 'Inter' }}>
                    Recents
                  </Text>
                  <Pressable onPress={() => setShowAllRecent(!showAllRecent)}>
                    <Text
                      className="text-sm font-medium"
                      style={{ color: '#274F9C', fontFamily: 'Inter' }}
                    >
                      {showAllRecent ? 'View Less' : 'View More'}
                    </Text>
                  </Pressable>
                </View>
                {(showAllRecent
                  ? recentSearches
                  : recentSearches.slice(0, 3)
                ).map((item, index, array) => (
                  <RecentSearchCard
                    key={item.id}
                    item={item}
                    isLast={index === array.length - 1}
                    onPress={() => handleRecentPress(item)}
                  />
                ))}
              </View>
            )}

            {/* Popular Searches */}
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-neutral-500" style={{ fontFamily: 'Inter' }}>
                  Popular Searches
                </Text>
                <Pressable onPress={() => setShowAllPopular(!showAllPopular)}>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: '#274F9C', fontFamily: 'Inter' }}
                  >
                    {showAllPopular ? 'View Less' : 'View More'}
                  </Text>
                </Pressable>
              </View>
              {renderPopularSearches()}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
};

const BottomSheetContent = ({
  isCollapsed,
  isSearchMode,
  mapSelection,
  onCloseSelection,
  activeTab,
  onTabChange,
  onExpandSheet,
  onSearchPress,
  onCancelSearch,
  selectedRoute,
  onRouteClick,
}: {
  isCollapsed: boolean;
  isSearchMode: boolean;
  mapSelection: MapSelection | null;
  onCloseSelection: () => void;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onExpandSheet: () => void;
  onSearchPress: () => void;
  onCancelSearch: () => void;
  selectedRoute: string | null;
  onRouteClick: (routeName: string) => void;
}) => {
  const detailScrollRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (mapSelection) {
      detailScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    }
  }, [mapSelection]);

  if (mapSelection) {
    return (
      <MapSelectionDetails
        selection={mapSelection}
        onClose={onCloseSelection}
        scrollRef={detailScrollRef}
      />
    );
  }

  if (isSearchMode) {
    return <SearchContent onCancel={onCancelSearch} />;
  }

  return (
    <>
      <Pressable onPress={isCollapsed ? onExpandSheet : undefined}>
        <SearchBar onSearchPress={onSearchPress} />
      </Pressable>

      {!isCollapsed && (
        <>
          <NearestStopsSection
            activeTab={activeTab}
            onTabChange={onTabChange}
            selectedRoute={selectedRoute}
            onRouteClick={onRouteClick}
          />

          <FavoritesSection onSearchPress={onSearchPress} />
        </>
      )}
    </>
  );
};

/* eslint-disable max-lines-per-function */
const useDragHandlers = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isSearchMode, setIsSearchMode] = React.useState(false);
  const [containerHeight, setContainerHeight] = React.useState(45); // Start at 45%
  const [tempHeight, setTempHeight] = React.useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const translateY = React.useRef(new Animated.Value(0)).current;
  const heightAnimation = React.useRef(new Animated.Value(45)).current; // Add animated value for height
  const backdropOpacity = React.useRef(new Animated.Value(0)).current; // Add animated value for backdrop opacity
  const startHeight = React.useRef(45);
  const dragStartY = React.useRef(0);
  const dragStartTime = React.useRef(0);
  const isDragging = React.useRef(false);

  const MIN_HEIGHT = 10; // Minimum height - just search bar visible
  const MAX_HEIGHT = 92; // Maximum height - allow nearly full screen expansion for small devices
  const DEFAULT_HEIGHT = 45; // Default state

  // Listen for keyboard events
  React.useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const kbHeight = e.endCoordinates.height;
        setKeyboardHeight(kbHeight);
        console.log('[KEYBOARD] ⌨️ Keyboard showing, height:', kbHeight);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[KEYBOARD] ⌨️ Keyboard hiding');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleDragMove = (dy: number) => {
    // Store the starting height when drag begins
    if (tempHeight === null) {
      startHeight.current = containerHeight;
    }

    // Convert dy (pixels) to percentage of screen height
    // Assuming average screen height ~800px, so 1% = 8px
    const screenHeight = Platform.OS === 'web' 
      ? (typeof window !== 'undefined' ? window.innerHeight : 800)
      : Dimensions.get('window').height;
    const heightChange = (dy / screenHeight) * 100;

    // Calculate new height (dragging down increases dy, so we subtract)
    let newHeight = startHeight.current - heightChange;

    console.log('[DRAG MOVE] screenHeight:', screenHeight, 'dy:', dy, 'heightChange:', heightChange, 'newHeight:', newHeight);

    // Clamp between MIN and MAX
    newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));

    setTempHeight(newHeight);
    setContainerHeight(newHeight);
    
    // Update heightAnimation to keep it in sync
    heightAnimation.setValue(newHeight);
  };

  const handleDrag = (gestureState: { dy: number; vy: number }) => {
    // This is called on drag end with velocity
    const currentHeight = tempHeight ?? containerHeight;
    const { dy, vy } = gestureState;

    let targetHeight = DEFAULT_HEIGHT;
    let collapsed = false;

    console.log('[DRAG] 📏 Drag ended at height:', currentHeight, 'velocity:', vy, 'isSearchMode:', isSearchMode);

    // Smart snapping based on current position and velocity
    // Consider both where we are and where we're going
    // Three states: MIN (10%) -> DEFAULT (45%) -> MAX (70%)
    
    if (Math.abs(vy) > 0.5) {
      // Fast swipe detected
      if (vy < 0) {
        // Fast upward swipe
        if (currentHeight < DEFAULT_HEIGHT - 5) {
          // From collapsed/below DEFAULT - snap to DEFAULT
          targetHeight = DEFAULT_HEIGHT;
          collapsed = false;
          console.log('[DRAG] ⬆️ Fast swipe UP from collapsed - Snapping to DEFAULT');
        } else if (currentHeight <= DEFAULT_HEIGHT + 5) {
          // From around DEFAULT - snap to MAX
          targetHeight = MAX_HEIGHT;
          collapsed = false;
          console.log('[DRAG] ⬆️ Fast swipe UP from DEFAULT - Snapping to EXPANDED (MAX_HEIGHT)');
        } else {
          // Already above DEFAULT - snap to MAX
          targetHeight = MAX_HEIGHT;
          collapsed = false;
          console.log('[DRAG] ⬆️ Fast swipe UP from upper position - Snapping to EXPANDED (MAX_HEIGHT)');
        }
      } else {
        // Fast downward swipe
        if (currentHeight > DEFAULT_HEIGHT + 10) {
          // From well above DEFAULT - snap to DEFAULT
          targetHeight = DEFAULT_HEIGHT;
          collapsed = false;
          console.log('[DRAG] ⬇️ Fast swipe DOWN from upper position - Snapping to DEFAULT');
        } else {
          // From DEFAULT or below - snap to MIN
          targetHeight = MIN_HEIGHT;
          collapsed = true;
          console.log('[DRAG] ⬇️ Fast swipe DOWN from DEFAULT/lower - Snapping to COLLAPSED (MIN_HEIGHT)');
        }
      }
    } else {
      // Slow drag - snap based on position
      if (currentHeight < 30) {
        targetHeight = MIN_HEIGHT;
        collapsed = true;
        console.log('[DRAG] ⬇️ Snapping to COLLAPSED (MIN_HEIGHT)');
      } else if (currentHeight > 55) {
        targetHeight = MAX_HEIGHT;
        collapsed = false;
        console.log('[DRAG] ⬆️ Snapping to EXPANDED (MAX_HEIGHT)');
      } else {
        targetHeight = DEFAULT_HEIGHT;
        collapsed = false;
        console.log('[DRAG] 🔄 Snapping to DEFAULT height');
      }
    }

    setContainerHeight(targetHeight);
    setIsCollapsed(collapsed);
    setTempHeight(null);
    
    // Smoothly animate to target height
    Animated.spring(heightAnimation, {
      toValue: targetHeight,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
    
    console.log('[DRAG] ✅ Final height set to:', targetHeight, '- heightAnimation synced');
  };

  const handleDragEnd = () => {
    // Do nothing - all snapping logic is handled in handleDrag
    // This is called after handleDrag by the Frame component
    // We don't want to override the snap decision made in handleDrag
  };

  const handleTap = () => {
    // Get the current animation value
    const currentHeight = (heightAnimation as any)._value;
    console.log('[TAP] 👆 Frame tapped - Current height:', currentHeight, 'MIN:', MIN_HEIGHT, 'MAX:', MAX_HEIGHT);

    // Only snap to DEFAULT if at MIN or MAX
    if (Math.abs(currentHeight - MIN_HEIGHT) < 1) {
      // At MIN_HEIGHT - snap to DEFAULT
      console.log('[TAP] 📍 At MIN - Snapping to DEFAULT');
      setContainerHeight(DEFAULT_HEIGHT);
      setIsCollapsed(false);
      setTempHeight(null);
      Animated.spring(heightAnimation, {
        toValue: DEFAULT_HEIGHT,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    } else if (Math.abs(currentHeight - MAX_HEIGHT) < 1) {
      // At MAX_HEIGHT - snap to DEFAULT
      console.log('[TAP] 📍 At MAX - Snapping to DEFAULT');
      setContainerHeight(DEFAULT_HEIGHT);
      setIsCollapsed(false);
      setTempHeight(null);
      Animated.spring(heightAnimation, {
        toValue: DEFAULT_HEIGHT,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // In between - do nothing
      console.log('[TAP] 🔇 At intermediate height - Ignoring tap');
    }
  };

  const handleExpandSheet = () => {
    setIsCollapsed(false);
    setContainerHeight(45); // Default expanded state
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const handleEnterSearchMode = () => {
    // Check current panel height
    const currentHeight = (heightAnimation as any)._value;
    console.log('[TRANSIT SEARCH] 🎯 Search bar clicked - Current panel height:', currentHeight, 'MAX_HEIGHT:', MAX_HEIGHT);
    
    // If panel is already at MAX_HEIGHT (fully expanded), don't re-animate
    if (currentHeight >= MAX_HEIGHT - 1) { // Allow 1 unit tolerance
      console.log('[TRANSIT SEARCH] ⏸️ Panel already at MAX_HEIGHT - skipping animation');
      // Just ensure search mode is on
      if (!isSearchMode) {
        setIsSearchMode(true);
        setIsCollapsed(false);
        // Fade in backdrop without height animation
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
      return;
    }
    
    console.log('[TRANSIT SEARCH] 🚀 Expanding panel from', currentHeight, 'to', MAX_HEIGHT);
    setIsSearchMode(true);
    setIsCollapsed(false);
    // Animate height expansion
    Animated.spring(heightAnimation, {
      toValue: MAX_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start(() => {
      setContainerHeight(MAX_HEIGHT);
      console.log('[TRANSIT SEARCH] ✅ Animation complete - height set to MAX_HEIGHT');
    });
    // Animate backdrop fade in
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleExitSearchMode = () => {
    // Animate backdrop fade out
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    // Animate height back to default
    Animated.spring(heightAnimation, {
      toValue: DEFAULT_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start(() => {
      setIsSearchMode(false); // Set after animation completes
      setContainerHeight(DEFAULT_HEIGHT);
    });
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const handleDragStart = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0];
    if (touch) {
      dragStartY.current = touch.pageY;
      dragStartTime.current = Date.now();
      isDragging.current = true;
    }
  };

  const handleDragMoveWrapper = (e: any) => {
    if (!isDragging.current) return;
    const touch = e.nativeEvent?.touches?.[0];
    if (touch) {
      const dy = touch.pageY - dragStartY.current;
      handleDragMove(dy);
    }
  };

  const handleDragEndWrapper = (e: any) => {
    if (!isDragging.current) return;
    const touch = e.nativeEvent?.changedTouches?.[0];
    if (touch) {
      const dy = touch.pageY - dragStartY.current;
      const duration = Date.now() - dragStartTime.current;
      const velocity = dy / Math.max(duration, 16); // Prevent division by zero
      isDragging.current = false;
      handleDrag({ dy, vy: velocity });
      handleDragEnd();
    }
  };

  const animatedStyle = {
    height: heightAnimation.interpolate({
      inputRange: [MIN_HEIGHT, DEFAULT_HEIGHT, MAX_HEIGHT],
      outputRange: [`${MIN_HEIGHT}%`, `${DEFAULT_HEIGHT}%`, `${MAX_HEIGHT}%`],
    }),
    paddingBottom: keyboardHeight,
    transform: isSearchMode ? [] : [
      {
        translateY: translateY.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 700],
        }),
      },
    ],
  };

  return {
    isCollapsed,
    isSearchMode,
    containerHeight,
    handleDrag,
    handleDragMove,
    handleDragEnd,
    handleTap,
    handleExpandSheet,
    handleEnterSearchMode,
    handleExitSearchMode,
    handleDragStart,
    handleDragMoveWrapper,
    handleDragEndWrapper,
    animatedStyle,
    dragStartY,
    dragStartTime,
    isDragging,
    backdropOpacity,
    heightAnimation,
    MIN_HEIGHT,
    MAX_HEIGHT,
  };
};

const MapSelectionDetails = ({
  selection,
  onClose,
  scrollRef,
}: {
  selection: MapSelection;
  onClose: () => void;
  scrollRef: React.RefObject<any>;
}) => {
  const { coords: userLocation } = useLocation();
  const { width: windowWidth } = useWindowDimensions();
  const shouldStackActions = windowWidth < 360;
  const isBusStopSelection =
    selection.type === 'place' && selection.place.type === 'bus-stop';
  const busStopId =
    isBusStopSelection ? selection.place.stopId || selection.place.name : '';

  const { data: busStopShuttleData, isLoading: isBusStopLoading } = useShuttleService(
    busStopId,
    isBusStopSelection
  );

  const { data: busStopServiceDescriptions } = useServiceDescriptions();

  const busStopColorMap = React.useMemo(() => {
    if (!busStopServiceDescriptions?.ServiceDescriptionResult?.ServiceDescription) {
      return {} as Record<string, string>;
    }

    return busStopServiceDescriptions.ServiceDescriptionResult.ServiceDescription.reduce(
      (map, service) => {
        map[service.Route] = service.Color;
        return map;
      },
      {} as Record<string, string>
    );
  }, [busStopServiceDescriptions]);

  const busStopRoutes: BusRoute[] = React.useMemo(() => {
    if (!busStopShuttleData?.ShuttleServiceResult?.shuttles) {
      return [];
    }

    const sortedShuttles = sortShuttlesByArrival(
      busStopShuttleData.ShuttleServiceResult.shuttles
    );

    return sortedShuttles
      .map((shuttle) => {
        const routeName = shuttle.name.replace(/^PUB:/, '').toUpperCase();
        const isPublicBus = shuttle.name.startsWith('PUB:');
        const routeColor = isPublicBus
          ? '#55DD33'
          : getRouteColor(shuttle.name, busStopColorMap[shuttle.name]);

        return {
          route: routeName,
          color: routeColor,
          isPublicBus: isPublicBus,
          times: [
            {
              time: formatArrivalTime(shuttle.arrivalTime),
              crowding: passengerLoadToCrowding(shuttle.passengers),
              textColor: '#211F26',
            },
            {
              time: formatArrivalTime(shuttle.nextArrivalTime),
              crowding: passengerLoadToCrowding(shuttle.nextPassengers),
              textColor: '#737373',
            },
          ],
        };
      })
      .filter((route) => route.times.some((t) => t.time !== 'N/A'));
  }, [busStopShuttleData, busStopColorMap]);

  const openInMaps = (
    label: string,
    latitude: number,
    longitude: number,
    mapsUrl?: string
  ) => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl);
      return;
    }
    const encodedLabel = encodeURIComponent(label);
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}(${encodedLabel})`;
    Linking.openURL(fallbackUrl);
  };

  const startNavigation = (label: string, latitude: number, longitude: number) => {
    router.push({
      pathname: '/navigation' as any,
      params: {
        destination: label,
        destinationLat: latitude.toString(),
        destinationLng: longitude.toString(),
        userLat: userLocation?.latitude?.toString(),
        userLng: userLocation?.longitude?.toString(),
      },
    });
  };

  const renderActionButtons = ({
    onNavigate,
    onOpenMaps,
  }: {
    onNavigate: () => void;
    onOpenMaps: () => void;
  }) => (
    <View
      style={{
        flexDirection: shouldStackActions ? 'column' : 'row',
        gap: 8,
      }}
    >
      <Pressable
        onPress={onOpenMaps}
        style={{
          backgroundColor: '#FFFFFF',
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          flex: shouldStackActions ? undefined : 1,
        }}
      >
        <Text style={{ color: '#111827', fontWeight: '600' }}>
          Open in Google Maps
        </Text>
      </Pressable>
      <Pressable
        onPress={onNavigate}
        style={{
          backgroundColor: '#274F9C',
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: 'center',
          flex: shouldStackActions ? undefined : 1,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
          Start navigation
        </Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
    >
      <View style={{ position: 'relative' }}>
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Text style={{ fontSize: 20, color: '#374151', lineHeight: 20 }}>×</Text>
        </Pressable>

        {selection.type === 'place' && (
          <View>
            {selection.place.photo && (
              <Image
                source={{ uri: selection.place.photo }}
                resizeMode="cover"
                style={{
                  width: '100%',
                  aspectRatio: 16 / 6,
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              />
            )}
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 6 }}>
              {selection.place.name}
            </Text>
            {selection.place.address && (
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>
                {selection.place.address}
              </Text>
            )}
            {(selection.place.rating || selection.place.openNow !== undefined) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}
              >
                {selection.place.rating && (
                  <Text style={{ fontSize: 14, color: '#111827' }}>
                    {selection.place.rating.toFixed(1)} ★
                    {selection.place.userRatingsTotal
                      ? ` (${selection.place.userRatingsTotal})`
                      : ''}
                  </Text>
                )}
                {selection.place.openNow !== undefined && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: selection.place.openNow ? '#188038' : '#D93025',
                    }}
                  >
                    {selection.place.openNow ? 'Open' : 'Closed'}
                  </Text>
                )}
              </View>
            )}
            {isBusStopSelection && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  BUS SERVICES
                </Text>
                {isBusStopLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>
                      Loading bus data...
                    </Text>
                  </View>
                ) : busStopRoutes.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>
                      No buses available
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <View className="flex-row gap-2">
                      {busStopRoutes.slice(0, 3).map((route) => (
                        <BusRouteCard key={route.route} route={route} />
                      ))}
                      {busStopRoutes.length < 3 &&
                        Array.from({ length: 3 - busStopRoutes.length }).map(
                          (_, i) => <View key={`empty-${i}`} className="flex-1" />
                        )}
                    </View>
                    {busStopRoutes.length > 3 && (
                      <View className="flex-row gap-2">
                        {busStopRoutes.slice(3, 6).map((route) => (
                          <BusRouteCard key={route.route} route={route} />
                        ))}
                        {busStopRoutes.length < 6 &&
                          Array.from({ length: 6 - busStopRoutes.length }).map(
                            (_, i) => <View key={`empty-row2-${i}`} className="flex-1" />
                          )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
            {renderActionButtons({
              onNavigate: () =>
                startNavigation(
                  selection.place.name,
                  selection.place.coordinates.latitude,
                  selection.place.coordinates.longitude
                ),
              onOpenMaps: () =>
                openInMaps(
                  selection.place.name,
                  selection.place.coordinates.latitude,
                  selection.place.coordinates.longitude
                ),
            })}
          </View>
        )}

        {selection.type === 'printer' && (
          <View>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 6 }}>
              {selection.printer.building} Printer
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>LOCATION</Text>
            <Text style={{ fontSize: 14, color: '#111827', marginBottom: 12 }}>
              {selection.printer.location}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>OPERATING HOURS</Text>
            <Text style={{ fontSize: 14, color: '#111827', marginBottom: 16 }}>
              {selection.printer.hours}
            </Text>
            {renderActionButtons({
              onNavigate: () =>
                startNavigation(
                  `${selection.printer.building} Printer`,
                  selection.printer.coordinates.lat,
                  selection.printer.coordinates.lng
                ),
              onOpenMaps: () =>
                openInMaps(
                  `${selection.printer.building} Printer`,
                  selection.printer.coordinates.lat,
                  selection.printer.coordinates.lng,
                  selection.printer.googleMapsUrl
                ),
            })}
          </View>
        )}

        {selection.type === 'sports' && (
          <View>
            {selection.facility.imageSource && (
              <Image
                source={selection.facility.imageSource}
                resizeMode="cover"
                style={{
                  width: '100%',
                  aspectRatio: 16 / 6,
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              />
            )}
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 6 }}>
              {selection.facility.name}
            </Text>
            {selection.facility.address && (
              <>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>LOCATION</Text>
                <Text style={{ fontSize: 14, color: '#111827', marginBottom: 12 }}>
                  {selection.facility.address}
                </Text>
              </>
            )}
            {selection.facility.hours && (
              <>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  OPERATING HOURS
                </Text>
                <Text style={{ fontSize: 14, color: '#111827', marginBottom: 16 }}>
                  {selection.facility.hours}
                </Text>
              </>
            )}
            {renderActionButtons({
              onNavigate: () =>
                startNavigation(
                  selection.facility.name,
                  selection.facility.coordinates.lat,
                  selection.facility.coordinates.lng
                ),
              onOpenMaps: () =>
                openInMaps(
                  selection.facility.name,
                  selection.facility.coordinates.lat,
                  selection.facility.coordinates.lng,
                  selection.facility.googleMapsUrl
                ),
            })}
          </View>
        )}

        {selection.type === 'canteen' && (
          <View>
            {selection.canteen.imageSource && (
              <Image
                source={selection.canteen.imageSource}
                resizeMode="cover"
                style={{
                  width: '100%',
                  aspectRatio: 16 / 6,
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              />
            )}
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 6 }}>
              {selection.canteen.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>
              {selection.canteen.locationLabel}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              {selection.canteen.dietary.halal && (
                <Text
                  style={{
                    fontSize: 12,
                    color: '#374151',
                    backgroundColor: '#F3F4F6',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginRight: 8,
                    marginBottom: 6,
                  }}
                >
                  🥙 Halal option
                </Text>
              )}
              {selection.canteen.dietary.vegetarian && (
                <Text
                  style={{
                    fontSize: 12,
                    color: '#374151',
                    backgroundColor: '#F3F4F6',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                >
                  🥗 Vegetarian option
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
              HOURS (TERM)
            </Text>
            <Text style={{ fontSize: 14, color: '#111827', marginBottom: 12 }}>
              {selection.canteen.hours.term
                .map((h) => (h.closed ? `${h.days}: Closed` : `${h.days}: ${h.open} - ${h.close}`))
                .join('\n')}
            </Text>
            {selection.canteen.notes && selection.canteen.notes.length > 0 && (
              <>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  NOTES
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 16 }}>
                  {selection.canteen.notes.join(' ')}
                </Text>
              </>
            )}
            {renderActionButtons({
              onNavigate: () =>
                startNavigation(
                  selection.canteen.name,
                  selection.canteen.coords.lat,
                  selection.canteen.coords.lng
                ),
              onOpenMaps: () =>
                openInMaps(
                  selection.canteen.name,
                  selection.canteen.coords.lat,
                  selection.canteen.coords.lng,
                  selection.canteen.mapsUrl
                ),
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

/* eslint-disable max-lines-per-function */
export default function TransitPage() {
  const infoModal = useModal();
  const privacyUrl = 'https://nus-nextbus-redesign-fe.vercel.app/privacy';
  const termsUrl = 'https://nus-nextbus-redesign-fe.vercel.app/terms';
  const supportMailto =
    'mailto:edward.zehua.zhang@gmail.com?subject=' +
    encodeURIComponent('NUS NextBus Support') +
    '&body=' +
    encodeURIComponent('Hi Edward,\n\nI need help with...\n\n');

  const openExternal = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Silent catch
    });
  };
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<string>('CLB');
  const [selectedRoute, setSelectedRoute] = React.useState<string | null>(null);
  const [mapSelection, setMapSelection] = React.useState<MapSelection | null>(null);
  const [mapFilters, setMapFilters] = React.useState<Record<string, boolean>>(
    () => {
      const defaultFilters = {
        important: true,
        academic: false,
        residences: false,
        'bus-stops': true,
        'bus-route-d2': false,
        printers: false,
        sports: false,
        canteens: false,
      };

      // Load from storage (works on both web and native)
      try {
        const stored = storage.getString('map-filters');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Always override academic to be false on initial load
          return { ...parsed, academic: false };
        }
      } catch (error) {
        console.error('Error loading map filters:', error);
      }
      return defaultFilters;
    }
  );

  const {
    isCollapsed,
    isSearchMode,
    containerHeight,
    handleDrag,
    handleDragMove,
    handleDragEnd,
    handleTap,
    handleExpandSheet,
    handleEnterSearchMode,
    handleExitSearchMode,
    handleDragStart,
    handleDragMoveWrapper,
    handleDragEndWrapper,
    animatedStyle,
    dragStartY,
    dragStartTime,
    isDragging,
    backdropOpacity,
    heightAnimation,
    MIN_HEIGHT,
    MAX_HEIGHT,
  } = useDragHandlers();

  const handleRouteClick = (routeName: string) => {
    setSelectedRoute((prev) => (prev === routeName ? null : routeName));
  };

  React.useEffect(() => {
    if (mapSelection) {
      setMapSelection(null);
    }
  }, [activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setMapSelection(null);
      };
    }, [])
  );

  // Store the map type change handler from InteractiveMap
  const mapTypeChangeHandlerRef = React.useRef<
    ((mapType: 'standard' | 'satellite' | 'hybrid' | 'terrain') => void) | null
  >(null);

  const handleMapTypeChange = (
    mapType: 'standard' | 'satellite' | 'hybrid' | 'terrain'
  ) => {
    if (mapTypeChangeHandlerRef.current) {
      mapTypeChangeHandlerRef.current(mapType);
    }
  };

  const handleFilterChange = (filters: Record<string, boolean>) => {
    console.log('Filter changes:', filters);
    setMapFilters(filters);
    storage.set('map-filters', JSON.stringify(filters));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <FocusAwareStatusBar />

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <InteractiveMap
          style={{ width: '100%', height: '100%' }}
          showD1Route={selectedRoute === 'D1'}
          activeRoute={selectedRoute?.toUpperCase() as any} // Pass selected route to show real-time buses (ensure uppercase)
          onActiveRouteChange={(route) => setSelectedRoute(route)} // Sync filter selection back to transit page
          showBusStops={true} // Show bus stop markers with labels
          showLandmarks={true} // Show landmarks (hospital, MRT, library) when zoomed in
          showMapControls={false} // Disable map controls in InteractiveMap, we'll render them at top level
          mapFilters={mapFilters} // Pass filters from parent
          onMapFiltersChange={handleFilterChange} // Handle filter changes
          onMapItemSelect={(selection) => setMapSelection(selection)}
          selectedMapItem={mapSelection}
          onMapTypeChangeReady={(handler) => {
            mapTypeChangeHandlerRef.current = handler;
          }}
        />
      </View>

      <ActionButtons />

      {/* Backdrop/Shading - animated opacity for smooth transition */}
      <Animated.View
        style={{
          position: 'absolute' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          opacity: backdropOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Sports and Printers Toggle Bubbles */}
      <SportsAndPrintersBubbles
        filters={mapFilters}
        onFilterChange={handleFilterChange}
        heightAnimation={heightAnimation}
        MIN_HEIGHT={MIN_HEIGHT}
        MAX_HEIGHT={MAX_HEIGHT}
      />

      <Animated.View
        style={[
          {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            backgroundColor: '#F9FAFB',
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingTop: 4,
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
            marginTop: 'auto',
            position: 'relative',
            zIndex: 1,
          },
          animatedStyle,
        ]}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMoveWrapper}
        onTouchEnd={handleDragEndWrapper}
      >
        <View className="mb-3 items-center">
          <Frame 
            onDrag={handleDrag}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onTap={handleTap}
          />
        </View>

        <BottomSheetContent
          isCollapsed={isCollapsed}
          isSearchMode={isSearchMode}
          mapSelection={mapSelection}
          onCloseSelection={() => setMapSelection(null)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onExpandSheet={handleExpandSheet}
          onSearchPress={handleEnterSearchMode}
          onCancelSearch={handleExitSearchMode}
          selectedRoute={selectedRoute}
          onRouteClick={handleRouteClick}
        />
      </Animated.View>

      <Modal ref={infoModal.ref} title="Info" snapPoints={['35%']}>
        <View className="px-4 pb-6">
          <Pressable
            onPress={() => {
              infoModal.dismiss();
              openExternal(privacyUrl);
            }}
            className="mb-3 rounded-xl bg-white px-4 py-4"
          >
            <Text className="text-[16px] font-semibold text-[#1F2937]">
              Privacy Policy
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              infoModal.dismiss();
              openExternal(termsUrl);
            }}
            className="mb-3 rounded-xl bg-white px-4 py-4"
          >
            <Text className="text-[16px] font-semibold text-[#1F2937]">
              Terms of Service
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              infoModal.dismiss();
              openExternal(supportMailto);
            }}
            className="rounded-xl bg-white px-4 py-4"
          >
            <Text className="text-[16px] font-semibold text-[#1F2937]">
              Support
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* Map controls - hide when bottom panel/search is up */}
      {pathname === '/transit' && !isSearchMode && (
        <View
          style={{
            position: 'absolute' as any,
            top: insets.top + 8,
            right: 20,
            zIndex: 1,
            pointerEvents: 'box-none',
          }}
        >
          <MapTypeSelector
            onMapTypeChange={handleMapTypeChange}
            onFilterChange={handleFilterChange}
            filters={mapFilters}
          />
        </View>
      )}

      {/* Info button (top-left) */}
      {pathname === '/transit' && !isSearchMode && (
        <View
          style={{
            position: 'absolute' as any,
            top: insets.top + 8,
            left: 20,
            zIndex: 1,
          }}
        >
          <Pressable
            onPress={infoModal.present}
            accessibilityRole="button"
            accessibilityLabel="Info"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            <Text style={{ color: '#111827', fontSize: 18, fontWeight: '700' }}>
              i
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
