import { router, usePathname } from 'expo-router';
import React from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Animated, TextInput, Keyboard, Platform, Dimensions, Linking, useWindowDimensions } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Info } from 'phosphor-react-native';
import { useQueryClient } from '@tanstack/react-query';

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
import { getActiveBuses } from '@/api/bus/api';

import { getPlaceDetails } from '@/api/google-maps/places';
import type { PlaceAutocompleteResult } from '@/api/google-maps/types';
import { Frame } from '@/components/frame';
import { InteractiveMap, type MapSelection } from '@/components/interactive-map';
import { MapTypeSelector } from '@/components/map-type-selector';
import { SportsAndPrintersBubbles } from '@/components/sports-printers-bubbles';
import { AnimatedDots } from '@/components/animated-dots';
import {
  FocusAwareStatusBar,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  ActionButton,
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
import { NavigationArrowIcon } from '@/components/ui/icons/navigation-arrow';
import { LocationIcon } from '@/components/ui/icons/location-icons';

import { SearchResults } from '@/components/shared-search';
import {
  type BusStation,
  getBusStationById,
} from '@/lib/bus-stations';
import { type LocationCoords, useLocation } from '@/lib/hooks/use-location';
import { useKeyboardAwareInteraction } from '@/lib/hooks/use-keyboard-aware-interaction';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { type FavoriteRoute } from '@/lib/storage/favorites';
import {
  addRecentSearch,
  getRecentSearches,
} from '@/lib/storage/recent-searches';

// Initialize location permissions early
const LocationInitializer = () => {
  useLocation();
  return null;
};

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

const parseBusTimeForSort = (time: string): number => {
  if (time === 'Arr') {
    return 0;
  }

  const minutes = parseInt(time, 10);
  if (Number.isNaN(minutes)) {
    return Number.POSITIVE_INFINITY;
  }

  return minutes;
};

const buildBusRoutes = (
  shuttles: any[],
  colorMap: Record<string, string>
): BusRoute[] => {
  const routeMap = new Map<string, BusRoute>();

  shuttles.forEach((shuttle) => {
    const routeName = shuttle.name.replace(/^PUB:/, '').toUpperCase();
    const isPublicBus = shuttle.name.startsWith('PUB:');
    const routeColor = isPublicBus
      ? '#55DD33'
      : getRouteColor(shuttle.name, colorMap[shuttle.name]);

    const times = [
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
    ];

    const existing = routeMap.get(routeName);
    if (!existing) {
      routeMap.set(routeName, {
        route: routeName,
        color: routeColor,
        isPublicBus,
        times: [...times],
      });
      return;
    }

    existing.times.push(...times);
    if (!isPublicBus && existing.isPublicBus) {
      existing.isPublicBus = false;
      existing.color = routeColor;
    }
  });


  return Array.from(routeMap.values())
    .map((route) => {
      const sortedTimes = route.times
        .filter((timeItem) => timeItem.time !== 'N/A')
        .sort(
          (a, b) =>
            parseBusTimeForSort(a.time) - parseBusTimeForSort(b.time)
        )
        .slice(0, 4)
        .map((timeItem, index) => ({
          ...timeItem,
          textColor: index === 0 ? '#211F26' : '#737373',
        }));


      return {
        ...route,
        times: sortedTimes,
      };
    })
    .filter((route) => route.times.length > 0);
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
  image: string | number;
  destinationLat?: string;
  destinationLng?: string;
};

const popularSearches: PopularSearchItem[] = [
  {
    id: '1',
    title: 'UTown\n#NUS Sign',
    image: require('../../../assets/images/utown-nus-sign.png'),
  },
  {
    id: '2',
    title: 'Lee Kong Chian Natural History Museum',
    image: require('../../../assets/images/lee-kong-chian-natural-history-museum.png'),
  },
  {
    id: '3',
    title: 'UTown Infinite Pool',
    image: require('../../../assets/images/utown-infinity-pool.png'),
  },
  {
    id: '4',
    title: 'Science Library',
    image: require('../../../assets/images/medicine-science-library.jpg'),
    destinationLat: '1.2959',
    destinationLng: '103.7810',
  },
  {
    id: '5',
    title: 'Kent Ridge MRT',
    image: require('../../../assets/images/kent-ridge-mrt.jpg'),
  },
  {
    id: '6',
    title: 'Central Library',
    image: require('../../../assets/images/central-library.png'),
  },
  {
    id: '7',
    title: 'Law Library',
    image: require('../../../assets/images/law-library.jpg'),
    destinationLat: '1.3188',
    destinationLng: '103.8182',
  },
  {
    id: '8',
    title: 'COM3 Building',
    image: require('../../../assets/images/COM3-building.avif'),
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
              borderWidth: 1.5,
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

        {/* Times List - Show up to 4 timings */}
        <BusTimingRows times={route.times.slice(0, 4)} />
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

const SearchBar = ({ onSearchPress, disabled }: { onSearchPress?: () => void; disabled?: boolean }) => {
  const [searchText, setSearchText] = React.useState('');
  const textInputRef = React.useRef<any>(null);

  const handleTouchStart = () => {
    if (disabled) {
      console.log('[TRANSIT SEARCH] ⛔️ Touch ignored (exiting)');
      return;
    }
    if (onSearchPress) {
      console.log('[TRANSIT SEARCH] 👆 Touch -> enter search');
      onSearchPress();
    }
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
          onTouchStart={handleTouchStart}
          editable={!disabled}
          keyboardType="default"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit={false}
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '500',
            color: '#09090B',
            height: 40,
            paddingVertical: 0,
            paddingHorizontal: 0,
            margin: 0,
            textAlignVertical: 'center', // Android centering
            includeFontPadding: false as any, // Android typography padding
            lineHeight: 20, // match text-base (~16) with comfortable line height
            transform: [{ translateY: -0 }], // slight upward nudge for proper alignment
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
          source={item.image}
          contentFit="cover"
          className="absolute inset-0 size-full"
          style={{ borderRadius: '6px' }}
          placeholder={undefined}
        />
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />
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
  onUpdate: (id: string, from: string, to: string) => void;
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
    Keyboard.dismiss();
    // Don't navigate if we're editing
    if (isEditing) {
      inputRef.current?.blur();
      handleSaveEdit();
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
    if (!isEditing) {
      return;
    }

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
      onUpdate(item.id, from, to || item.to);
    } else {
      // No dash - use entire text as "from" and empty string as "to"
      onUpdate(item.id, trimmedText, '');
    }
    
    setIsEditing(false);
  };

  return (
    <Pressable
      className="min-w-[64px] max-w-[140px] flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm"
      onPress={handlePress}
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
            blurOnSubmit
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
  // Get favorites from context - updates automatically when favorites change
  const { favorites, updateFavoriteLabel } = useFavoritesContext();
  
  // Get user's current location to pass to navigation
  const { coords: userLocation } = useLocation();

  // Log favorites changes for debugging
  React.useEffect(() => {
    console.log('🔄 [Transit] Favorites updated:', favorites.length);
  }, [favorites]);

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
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ gap: 8 }}
        >
          {favorites.map((item) => (
            <FavoriteButton
              key={item.id}
              item={item}
              userLocation={userLocation}
              onUpdate={updateFavoriteLabel}
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
  // React.useEffect(() => {
  //   console.log('🏠 Homepage (Transit) Loaded - User Location:');
  //   if (locationLoading) {
  //     console.log('   Status: Loading location...');
  //   } else if (locationError) {
  //     console.log('   Status: Error -', locationError);
  //     console.log('   Will use fallback location (SDE3)');
  //   } else if (userLocation) {
  //     console.log('   ✅ GPS Location:', {
  //       latitude: userLocation.latitude,
  //       longitude: userLocation.longitude,
  //     });
  //   } else {
  //     console.log('   Status: No location available yet');
  //   }
  // }, [userLocation, locationError, locationLoading]);

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

    return buildBusRoutes(sortedShuttles, colorMap);
  }, [shuttleData, colorMap]);

  // Prefetch bus data for all routes in nearest stops after they're loaded
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (currentBusRoutes.length === 0) {
      return;
    }

    // List of obsolete routes to skip prefetching
    const OBSOLETE_ROUTES = ['E', 'L'];

    // Extract route codes from currentBusRoutes
    const routeCodes = currentBusRoutes
      .map(route => route.route as any)
      .filter(routeCode => !OBSOLETE_ROUTES.includes(routeCode));

    // Prefetch bus data for each route
    routeCodes.forEach((routeCode) => {
      queryClient.prefetchQuery({
        queryKey: ['activeBuses', routeCode],
        queryFn: () => getActiveBuses(routeCode),
        staleTime: 1 * 1000, // 1 second
      }).then(() => {
        console.log(`[🚌 BUS PREFETCH] ✅ Prefetched bus data for route: ${routeCode}`);
      }).catch((error) => {
        // Silently ignore errors for obsolete or unavailable routes
        if (error?.response?.status === 500) {
          console.log(`[🚌 BUS PREFETCH] ⚠️ Route ${routeCode} unavailable (possibly obsolete)`);
        } else {
          console.error(`[🚌 BUS PREFETCH] ❌ Failed to prefetch bus data for route ${routeCode}:`, error);
        }
      });
    });
  }, [currentBusRoutes, queryClient]);

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-medium text-neutral-500" style={{ fontFamily: 'Inter' }}>
        Nearest Stops
      </Text>

      {nearestStops.length === 0 ? (
        <View className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <View className="items-center">
            {locationLoading ? (
              <>
                <Text className="mb-2 text-center text-base font-semibold text-neutral-700">
                  Getting your location<AnimatedDots interval={400} />
                </Text>
                <Text className="text-center text-sm text-neutral-500">
                  This will take a second
                </Text>
              </>
            ) : locationError ? (
              <>
                <Text className="mb-2 text-center text-base font-semibold text-neutral-700">
                  Location unavailable
                </Text>
                <Text className="text-center text-sm text-neutral-500">
                  Enable location permission in settings
                </Text>
              </>
            ) : (
              <>
                <Text className="mb-2 text-center text-base font-semibold text-neutral-700">
                  Location Unavailable
                </Text>
                <Text className="text-center text-sm text-neutral-500">
                  Please enable location services to find nearby stops
                </Text>
              </>
            )}
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
      Keyboard.dismiss();
      router.push({
        pathname: '/navigation' as any,
        params: {
          destination: item.title.replace('\n', ' '),
          userLat: userLocation?.latitude?.toString(),
          userLng: userLocation?.longitude?.toString(),
          ...(item.destinationLat && item.destinationLng ? {
            destinationLat: item.destinationLat,
            destinationLng: item.destinationLng,
          } : {}),
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
        keyboardShouldPersistTaps="always"
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
            className="flex-1"
            placeholder="Search for location..."
            placeholderTextColor="#737373"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus={true}
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '500',
              color: '#09090B',
              height: 40,
              paddingVertical: 0,
              paddingHorizontal: 0,
              margin: 0,
              textAlignVertical: 'center', // Android centering
              includeFontPadding: false as any, // Android typography padding
              lineHeight: 20, // match text-base (~16) with comfortable line height
              transform: [{ translateY: -0 }], // slight upward nudge to visually center
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

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
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

const BottomSheetContent = React.memo(({
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
  isSearchModeExiting,
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
  isSearchModeExiting?: boolean;
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
        <SearchBar onSearchPress={onSearchPress} disabled={isSearchModeExiting} />
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
}, (prevProps, nextProps) => {
  // Custom comparison: re-render only if these specific props change
  return (
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.isSearchMode === nextProps.isSearchMode &&
    prevProps.mapSelection === nextProps.mapSelection &&
    prevProps.onCloseSelection === nextProps.onCloseSelection &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.onTabChange === nextProps.onTabChange &&
    prevProps.onExpandSheet === nextProps.onExpandSheet &&
    prevProps.onSearchPress === nextProps.onSearchPress &&
    prevProps.onCancelSearch === nextProps.onCancelSearch &&
    prevProps.selectedRoute === nextProps.selectedRoute &&
    prevProps.onRouteClick === nextProps.onRouteClick &&
    prevProps.isSearchModeExiting === nextProps.isSearchModeExiting
  );
});

/* eslint-disable max-lines-per-function */
const useDragHandlers = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isSearchMode, setIsSearchMode] = React.useState(false);
  const screenHeight = Dimensions.get('window').height;
  // Convert percentage heights to pixels for native driver support
  const MIN_HEIGHT_PX = Math.round(screenHeight * 0.1); // 10%
  const MAX_HEIGHT_PX = Math.round(screenHeight * 0.92); // 92%
  const DEFAULT_HEIGHT_PX = Math.round(screenHeight * 0.45); // 45%
  
  const [containerHeight, setContainerHeight] = React.useState(DEFAULT_HEIGHT_PX);
  const [tempHeight, setTempHeight] = React.useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const translateY = React.useRef(new Animated.Value(0)).current;
  const heightAnimation = React.useRef(new Animated.Value(DEFAULT_HEIGHT_PX)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const startHeight = React.useRef(DEFAULT_HEIGHT_PX);
  const dragStartY = React.useRef(0);
  const dragStartTime = React.useRef(0);
  const isDragging = React.useRef(false);
  const lastDragUpdateTime = React.useRef(0); // For debouncing touch move events
  const [isSearchModeExiting, setIsSearchModeExiting] = React.useState(false);
  const exitSearchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearchModeRef = React.useRef(false);
  const isDragLockedRef = React.useRef(false);
  const dragStartStateRef = React.useRef<'MIN' | 'DEFAULT' | 'MAX'>('DEFAULT');
  const keyboardTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    isSearchModeRef.current = isSearchMode;
  }, [isSearchMode]);
  const ignoreSearchPressRef = React.useRef(false);
  const ignoreSearchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useKeyboardAwareInteraction({
    autoExpand: true,
    maxHeight: MAX_HEIGHT_PX,
    snapToHeight: (targetHeight) => {
      setIsCollapsed(false);
      setTempHeight(null);
      Animated.spring(heightAnimation, {
        toValue: targetHeight,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start(() => {
        setContainerHeight(targetHeight);
      });
    },
    onKeyboardShow: (height) => {
      setKeyboardHeight(height);
    },
    onKeyboardHide: () => {
      setKeyboardHeight(0);
    },
  });

  const resetToDefault = React.useCallback(() => {
    setIsSearchMode(false);
    setIsCollapsed(false);
    setTempHeight(null);
    setKeyboardHeight(0);
    setContainerHeight(DEFAULT_HEIGHT_PX);
    heightAnimation.setValue(DEFAULT_HEIGHT_PX);
    backdropOpacity.setValue(0);
    translateY.setValue(0);
  }, [backdropOpacity, heightAnimation, translateY, DEFAULT_HEIGHT_PX]);

  React.useEffect(() => {
    return () => {
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
      if (exitSearchTimeoutRef.current) {
        clearTimeout(exitSearchTimeoutRef.current);
        exitSearchTimeoutRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (ignoreSearchTimeoutRef.current) {
        clearTimeout(ignoreSearchTimeoutRef.current);
        ignoreSearchTimeoutRef.current = null;
      }
    };
  }, []);

  const handleDragMove = React.useCallback((dy: number) => {
    // Don't allow dragging while search mode is exiting
    if (isDragLockedRef.current) {
      console.log('[DRAG] 🔒 Drag locked during search exit');
      return;
    }
    
    // Debounce: skip frame if less than 16ms has passed (roughly 60fps frame rate)
    const now = Date.now();
    if (now - lastDragUpdateTime.current < 8) {
      return; // Skip this update
    }
    lastDragUpdateTime.current = now;
    
    // Store the starting height and state when drag begins
    if (tempHeight === null) {
      startHeight.current = containerHeight;
      // Determine which state we're starting from
      if (Math.abs(containerHeight - MIN_HEIGHT_PX) < 10) {
        dragStartStateRef.current = 'MIN';
      } else if (Math.abs(containerHeight - MAX_HEIGHT_PX) < 10) {
        dragStartStateRef.current = 'MAX';
      } else {
        dragStartStateRef.current = 'DEFAULT';
      }
      console.log('[DRAG] 📍 Starting from:', dragStartStateRef.current);
    }

    // Calculate new height in pixels directly (no percentage conversion needed)
    let newHeight = startHeight.current - dy;

    // Clamp between MIN and MAX
    newHeight = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, newHeight));

    setTempHeight(newHeight);
    setContainerHeight(newHeight);
    
    // Update heightAnimation to keep it in sync - no expensive string conversion
    heightAnimation.setValue(newHeight);
  }, [containerHeight, tempHeight, MIN_HEIGHT_PX, MAX_HEIGHT_PX, heightAnimation]);

  const handleDrag = React.useCallback((gestureState: { dy: number; vy: number }) => {
    // Don't snap while locked
    if (isDragLockedRef.current) {
      console.log('[DRAG] 🔒 Snap locked during search exit');
      return;
    }

    const currentHeight = tempHeight ?? containerHeight;
    const { vy } = gestureState;
    const dragDirection = vy < 0 ? 'UP' : 'DOWN'; // negative = up, positive = down

    let targetHeight: number;
    let collapsed = false;

    console.log('[DRAG] 🎯 Direction:', dragDirection, 'From state:', dragStartStateRef.current, 'Current height:', currentHeight);

    // Hard-coded state transition logic based on starting state and direction
    if (dragStartStateRef.current === 'DEFAULT') {
      if (dragDirection === 'UP') {
        targetHeight = MAX_HEIGHT_PX;
        collapsed = false;
        console.log('[DRAG] DEFAULT + UP → MAX');
      } else {
        targetHeight = MIN_HEIGHT_PX;
        collapsed = true;
        console.log('[DRAG] DEFAULT + DOWN → MIN');
      }
    } else if (dragStartStateRef.current === 'MAX') {
      if (dragDirection === 'DOWN') {
        targetHeight = DEFAULT_HEIGHT_PX;
        collapsed = false;
        console.log('[DRAG] MAX + DOWN → DEFAULT');
      } else {
        // Dragging up from MAX, stay at MAX or go higher
        targetHeight = MAX_HEIGHT_PX;
        collapsed = false;
        console.log('[DRAG] MAX + UP → MAX (stay)');
      }
    } else if (dragStartStateRef.current === 'MIN') {
      if (dragDirection === 'UP') {
        targetHeight = DEFAULT_HEIGHT_PX;
        collapsed = false;
        console.log('[DRAG] MIN + UP → DEFAULT');
      } else {
        // Dragging down from MIN, stay at MIN
        targetHeight = MIN_HEIGHT_PX;
        collapsed = true;
        console.log('[DRAG] MIN + DOWN → MIN (stay)');
      }
    } else {
      // Fallback: snap to nearest state for pass-through cases
      const distToMin = Math.abs(currentHeight - MIN_HEIGHT_PX);
      const distToDefault = Math.abs(currentHeight - DEFAULT_HEIGHT_PX);
      const distToMax = Math.abs(currentHeight - MAX_HEIGHT_PX);
      const minDist = Math.min(distToMin, distToDefault, distToMax);

      if (minDist === distToMin) {
        targetHeight = MIN_HEIGHT_PX;
        collapsed = true;
      } else if (minDist === distToDefault) {
        targetHeight = DEFAULT_HEIGHT_PX;
        collapsed = false;
      } else {
        targetHeight = MAX_HEIGHT_PX;
        collapsed = false;
      }
      console.log('[DRAG] Fallback: snapping to nearest, target:', targetHeight);
    }

    setContainerHeight(targetHeight);
    setIsCollapsed(collapsed);
    setTempHeight(null);

    // Smoothly animate to target height
    // Note: useNativeDriver: false because height is not supported by native driver
    // But other optimizations (debouncing, memoization) make this fast enough
    Animated.spring(heightAnimation, {
      toValue: targetHeight,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [tempHeight, containerHeight, MIN_HEIGHT_PX, MAX_HEIGHT_PX, DEFAULT_HEIGHT_PX, heightAnimation]);

  const handleDragEnd = () => {
    // Do nothing - all snapping logic is handled in handleDrag
    // This is called after handleDrag by the Frame component
    // We don't want to override the snap decision made in handleDrag
  };

  const handleTap = () => {
    // Get the current animation value
    const currentHeight = (heightAnimation as any)._value;
    console.log('[TAP] 👆 Frame tapped - Current height:', currentHeight, 'MIN:', MIN_HEIGHT_PX, 'MAX:', MAX_HEIGHT_PX);

    // Only snap to DEFAULT if at MIN or MAX
    if (Math.abs(currentHeight - MIN_HEIGHT_PX) < 10) {
      // At MIN_HEIGHT - snap to DEFAULT
      console.log('[TAP] 📍 At MIN - Snapping to DEFAULT');
      setContainerHeight(DEFAULT_HEIGHT_PX);
      setIsCollapsed(false);
      setTempHeight(null);
      Animated.spring(heightAnimation, {
        toValue: DEFAULT_HEIGHT_PX,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    } else if (Math.abs(currentHeight - MAX_HEIGHT_PX) < 10) {
      // At MAX_HEIGHT - snap to DEFAULT
      console.log('[TAP] 📍 At MAX - Snapping to DEFAULT');
      setContainerHeight(DEFAULT_HEIGHT_PX);
      setIsCollapsed(false);
      setTempHeight(null);
      Animated.spring(heightAnimation, {
        toValue: DEFAULT_HEIGHT_PX,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // In between - do nothing
      console.log('[TAP] 🔇 At intermediate height - Ignoring tap');
    }
  };

  const handleExpandSheet = React.useCallback(() => {
    console.log('[EXPAND] 📈 Expanding to DEFAULT');
    setContainerHeight(DEFAULT_HEIGHT_PX);
    setIsCollapsed(false);
    setTempHeight(null);
    Animated.spring(heightAnimation, {
      toValue: DEFAULT_HEIGHT_PX,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [DEFAULT_HEIGHT_PX, heightAnimation]);

  const handleEnterSearchMode = React.useCallback(() => {
    if (isSearchModeExiting) {
      console.log('[TRANSIT SEARCH] ⛔️ Enter blocked (exiting)');
      return;
    }
    if (ignoreSearchPressRef.current) {
      console.log('[TRANSIT SEARCH] ⛔️ Enter blocked (guard)');
      return;
    }
    console.log('[TRANSIT SEARCH] ✅ Enter search mode');
    // Check current panel height
    const currentHeight = (heightAnimation as any)._value;
    
    setIsSearchMode(true);
    setIsCollapsed(false);
    
    // If panel is already at MAX_HEIGHT (fully expanded), skip height animation
    if (currentHeight >= MAX_HEIGHT_PX - 10) { // Allow 10 pixel tolerance
      // Just fade in backdrop without height animation - use native driver
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true, // opacity supported by native driver
      }).start();
      return;
    }
    
    // Animate height expansion and backdrop in parallel for smoother feel
    Animated.parallel([
      Animated.spring(heightAnimation, {
        toValue: MAX_HEIGHT_PX,
        useNativeDriver: false, // height not supported by native driver
        tension: 50,
        friction: 8,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true, // opacity supported by native driver
      }),
    ]).start(() => {
      setContainerHeight(MAX_HEIGHT_PX);
    });
  }, [isSearchModeExiting, MAX_HEIGHT_PX, heightAnimation, backdropOpacity]);

  const handleExitSearchMode = React.useCallback(() => {
    Keyboard.dismiss();
    console.log('[TRANSIT SEARCH] 🚪 Exit search mode');
    console.log('[TRANSIT SEARCH] 📍 Height before exit:', (heightAnimation as any)._value);
    // Lock dragging during exit transition
    isDragLockedRef.current = true;
    setIsSearchModeExiting(true);
    setIsSearchMode(false);
    setIsCollapsed(false);
    setTempHeight(null);
    setContainerHeight(DEFAULT_HEIGHT_PX);
    setKeyboardHeight(0);
    
    // Stop any ongoing animations and reset values immediately
    heightAnimation.stopAnimation();
    backdropOpacity.stopAnimation();
    translateY.stopAnimation();
    heightAnimation.setValue(DEFAULT_HEIGHT_PX);
    backdropOpacity.setValue(0);
    translateY.setValue(0);
    console.log('[TRANSIT SEARCH] 📍 Height reset to default');
    
    // Parallel animations for smoother exit transition (duration reduced for snappier feel)
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true, // opacity supported by native driver
      }),
      Animated.spring(heightAnimation, {
        toValue: DEFAULT_HEIGHT_PX,
        useNativeDriver: false, // height not supported by native driver
        tension: 50,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false, // keep consistent with height animation
      }),
    ]).start(() => {
      setContainerHeight(DEFAULT_HEIGHT_PX);
      isDragLockedRef.current = false;
      setIsSearchModeExiting(false);
      console.log('[TRANSIT SEARCH] 🔓 Drag unlocked');
    });
  }, [DEFAULT_HEIGHT_PX, heightAnimation, backdropOpacity, translateY]);

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
      
      // Only snap if drag distance is significant (> 20px)
      // This prevents content resizing (like selection borders) from triggering snaps
      if (Math.abs(dy) > 20) {
        console.log('[DRAG] 📏 Drag distance:', Math.abs(dy), '- Snapping');
        handleDrag({ dy, vy: velocity });
      } else {
        console.log('[DRAG] 📏 Drag distance:', Math.abs(dy), '- Too small, ignoring');
      }
      handleDragEnd();
    }
  };

  // Use cached animated style to avoid re-computing on every render
  // Keep sheet animations on JS driver since height is not supported natively
  const animatedStyle = React.useMemo(
    () => ({
      height: heightAnimation,
    }),
    [heightAnimation]
  );

  return {
    isCollapsed,
    isSearchMode,
    isSearchModeExiting,
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
    backdropOpacity,
    heightAnimation,
    keyboardHeight,
    MIN_HEIGHT: MIN_HEIGHT_PX,
    MAX_HEIGHT: MAX_HEIGHT_PX,
    resetToDefault,
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

    return buildBusRoutes(sortedShuttles, busStopColorMap);
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
        marginTop: 0,
      }}
    >
      <ActionButton
        label="Open in Maps"
        onPress={onOpenMaps}
        variant="secondary"
        labelOffsetY={0}
        fullWidth={!shouldStackActions}
      />
      <ActionButton
        label="Start navigation"
        onPress={onNavigate}
        variant="primary"
        icon={<NavigationArrowIcon fill="#FFFFFF" />}
        labelOffsetY={0}
        iconOffsetY={-2}
        fullWidth={!shouldStackActions}
      />
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
            top: -2,
            right: 4,
            transform: [{ translateX: 6 }],
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
                      {busStopRoutes.slice(0, 3).map((route, index) => (
                        <BusRouteCard key={`${route.route}-${index}`} route={route} />
                      ))}
                      {busStopRoutes.length < 3 &&
                        Array.from({ length: 3 - busStopRoutes.length }).map(
                          (_, i) => <View key={`empty-${i}`} className="flex-1" />
                        )}
                    </View>
                    {busStopRoutes.length > 3 && (
                      <View className="flex-row gap-2">
                        {busStopRoutes.slice(3, 6).map((route, index) => (
                          <BusRouteCard key={`${route.route}-${index + 3}`} route={route} />
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
                .map((h: { closed?: boolean; days: string; open?: string; close?: string }) =>
                  h.closed ? `${h.days}: Closed` : `${h.days}: ${h.open} - ${h.close}`
                )
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
  // Initialize location permissions on mount
  useLocation();
  
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const githubUrl = 'https://github.com/EdwardZehuaZhang';
  const supportMailto =
    'mailto:edward.zehua.zhang@gmail.com?subject=' +
    encodeURIComponent('NUS NextBus Support') +
    '&body=' +
    encodeURIComponent('Hi Edward,\n\nI need help with...\n\n');

  const openExternal = (url: string) => {
    // Prefer capability check for mailto and custom schemes
    Linking.canOpenURL(url)
      .then((canOpen) => {
        if (canOpen) return Linking.openURL(url);
        throw new Error('Cannot open URL');
      })
      .catch(() => {
        // Silent catch to avoid crashing if no handler is available
      });
  };

  const openPrivacy = () => {
    router.push('/privacy');
  };

  const openTerms = () => {
    router.push('/terms');
  };

  const openSupport = () => {
    Linking.canOpenURL(supportMailto)
      .then((canOpen) => {
        if (canOpen) return Linking.openURL(supportMailto);
        showMessage({
          message: 'No mail app available',
          description: 'Please install or configure an email app.',
          type: 'warning',
        });
      })
      .catch(() => {
        showMessage({
          message: 'Unable to open email',
          description: 'Please try again or check your mail app.',
          type: 'danger',
        });
      });
  };
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<string>('CLB');
  const [selectedRoute, setSelectedRoute] = React.useState<string | null>(null);
  const [mapSelection, setMapSelection] = React.useState<MapSelection | null>(null);
  
  // Track previous state for toggling route selection
  const [previousState, setPreviousState] = React.useState<{
    selectedRoute: string | null;
    activeTab: string;
    mapFilters: Record<string, boolean>;
  } | null>(null);

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
    isSearchModeExiting,
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
    backdropOpacity,
    heightAnimation,
    keyboardHeight,
    MIN_HEIGHT,
    MAX_HEIGHT,
    resetToDefault,
  } = useDragHandlers();

  const handleRouteToggle = React.useCallback((routeName: string) => {
    // If clicking the same route that's already selected, restore previous state
    if (selectedRoute === routeName && previousState) {
      setSelectedRoute(previousState.selectedRoute);
      setActiveTab(previousState.activeTab);
      setMapFilters(previousState.mapFilters);
      setPreviousState(null);
      // Also sync the map filters back to storage
      storage.set('map-filters', JSON.stringify(previousState.mapFilters));
    } else if (selectedRoute === routeName) {
      // If no previous state exists, just deselect
      setSelectedRoute(null);
    } else if (selectedRoute === null) {
      // Only save previous state when no route is currently selected
      // This keeps the state frozen until the selected route is toggled off
      setPreviousState({
        selectedRoute,
        activeTab,
        mapFilters: JSON.parse(JSON.stringify(mapFilters)), // Deep copy to prevent mutation
      });
      setSelectedRoute(routeName);
    } else {
      // If a route is already selected and user clicks a different route, just change the selection
      // without updating previousState (keeping it frozen)
      setSelectedRoute(routeName);
    }
  }, [selectedRoute, previousState, activeTab, mapFilters]);

  const handleRouteClick = (routeName: string) => {
    handleRouteToggle(routeName);
  };

  React.useEffect(() => {
    if (mapSelection) {
      setMapSelection(null);
    }
  }, [activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      resetToDefault();
      return () => {
        setMapSelection(null);
      };
    }, [resetToDefault])
  );

  // Track if component has mounted to avoid flickering on initial focus changes
  const isMountedRef = React.useRef(false);
  React.useEffect(() => {
    isMountedRef.current = true;
  }, []);

  // Store the map type change handler from InteractiveMap
  const mapTypeChangeHandlerRef = React.useRef<
    ((mapType: 'standard' | 'satellite' | 'hybrid' | 'terrain') => void) | null
  >(null);

  const handleMapTypeChange = (
    mapType: 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'dark' | 'light' | any
  ) => {
    if (mapTypeChangeHandlerRef.current) {
      // On native, pass through standard/satellite/hybrid/terrain types
      // The interactive-map native version will handle these
      if (['standard', 'satellite', 'hybrid', 'terrain'].includes(mapType)) {
        mapTypeChangeHandlerRef.current(mapType);
      }
    }
  };

  const handleFilterChange = (filters: Record<string, boolean>) => {
    console.log('Filter changes:', filters);
    
    // Check if a bus route was selected/deselected in the filter panel
    const busRouteFilters = [
      'bus-route-a1',
      'bus-route-a2',
      'bus-route-d1',
      'bus-route-d2',
      'bus-route-k',
      'bus-route-r1',
      'bus-route-r2',
      'bus-route-p',
    ];
    
    let newSelectedRoute: string | null = null;
    for (const routeFilter of busRouteFilters) {
      if (filters[routeFilter]) {
        // Extract route name from filter id (e.g., 'bus-route-d1' -> 'D1')
        newSelectedRoute = routeFilter.replace('bus-route-', '').toUpperCase();
        break;
      }
    }
    
    // If the selected route from filters is different from current selectedRoute,
    // use the toggle logic to update state and save previous state
    let isRestoringPreviousState = false;
    if (newSelectedRoute !== selectedRoute) {
      // Save previous state before changing selection, but only if no route is currently selected
      if (newSelectedRoute && !selectedRoute) {
        // Selecting a new route from filter panel - only save state if none is currently selected
        setPreviousState({
          selectedRoute,
          activeTab,
          mapFilters: JSON.parse(JSON.stringify(mapFilters)), // Deep copy to prevent mutation
        });
      } else if (!newSelectedRoute && selectedRoute) {
        // Deselecting route from filter panel - restore to previous state if available
        if (previousState) {
          setActiveTab(previousState.activeTab);
          setMapFilters(previousState.mapFilters);
          storage.set('map-filters', JSON.stringify(previousState.mapFilters));
          setPreviousState(null);
          isRestoringPreviousState = true;
        }
      }
      // If a route is already selected and user selects a different route via filter,
      // just change the selection without updating previousState (keeping it frozen)
      
      setSelectedRoute(newSelectedRoute);
    }
    
    // Only update mapFilters if we're not restoring from previousState
    if (!isRestoringPreviousState) {
      setMapFilters(filters);
      storage.set('map-filters', JSON.stringify(filters));
    }
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
          activeRoute={(selectedRoute?.toUpperCase() ?? null) as any} // Pass selected route to show real-time buses (ensure uppercase)
          onActiveRouteChange={(route: any) => setSelectedRoute(route)} // Sync filter selection back to transit page
          showBusStops={true} // Show bus stop markers with labels
          showLandmarks={true} // Show landmarks (hospital, MRT, library) when zoomed in
          showMapControls={false} // Disable map controls in InteractiveMap, we'll render them at top level
          mapFilters={mapFilters} // Pass filters from parent
          onMapFiltersChange={handleFilterChange} // Handle filter changes
          onMapItemSelect={(selection: MapSelection | null) => {
            // If the sheet is collapsed, expand back to default when a location is picked
            if (selection && isCollapsed) {
              resetToDefault();
            }
            setMapSelection(selection);
          }}
          selectedMapItem={mapSelection}
          onMapTypeChangeReady={(handler: (mapType: 'standard' | 'satellite' | 'hybrid' | 'terrain') => void) => {
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
            paddingBottom: 20 + keyboardHeight,
            paddingTop: 4,
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
            marginTop: 'auto',
            position: 'relative',
            zIndex: 10001,
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
          isSearchModeExiting={isSearchModeExiting}
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

      {isInfoOpen && (
        <View
          style={{
            position: 'absolute' as any,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 20000,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pressable
            onPress={() => setIsInfoOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
            }}
          />
          <View
            style={{
              width: 320,
              borderRadius: 16,
              backgroundColor: '#FFFFFF',
              padding: 20,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '500', color: '#111827' }}>
                Info
              </Text>
              <Pressable
                onPress={() => setIsInfoOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={{ padding: 6 }}
              >
                <Text style={{ fontSize: 16, color: '#6B7280' }}>✕</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                setIsInfoOpen(false);
                openPrivacy();
              }}
              style={{
                marginTop: 16,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#274F9C' }}>
                Privacy Policy
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsInfoOpen(false);
                openTerms();
              }}
              style={{
                marginTop: 8,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#274F9C' }}>
                Terms of Service
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsInfoOpen(false);
                openSupport();
              }}
              style={{
                marginTop: 8,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#274F9C' }}>
                Contact Support
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsInfoOpen(false);
                openExternal(githubUrl);
              }}
              style={{
                marginTop: 8,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#274F9C' }}>
                Developer GitHub
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Map controls - always visible like bottom panel */}
      <View
        style={{
          position: 'absolute' as any,
          top: insets.top + 8,
          right: 20,
          zIndex: 80,
        }}
      >
        <MapTypeSelector
          onMapTypeChange={handleMapTypeChange}
          onFilterChange={handleFilterChange}
          filters={mapFilters}
        />
      </View>
      <View
        style={{
          position: 'absolute' as any,
          top: insets.top + 2,
          left: 20,
          zIndex: 10000,
        }}
      >
        <Pressable
          onPress={() => setIsInfoOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Info"
          style={{
            padding: 6,
          }}
        >
          <Info size={22} color="rgba(0, 0, 0, 0.4)" />
        </Pressable>
      </View>
    </View>
  );
}
