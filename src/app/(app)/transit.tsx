import { router } from 'expo-router';
import React from 'react';
import { Animated, TextInput } from 'react-native';

import {
  formatArrivalTime,
  getRouteColor,
  passengerLoadToCrowding,
  useServiceDescriptions,
  useShuttleService,
} from '@/api';
import { Frame } from '@/components/frame';
import { InteractiveMap } from '@/components/interactive-map.web';
import {
  FocusAwareStatusBar,
  Image,
  Pressable,
  SafeAreaView,
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

const tabs: TabItem[] = [
  { id: 'CENLIB', label: 'Central Library (3min walk)' },
  { id: 'PGP', label: 'PGP Foyer' },
];

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

// Dynamic font size component for bus timing
const DynamicBusTime = ({
  time,
  textColor,
}: {
  time: string;
  textColor?: string;
}) => {
  return (
    <View style={{ flex: 1, maxWidth: '100%', minWidth: 0 }}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        className="font-medium"
        style={{
          color: textColor,
          fontSize: 16, // Base size (text-base)
        }}
      >
        {time}
      </Text>
    </View>
  );
};

const BusRouteCard = ({ route }: { route: BusRoute }) => {
  return (
    <View className="flex-1">
      {/* Route Header */}
      <View
        className="h-8 items-center justify-center rounded-t-md shadow-sm"
        style={{ backgroundColor: route.color }}
      >
        <Text className="text-base font-semibold" style={{ color: '#FFFFFF' }}>
          {route.route}
        </Text>
      </View>

      {/* Times List - Only show first 2 times (next bus and next next bus) */}
      <View className="rounded-b-md border border-t-0 border-neutral-200">
        {route.times.slice(0, 2).map((timeItem, index) => (
          <View key={index}>
            <View className="flex-row items-center justify-between bg-white px-3 py-2">
              <DynamicBusTime time={timeItem.time} textColor={timeItem.textColor} />
              <CrowdingIndicator crowding={timeItem.crowding} />
            </View>
            {index < 1 && <View className="h-px bg-neutral-200" />}
          </View>
        ))}
      </View>
    </View>
  );
};

const SearchBar = ({ onSearchPress }: { onSearchPress?: () => void }) => {
  const [searchText, setSearchText] = React.useState('');

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    }
  };

  const handleFocus = () => {
    // Trigger search mode when user focuses on search
    handleSearchPress();
  };

  return (
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
      {tabs.map((tab, index) => (
        <View key={tab.id} className="flex-row">
          <Pressable
            className={`border-neutral-200 px-4 py-2 ${
              activeTab === tab.id
                ? 'rounded-t-md border-x border-b-0 border-t bg-white'
                : 'rounded-tr-md border-y border-r bg-white opacity-60'
            } ${index === 0 ? 'border-l' : ''}`}
            onPress={() => onTabChange(tab.id)}
          >
            <Text
              className={`text-base ${
                activeTab === tab.id
                  ? 'font-medium text-neutral-900'
                  : 'font-normal text-neutral-500'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
};

const FavoriteButton = ({ item }: { item: FavoriteRoute }) => {
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
    // Navigate to navigation page with the route
    router.push({
      pathname: '/(app)/navigation',
      params: {
        from: item.fromId,
        to: item.toId,
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
            <FavoriteButton key={item.id} item={item} />
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
}: {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) => {
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

    return shuttleData.ShuttleServiceResult.shuttles.map((shuttle) => ({
      route: shuttle.name,
      color: getRouteColor(shuttle.name, colorMap[shuttle.name]),
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
    }));
  }, [shuttleData, colorMap]);

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-medium text-neutral-500">
        Nearest Stops
      </Text>

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

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
                <BusRouteCard key={route.route} route={route} />
              ))}
              {currentBusRoutes.length < 3 &&
                Array.from({ length: 3 - currentBusRoutes.length }).map(
                  (_, i) => <View key={`empty-${i}`} className="flex-1" />
                )}
            </View>
            {currentBusRoutes.length > 3 && (
              <View className="flex-row gap-2">
                {currentBusRoutes.slice(3, 6).map((route) => (
                  <BusRouteCard key={route.route} route={route} />
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
    </View>
  );
};

/* eslint-disable max-lines-per-function */
const SearchContent = ({ onCancel }: { onCancel: () => void }) => {
  const [searchText, setSearchText] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<BusStation[]>([]);
  const [recentSearches, setRecentSearches] = React.useState<
    RecentSearchItem[]
  >([]);
  const [showAllRecent, setShowAllRecent] = React.useState(false);
  const [showAllPopular, setShowAllPopular] = React.useState(false);

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
    if (searchText.trim().length > 0) {
      const results = searchBusStations(searchText);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchText]);

  const handleResultPress = (item: BusStation) => {
    addRecentSearch(item);
    // Navigate to navigation page
    router.push({
      pathname: '/navigation' as any,
      params: { destination: item.name },
    });
  };

  const handleRecentPress = (item: RecentSearchItem) => {
    const station = getBusStationById(item.id);
    if (station) {
      addRecentSearch(station);
      router.push({
        pathname: '/navigation' as any,
        params: { destination: item.title },
      });
    }
  };

  const renderPopularItem = (item: PopularSearchItem) => {
    const handleNavPress = () => {
      router.push({
        pathname: '/navigation' as any,
        params: { destination: item.title.replace('\n', ' ') },
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
          <View>
            {searchResults.length > 0 ? (
              <View>
                <Text className="mb-3 text-sm font-medium text-neutral-500">
                  Search Results ({searchResults.length})
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
            ) : (
              <View className="items-center py-8">
                <Text className="text-base text-neutral-500">
                  No results found for &quot;{searchText}&quot;
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
}: {
  isCollapsed: boolean;
  isSearchMode: boolean;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onExpandSheet: () => void;
  onSearchPress: () => void;
  onCancelSearch: () => void;
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
  const translateY = React.useRef(new Animated.Value(0)).current;

  const handleDrag = (gestureState: { dy: number; vy: number }) => {
    // Don't allow drag when in search mode
    if (isSearchMode) return;

    const threshold = 100;
    const velocityThreshold = 0.3;

    // Dragging down - collapse
    if (gestureState.dy > threshold || gestureState.vy > velocityThreshold) {
      setIsCollapsed(true);
      setContainerHeight(45);
      Animated.spring(translateY, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
    // Dragging up - expand
    else if (
      gestureState.dy < -threshold ||
      gestureState.vy < -velocityThreshold
    ) {
      setIsCollapsed(false);
      setContainerHeight(80); // Expand to 80%
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
    // Small drag - return to current state
    else {
      Animated.spring(translateY, {
        toValue: isCollapsed ? 1 : 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleExpandSheet = () => {
    setIsCollapsed(false);
    setContainerHeight(45); // Default expanded state
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleEnterSearchMode = () => {
    setIsSearchMode(true);
    setIsCollapsed(false);
    setContainerHeight(80);
  };

  const handleExitSearchMode = () => {
    setIsSearchMode(false);
    setContainerHeight(45); // Return to normal size
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = isSearchMode
    ? {} // No transform when in search mode
    : {
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
    handleExpandSheet,
    handleEnterSearchMode,
    handleExitSearchMode,
    animatedStyle,
  };
};

/* eslint-disable max-lines-per-function */
export default function TransitPage() {
  const [activeTab, setActiveTab] = React.useState<string>('CENLIB');
  const {
    isCollapsed,
    isSearchMode,
    containerHeight,
    handleDrag,
    handleExpandSheet,
    handleEnterSearchMode,
    handleExitSearchMode,
    animatedStyle,
  } = useDragHandlers();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
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
            latitude: 1.2976493,
            longitude: 103.7766916,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <ActionButtons />

      <Animated.View
        style={[
          {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e5e5',
            backgroundColor: 'white',
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingTop: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            height: `${containerHeight}%`,
            marginTop: 'auto',
          },
          animatedStyle,
        ]}
      >
        <View className="mb-3 items-center">
          <Frame onDrag={handleDrag} />
        </View>

        <BottomSheetContent
          isCollapsed={isCollapsed}
          isSearchMode={isSearchMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onExpandSheet={handleExpandSheet}
          onSearchPress={handleEnterSearchMode}
          onCancelSearch={handleExitSearchMode}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
