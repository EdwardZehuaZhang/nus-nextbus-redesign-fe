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

const recentSearches: RecentSearchItem[] = [
  { id: '1', title: 'Central Library', icon: BookOpen },
  { id: '2', title: 'University Health Centre', icon: FirstAid },
  { id: '3', title: 'Kent Ridge MRT', icon: Train },
  { id: '4', title: 'UTown', icon: Van },
  { id: '5', title: 'LT27', icon: Van },
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
    title: 'UTown Infinite Pool',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '5',
    title: 'UTown Infinite Pool',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '6',
    title: 'UTown Infinite Pool',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '7',
    title: 'UTown Infinite Pool',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
  {
    id: '8',
    title: 'UTown Infinite Pool',
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/de1ff172d6adc72d6aa8416033cfbdae50b02a86?width=308',
  },
];

export default function SearchPage() {
  const router = useRouter();
  const [searchText, setSearchText] = React.useState('');
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCancel = () => {
    router.back();
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const renderRecentItem = ({
    item,
    isLast,
  }: {
    item: RecentSearchItem;
    isLast: boolean;
  }) => {
    const IconComponent = item.icon;
    return (
      <View key={item.id}>
        <Pressable
          className="flex-row items-center gap-2 py-3"
          onPress={() => {
            // Handle navigation to location
            console.log('Navigate to:', item.title);
          }}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
            <IconComponent />
          </View>
          <Text className="flex-1 text-base font-medium text-neutral-900">
            {item.title}
          </Text>
        </Pressable>
        {!isLast && (
          <View className="h-px bg-neutral-200" style={{ width: 390 }} />
        )}
      </View>
    );
  };

  const renderPopularItem = ({ item }: { item: PopularSearchItem }) => {
    return (
      <Pressable
        key={item.id}
        className="overflow-hidden rounded-md border border-neutral-200 shadow-sm"
        style={{ width: 154, height: 116 }}
        onPress={() => {
          // Handle navigation to location
          console.log('Navigate to:', item.title);
        }}
      >
        <View className="relative h-full w-full">
          <Image
            source={{ uri: item.image }}
            className="h-full w-full"
            style={{ resizeMode: 'cover' }}
          />
          <View className="absolute inset-0 bg-black/25" />
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
    const displayItems = isExpanded
      ? popularSearches
      : popularSearches.slice(0, 3);

    if (isExpanded) {
      return (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            width: '100%',
          }}
        >
          {displayItems.map((item) => renderPopularItem({ item }))}
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
            {isExpanded ? (
              <>
                {/* Popular Searches - Expanded View */}
                <View className="mb-8">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-neutral-500">
                      Popular Searches
                    </Text>
                    <Pressable onPress={toggleExpanded}>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: '#274F9C' }}
                      >
                        View Less
                      </Text>
                    </Pressable>
                  </View>

                  {renderPopularSearches()}
                </View>

                {/* Recent Searches */}
                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-neutral-500">
                      Recents
                    </Text>
                    <Text
                      className="text-sm font-medium"
                      style={{ color: '#274F9C' }}
                    >
                      View More
                    </Text>
                  </View>

                  <View>
                    {recentSearches.map((item, index) =>
                      renderRecentItem({
                        item,
                        isLast: index === recentSearches.length - 1,
                      })
                    )}
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Recent Searches */}
                <View className="mb-8">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-neutral-500">
                      Recents
                    </Text>
                    <Text
                      className="text-sm font-medium"
                      style={{ color: '#274F9C' }}
                    >
                      View More
                    </Text>
                  </View>

                  <View>
                    {recentSearches.map((item, index) =>
                      renderRecentItem({
                        item,
                        isLast: index === recentSearches.length - 1,
                      })
                    )}
                  </View>
                </View>

                {/* Popular Searches - Normal View */}
                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-neutral-500">
                      Popular Searches
                    </Text>
                    <Pressable onPress={toggleExpanded}>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: '#274F9C' }}
                      >
                        View More
                      </Text>
                    </Pressable>
                  </View>

                  {renderPopularSearches()}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
