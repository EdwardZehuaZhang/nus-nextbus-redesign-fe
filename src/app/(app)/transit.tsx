import { router } from 'expo-router';
import React from 'react';
import { Animated, TextInput } from 'react-native';

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
import {
  getPlaceAutocomplete,
  getPlaceDetails,
} from '@/api/google-maps/places';
import type { PlaceAutocompleteResult } from '@/api/google-maps/types';
import { Frame } from '@/components/frame';
import { InteractiveMap } from '@/components/interactive-map.web';
import { MapTypeSelector } from '@/components/map-type-selector';
import {
  FocusAwareStatusBar,
  Image,
  Pressable,
  ScrollView,
  Text,
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
import {
  type BusStation,
  getBusStationById,
  searchBusStations,
} from '@/lib/bus-stations';
import { type LocationCoords, useLocation } from '@/lib/hooks/use-location';
import { type FavoriteRoute, getFavorites } from '@/lib/storage/favorites';
import {
  addRecentSearch,
  getRecentSearches,
} from '@/lib/storage/recent-searches';

type BusRoute = {
  route: string;
  color: string;
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
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        transform: isSelected ? [{ scale: 1.05 }] : [{ scale: 1 }],
      }}
    >
      <View
        className="flex-1"
        style={{
          borderWidth: isSelected ? 3 : 0,
          borderColor: isSelected ? route.color : 'transparent',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {/* Route Header */}
        <View
          className="h-8 items-center justify-center shadow-sm"
          style={{ backgroundColor: route.color }}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: '#FFFFFF' }}
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
      className="border border-t-0 border-neutral-200"
      style={{
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
        overflow: 'hidden',
      }}
    >
      {validTimes.map((timeItem, index) => {
        const isLast = index === validTimes.length - 1;
        return (
          <View key={index}>
            <View className="flex-row items-center justify-between bg-white px-3 py-2">
              <DynamicBusTime
                time={timeItem.time}
                textColor={timeItem.textColor}
              />
              <CrowdingIndicator crowding={timeItem.crowding} />
            </View>
            {!isLast && (
              <View className="h-px bg-neutral-200" style={{ marginTop: -1 }} />
            )}
          </View>
        );
      })}
    </View>
  );
};

