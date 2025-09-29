import { useRouter } from 'expo-router';
import * as React from 'react';
import { TextInput } from 'react-native';

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
  BookOpen,
  FirstAid,
  Search as SearchIcon,
  Train,
  Van,
} from '@/components/ui/icons';
import { searchBusStations, BusStation, getBusStationById } from '@/lib/bus-stations';
import { 
  getRecentSearches, 
  addRecentSearch, 
  RecentSearchItem as StoredRecentSearch 
} from '@/lib/storage/recent-searches';

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

export default function SearchPage() {
  const router = useRouter();
  const [searchText, setSearchText] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<BusStation[]>([]);
  const [recentSearches, setRecentSearches] = React.useState<RecentSearchItem[]>([]);
  const [showAllRecent, setShowAllRecent] = React.useState(false);
  const [showAllPopular, setShowAllPopular] = React.useState(false);

  // Load recent searches on component mount
  React.useEffect(() => {
    const loadRecentSearches = () => {
      const stored = getRecentSearches();
      // Convert stored recent searches to UI format
      const uiRecentSearches: RecentSearchItem[] = stored.map(item => ({
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

  const handleCancel = () => {
    router.back();
  };

  const toggleRecentExpanded = () => {
    setShowAllRecent(!showAllRecent);
  };

  const togglePopularExpanded = () => {
    setShowAllPopular(!showAllPopular);
  };

  const renderRecentItem = ({
    item,
    isLast,
  }: {
    item: RecentSearchItem;
    isLast: boolean;
  }) => {
    const IconComponent = item.icon;
    
    const handleRecentPress = () => {
      // Navigate to navigation page with the selected destination
      router.push({
        pathname: '/navigation' as any,
        params: { destination: item.title }
      });
      
      // Add to recent searches (this will update the timestamp)
      const station = getBusStationById(item.id);
      if (station) {
        addRecentSearch(station);
      }
    };

    return (
      <View key={item.id}>
        <Pressable
          className="flex-row items-center gap-2 py-2"
          onPress={handleRecentPress}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-100 p-2">
            <IconComponent className="w-5 h-5" />
          </View>
          <Text className="flex-1 text-base font-medium text-neutral-900">
            {item.title}
          </Text>
        </Pressable>
        {!isLast && (
          <View className="w-full h-px bg-neutral-200 my-2" />
        )}
      </View>
    );
  };

  const renderSearchResult = ({ item, isLast }: { item: BusStation; isLast: boolean }) => {
    const IconComponent = item.icon;
    
    const handleSearchResultPress = () => {
      // Add to recent searches before navigating
      addRecentSearch(item);
      
      // Update local state immediately
      const newRecentItem: RecentSearchItem = {
        id: item.id,
        title: item.name,
        icon: item.icon,
      };
      setRecentSearches(prev => [newRecentItem, ...prev.filter(r => r.id !== item.id)].slice(0, 10));
      
      router.push({
        pathname: '/navigation' as any,
        params: { destination: item.name }
      });
    };

    return (
      <View key={item.id}>
        <Pressable
          className="flex-row items-center gap-2 py-3"
          onPress={handleSearchResultPress}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-100 p-2">
            <IconComponent className="w-5 h-5" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-neutral-900">
              {item.name}
            </Text>
            <Text className="text-sm text-neutral-600 mt-1 capitalize">
              {item.type.replace('_', ' ')} Station
            </Text>
          </View>
        </Pressable>
        {!isLast && (
          <View className="w-full h-px bg-neutral-200 my-1" />
        )}
      </View>
    );
  };

  const renderPopularItem = ({ item }: { item: PopularSearchItem }) => {
    const handleNavigationPress = () => {
      // Navigate to navigation page with the selected destination
      router.push({
        pathname: '/navigation' as any,
        params: { destination: item.title.replace('\n', ' ') }
      });
    };

    return (
      <Pressable
        key={item.id}
        className="overflow-hidden rounded-md border border-neutral-200 shadow-sm"
        style={{ width: showAllPopular ? '100%' : 154, height: 116 }}
        onPress={handleNavigationPress}
      >
        <View className="relative h-full w-full">
          <Image
            source={{ uri: item.image }}
            className="h-full w-full"
            style={{ resizeMode: 'cover' }}
          />
          <View className="absolute inset-0 bg-black/40" />
          <View className="absolute bottom-0 left-0 right-0 p-3">
            <Text className="text-lg font-bold text-white leading-tight">
              {item.title}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderPopularSearches = () => {
    const displayItems = showAllPopular
      ? popularSearches
      : popularSearches.slice(0, 3);

    if (showAllPopular) {
      return (
        <View className="w-full" style={{ height: 488, gap: 8 }}>
          <View className="flex-row w-full" style={{ gap: 8 }}>
            <View className="flex-1" style={{ gap: 8 }}>
              {/* Column 1 - Items 1, 3, 5, 7 */}
              {displayItems
                .filter((_, index) => index % 2 === 0)
                .map((item) => renderPopularItem({ item }))}
            </View>
            <View className="flex-1" style={{ gap: 8 }}>
              {/* Column 2 - Items 2, 4, 6, 8 */}
              {displayItems
                .filter((_, index) => index % 2 === 1)
                .map((item) => renderPopularItem({ item }))}
            </View>
          </View>
        </View>
      );
    } else {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {displayItems.map((item) => renderPopularItem({ item }))}
        </ScrollView>
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <FocusAwareStatusBar />

      {/* Background Map Image */}
      <View className="absolute inset-0">
        <Image
          source={{
            uri: 'https://api.builder.io/api/v1/image/assets/TEMP/6c3b3b210b3413e5845c48ced02b558bbfe555a7?width=864',
          }}
          className="h-full w-full"
          style={{ resizeMode: 'cover' }}
        />
        <View className="absolute inset-0 bg-black/30" />
      </View>

      {/* Content */}
      <View className="flex-1" style={{ paddingTop: 68 }}>
        <View className="flex-1 rounded-t-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
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
            <Pressable onPress={handleCancel}>
              <Text
                className="text-base font-medium"
                style={{ color: '#274F9C' }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Search Results Section - Show when user is searching */}
            {searchText.trim().length > 0 ? (
              <View>
                {searchResults.length > 0 ? (
                  <View>
                    <Text className="text-sm font-medium text-neutral-500 mb-3">
                      Search Results ({searchResults.length})
                    </Text>
                    {searchResults.map((item, index, array) =>
                      renderSearchResult({
                        item,
                        isLast: index === array.length - 1,
                      })
                    )}
                  </View>
                ) : (
                  <View className="py-8 items-center">
                    <Text className="text-base text-neutral-500">
                      No results found for "{searchText}"
                    </Text>
                    <Text className="text-sm text-neutral-400 mt-2 text-center">
                      Try searching with different keywords
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {/* Recent Searches Section */}
                <View className="mb-8">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-neutral-500">
                      Recents
                    </Text>
                    <Pressable onPress={toggleRecentExpanded}>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: '#274F9C' }}
                      >
                        {showAllRecent ? 'View Less' : 'View More'}
                      </Text>
                    </Pressable>
                  </View>

                  <View>
                    {(showAllRecent ? recentSearches : recentSearches.slice(0, 3)).map((item, index, array) =>
                      renderRecentItem({
                        item,
                        isLast: index === array.length - 1,
                      })
                    )}
                  </View>
                </View>

                {/* Popular Searches Section */}
                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-neutral-500">
                      Popular Searches
                    </Text>
                    <Pressable onPress={togglePopularExpanded}>
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
        </View>
      </View>
    </SafeAreaView>
  );
}