const SearchBar = ({ onSearchPress }: { onSearchPress?: () => void }) => {
  const [searchText, setSearchText] = React.useState('');

  const handleSearchPress = () => {
    console.log('[SEARCH BAR] 🖱️ Search bar pressed/focused');
    if (onSearchPress) {
      onSearchPress();
    }
  };

  const handleFocus = () => {
    // Trigger search mode when user focuses on search
    handleSearchPress();
  };

  return (
    <Pressable onPress={handleSearchPress}>
      <View className="mb-4 flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <SearchIcon />
        <TextInput
          className="flex-1 text-base text-neutral-900"
          placeholder="Search for location..."
          placeholderTextColor="#737373"
          value={searchText}
          onChangeText={setSearchText}
          onFocus={handleFocus}
          style={{ outlineWidth: 0 }}
        />
      </View>
    </Pressable>
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

const SearchResultItem = ({
  item,
  isLast,
  onPress,
}: {
  item: BusStation;
  isLast: boolean;
  onPress: () => void;
}) => {
  const IconComponent = item.icon;
  return (
    <View>
      <Pressable className="flex-row items-center gap-2 py-3" onPress={onPress}>
        <View className="size-9 items-center justify-center rounded-full bg-neutral-100 p-2">
          <IconComponent className="size-5" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-neutral-900">
            {item.name}
          </Text>
        </View>
      </Pressable>
      {!isLast && <View className="my-1 h-px w-full bg-neutral-200" />}
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
      className="overflow-hidden rounded-md border border-neutral-200 shadow-sm"
      style={{ width: showAllPopular ? '100%' : 154, height: 116 }}
      onPress={onPress}
    >
      <View className="relative size-full">
        <Image
          source={{ uri: item.image }}
          className="size-full"
          style={{ resizeMode: 'cover' }}
        />
        <View className="absolute inset-0 bg-black/40" />
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

const FavoriteButton = ({ item, userLocation }: { item: FavoriteRoute; userLocation: LocationCoords | null }) => {
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
    // Navigate to navigation page with the route and user location
    router.push({
      pathname: '/(app)/navigation',
      params: {
        from: item.fromId,
        to: item.toId,
        userLat: userLocation?.latitude?.toString(),
        userLng: userLocation?.longitude?.toString(),
      },
    });
  };

  return (
    <Pressable
      className="min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm"
      onPress={handlePress}
    >
      {renderIcons()}
      <Text
        className="whitespace-nowrap text-center text-sm font-medium leading-tight"
        style={{ color: '#274F9C' }}
        numberOfLines={1}
      >
        {item.from} - {item.to}
      </Text>
    </Pressable>
  );
};

const AddButton = () => {
  const handlePress = () => {
    // TODO: Open a modal to add a new favorite
    router.push('/search');
  };

  return (
    <Pressable
      className="size-12 items-center justify-center self-center"
      onPress={handlePress}
    >
      <PlusIcon width={20} height={20} fill="#274F9C" />
    </Pressable>
  );
};

const FavoritesSection = () => {
  const [favorites, setFavorites] = React.useState<FavoriteRoute[]>([]);
  
  // Get user's current location to pass to navigation
  const { coords: userLocation } = useLocation();

  // Load favorites from storage
  React.useEffect(() => {
    const loadFavorites = () => {
      const stored = getFavorites();
      setFavorites(stored);
    };

    loadFavorites();

    // Set up an interval to refresh favorites (in case they're added from another screen)
    const interval = setInterval(loadFavorites, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-neutral-500">
        Favourites
      </Text>
      {favorites.length === 0 ? (
        <View className="rounded-2xl bg-white p-4">
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
            <FavoriteButton key={item.id} item={item} userLocation={userLocation} />
          ))}
          <AddButton />
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

  // Fetch all bus stops from the API
  const { data: busStopsData } = useBusStops();

  // Calculate nearest stops based on user location
  const nearestStops = React.useMemo(() => {
    if (!userLocation || !busStopsData?.BusStopsResult?.busstops) {
      // Return empty array if no location - we'll show error message instead
      return [];
    }

    const stops = busStopsData.BusStopsResult.busstops
      .map((stop) => {
        const distance = calculateDistance({
          lat1: userLocation.latitude,
          lon1: userLocation.longitude,
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
  }, [userLocation, busStopsData]);

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
        // Remove "PUB:" prefix from public bus routes
        const routeName = shuttle.name.replace(/^PUB:/, '');

        // Use special color for public buses, otherwise use route color
        const isPublicBus = shuttle.name.startsWith('PUB:');
        const routeColor = isPublicBus
          ? '#55DD33'
          : getRouteColor(shuttle.name, colorMap[shuttle.name]);

        return {
          route: routeName,
          color: routeColor,
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
      <Text className="mb-2 text-sm font-medium text-neutral-500">
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
  const [searchResults, setSearchResults] = React.useState<BusStation[]>([]);
  const [googlePlaceResults, setGooglePlaceResults] = React.useState<
    PlaceAutocompleteResult[]
  >([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = React.useState(false);
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

  // Handle search input changes
  React.useEffect(() => {
    const searchPlaces = async () => {
      if (searchText.trim().length > 0) {
        // Search local bus stations
        const busStationResults = searchBusStations(searchText);
        setSearchResults(busStationResults);

        // Search Google Places using JavaScript API (for web only)
        if (typeof window !== 'undefined' && window.google) {
          setIsSearchingGoogle(true);
          try {
            const service = new window.google.maps.places.AutocompleteService();

            // Define NUS campus bounds (approximate)
            const nusBounds = new window.google.maps.LatLngBounds(
              new window.google.maps.LatLng(1.29, 103.77), // Southwest corner
              new window.google.maps.LatLng(1.305, 103.785) // Northeast corner
            );

            service.getPlacePredictions(
              {
                input: searchText,
                locationRestriction: nusBounds, // Restrict to NUS campus bounds only
              },
              (predictions, status) => {
                if (
                  status === window.google.maps.places.PlacesServiceStatus.OK &&
                  predictions
                ) {
                  // Filter results to only include those within NUS campus
                  const filteredPredictions = predictions.filter((p) => {
                    // Check if description contains NUS-related keywords
                    const desc = p.description.toLowerCase();
                    return (
                      desc.includes('nus') ||
                      desc.includes('national university of singapore') ||
                      desc.includes('kent ridge') ||
                      desc.includes('utown') ||
                      desc.includes('university town')
                    );
                  });

                  // Convert Google Maps API format to our format
                  const converted = filteredPredictions.map((p) => ({
                    description: p.description,
                    matched_substrings: p.matched_substrings || [],
                    place_id: p.place_id,
                    reference: p.place_id, // Use place_id as reference
                    structured_formatting: p.structured_formatting,
                    terms: p.terms || [],
                    types: p.types || [],
                  }));
                  setGooglePlaceResults(converted);
                } else {
                  setGooglePlaceResults([]);
                }
                setIsSearchingGoogle(false);
              }
            );
          } catch (error) {
            console.error('Google Places search error:', error);
            setGooglePlaceResults([]);
            setIsSearchingGoogle(false);
          }
        } else {
          setGooglePlaceResults([]);
        }
      } else {
        setSearchResults([]);
        setGooglePlaceResults([]);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(searchPlaces, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText, userLocation]);

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
    try {
      // Get detailed information including coordinates
      const details = await getPlaceDetails(place.place_id);

      // Navigate to navigation page with place details and user location
      router.push({
        pathname: '/navigation' as any,
        params: {
          destination: place.structured_formatting.main_text,
          destinationAddress: place.description,
          destinationLat: details.result.geometry.location.lat.toString(),
          destinationLng: details.result.geometry.location.lng.toString(),
          userLat: userLocation?.latitude?.toString(),
          userLng: userLocation?.longitude?.toString(),
        },
      });
    } catch (error) {
      console.error('Error getting place details:', error);
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
      return (
        <View className="w-full" style={{ gap: 8 }}>
          <View className="w-full flex-row" style={{ gap: 8 }}>
            <View className="flex-1" style={{ gap: 8 }}>
              {displayItems
                .filter((_, index) => index % 2 === 0)
                .map((item) => renderPopularItem(item))}
            </View>
            <View className="flex-1" style={{ gap: 8 }}>
              {displayItems
                .filter((_, index) => index % 2 === 1)
                .map((item) => renderPopularItem(item))}
            </View>
          </View>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {displayItems.map((item) => renderPopularItem(item))}
      </ScrollView>
    );
  };

  return (
    <>
      {/* Search Header */}
      <View className="mb-5 flex-row items-center gap-4">
        <View className="flex-1 flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
          <SearchIcon />
          <TextInput
            className="flex-1 text-base text-neutral-900"
            placeholder="Search for location..."
            placeholderTextColor="#737373"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus={true}
            style={{ outlineWidth: 0 }}
          />
        </View>
        <Pressable onPress={onCancel}>
          <Text className="text-base font-medium" style={{ color: '#274F9C' }}>
            Cancel
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {searchText.trim().length > 0 ? (
          <View style={{ gap: 16 }}>
            {/* Bus Station Results */}
            {searchResults.length > 0 && (
              <View>
                <Text className="mb-3 text-sm font-medium text-neutral-500">
                  Bus Stops ({searchResults.length})
                </Text>
                {searchResults.map((item, index, array) => (
                  <SearchResultItem
                    key={item.id}
                    item={item}
                    isLast={index === array.length - 1}
                    onPress={() => handleResultPress(item)}
                  />
                ))}
              </View>
            )}

            {/* Google Places Results */}
            {googlePlaceResults.length > 0 && (
              <View>
                <Text className="mb-3 text-sm font-medium text-neutral-500">
                  Other Locations ({googlePlaceResults.length})
                </Text>
                {googlePlaceResults.map((place, index) => (
                  <Pressable
                    key={place.place_id}
                    onPress={() => handleGooglePlacePress(place)}
                    className={`flex-row items-center gap-3 py-3 ${
                      index < googlePlaceResults.length - 1
                        ? 'border-b border-neutral-200'
                        : ''
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-base font-medium text-neutral-900">
                        {place.structured_formatting.main_text}
                      </Text>
                      <Text className="text-sm text-neutral-500">
                        {place.structured_formatting.secondary_text?.replace(
                          /, Singapore$/,
                          ''
                        )}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* No results message */}
            {searchResults.length === 0 &&
              googlePlaceResults.length === 0 &&
              !isSearchingGoogle && (
                <View className="items-center py-8">
                  <Text className="text-base text-neutral-500">
                    No results found for &quot;{searchText}&quot;
                  </Text>
                </View>
              )}

            {/* Loading state */}
            {isSearchingGoogle && (
              <View className="items-center py-4">
                <Text className="text-sm text-neutral-500">
                  Searching locations...
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View className="mb-8">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-neutral-500">
                    Recents
                  </Text>
                  {recentSearches.length > 3 && (
                    <Pressable onPress={() => setShowAllRecent(!showAllRecent)}>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: '#274F9C' }}
                      >
                        {showAllRecent ? 'View Less' : 'View More'}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <View>
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
              </View>
            )}

            {/* Popular Searches */}
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-neutral-500">
                  Popular Searches
                </Text>
                <Pressable onPress={() => setShowAllPopular(!showAllPopular)}>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: '#274F9C' }}
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
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onExpandSheet: () => void;
  onSearchPress: () => void;
  onCancelSearch: () => void;
  selectedRoute: string | null;
  onRouteClick: (routeName: string) => void;
}) => {
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

          <FavoritesSection />
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
  const translateY = React.useRef(new Animated.Value(0)).current;
  const heightAnimation = React.useRef(new Animated.Value(45)).current; // Add animated value for height
  const backdropOpacity = React.useRef(new Animated.Value(0)).current; // Add animated value for backdrop opacity
  const startHeight = React.useRef(45);
  const dragStartY = React.useRef(0);
  const dragStartTime = React.useRef(0);
  const isDragging = React.useRef(false);

  const MIN_HEIGHT = 10; // Minimum height - just search bar visible
  const MAX_HEIGHT = 85; // Maximum height - like search mode
  const DEFAULT_HEIGHT = 45; // Default state

  const handleDragMove = (dy: number) => {
    // Don't allow drag when in search mode
    if (isSearchMode) return;

    // Store the starting height when drag begins
    if (tempHeight === null) {
      startHeight.current = containerHeight;
    }

    // Convert dy (pixels) to percentage of screen height
    // Assuming average screen height ~800px, so 1% = 8px
    const screenHeight =
      typeof window !== 'undefined' ? window.innerHeight : 800;
    const heightChange = (dy / screenHeight) * 100;

    // Calculate new height (dragging down increases dy, so we subtract)
    let newHeight = startHeight.current - heightChange;

    // Clamp between MIN and MAX
    newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));

    setTempHeight(newHeight);
    setContainerHeight(newHeight);
  };

  const handleDrag = (gestureState: { dy: number; vy: number }) => {
    // This is called on drag end with velocity
    const currentHeight = tempHeight ?? containerHeight;
    const { dy, vy } = gestureState;

    let targetHeight = DEFAULT_HEIGHT;
    let collapsed = false;

    console.log('[DRAG] 📏 Drag ended at height:', currentHeight, 'velocity:', vy);

    // Smart snapping based on current position and velocity
    // Consider both where we are and where we're going
    // Three states: MIN (10%) -> DEFAULT (45%) -> MAX (85%)
    
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
      } else if (currentHeight > 65) {
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
    
    heightAnimation.setValue(targetHeight);
    console.log('[DRAG] ✅ Final height set to:', targetHeight, '- heightAnimation synced');
  };

  const handleDragEnd = () => {
    // Do nothing - all snapping logic is handled in handleDrag
    // This is called after handleDrag by the Frame component
    // We don't want to override the snap decision made in handleDrag
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

  const animatedStyle = isSearchMode
    ? {
        height: heightAnimation.interpolate({
          inputRange: [DEFAULT_HEIGHT, MAX_HEIGHT],
          outputRange: [`${DEFAULT_HEIGHT}%`, `${MAX_HEIGHT}%`],
        }),
      }
    : {
        height: `${containerHeight}%` as any,
        transform: [
          {
            translateY: translateY.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 700], // 0 for normal, 700 for collapsed
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
    handleExpandSheet,
    handleEnterSearchMode,
    handleExitSearchMode,
    animatedStyle,
    dragStartY,
    dragStartTime,
    isDragging,
    backdropOpacity,
  };
};

/* eslint-disable max-lines-per-function */
export default function TransitPage() {
  const [activeTab, setActiveTab] = React.useState<string>('CLB');
  const [selectedRoute, setSelectedRoute] = React.useState<string | null>(null);
  const [mapFilters, setMapFilters] = React.useState<Record<string, boolean>>(
    () => {
      const defaultFilters = {
        important: true,
        academic: false,
        residences: false,
        'bus-stops': false,
        'bus-route-d2': true,
      };

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('map-filters');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Always override academic to be false on initial load
            return { ...parsed, academic: false };
          } catch (error) {
            console.error('Error loading map filters:', error);
          }
        }
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
    handleExpandSheet,
    handleEnterSearchMode,
    handleExitSearchMode,
    animatedStyle,
    dragStartY,
    dragStartTime,
    isDragging,
    backdropOpacity,
  } = useDragHandlers();

  const handleRouteClick = (routeName: string) => {
    setSelectedRoute((prev) => (prev === routeName ? null : routeName));
  };

  // Store the map type change handler from InteractiveMap
  const mapTypeChangeHandlerRef = React.useRef<
    ((mapType: google.maps.MapTypeId | 'dark' | 'light') => void) | null
  >(null);

  const handleMapTypeChange = (
    mapType: google.maps.MapTypeId | 'dark' | 'light'
  ) => {
    if (mapTypeChangeHandlerRef.current) {
      mapTypeChangeHandlerRef.current(mapType);
    }
  };

  const handleFilterChange = (filters: Record<string, boolean>) => {
    console.log('Filter changes:', filters);
    setMapFilters(filters);
    if (typeof window !== 'undefined') {
      localStorage.setItem('map-filters', JSON.stringify(filters));
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
          initialRegion={{
            latitude: 1.2995493,
            longitude: 103.7769916,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          style={{ width: '100%', height: '100%' }}
          showD1Route={selectedRoute === 'D1'}
          activeRoute={selectedRoute as any} // Pass selected route to show real-time buses
          onActiveRouteChange={(route) => setSelectedRoute(route)} // Sync filter selection back to transit page
          showBusStops={true} // Show bus stop markers with labels
          showLandmarks={true} // Show landmarks (hospital, MRT, library) when zoomed in
          showMapControls={false} // Disable map controls in InteractiveMap, we'll render them at top level
          mapFilters={mapFilters} // Pass filters from parent
          onMapFiltersChange={handleFilterChange} // Handle filter changes
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
          pointerEvents: 'none', // Allow touches to pass through
        }}
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
        onTouchStart={(e: any) => {
          const touch = e.nativeEvent.touches?.[0];
          if (touch && dragStartY && isDragging && dragStartTime) {
            dragStartY.current = touch.pageY;
            dragStartTime.current = Date.now();
            isDragging.current = true;
          }
        }}
        onTouchMove={(e: any) => {
          if (!isDragging || !isDragging.current) return;
          const touch = e.nativeEvent.touches?.[0];
          if (touch && dragStartY) {
            const dy = touch.pageY - dragStartY.current;
            handleDragMove(dy);
          }
        }}
        onTouchEnd={(e: any) => {
          if (!isDragging || !isDragging.current) return;
          const touch = e.nativeEvent.changedTouches?.[0];
          if (touch && dragStartY && dragStartTime) {
            const dy = touch.pageY - dragStartY.current;
            const dt = Date.now() - dragStartTime.current;
            const vy = dy / dt;
            handleDrag({ dy, vy });
            isDragging.current = false;
          }
        }}
      >
        <View className="mb-3 items-center">
          <Frame 
            onDrag={handleDrag}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
        </View>

        <BottomSheetContent
          isCollapsed={isCollapsed}
          isSearchMode={isSearchMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onExpandSheet={handleExpandSheet}
          onSearchPress={handleEnterSearchMode}
          onCancelSearch={handleExitSearchMode}
          selectedRoute={selectedRoute}
          onRouteClick={handleRouteClick}
        />
      </Animated.View>

      {/* Map controls - rendered at top level to ensure proper z-index stacking */}
      <View
        style={{
          position: 'absolute' as any,
          top: 40,
          right: 20,
          zIndex: 99999,
        }}
        pointerEvents="box-none"
      >
        <MapTypeSelector
          onMapTypeChange={handleMapTypeChange}
          onFilterChange={handleFilterChange}
          filters={mapFilters}
        />
      </View>
    </View>
  );
}
