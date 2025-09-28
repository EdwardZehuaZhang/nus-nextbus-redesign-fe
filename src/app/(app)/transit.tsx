import { router } from 'expo-router';
import React from 'react';
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
import { CheckSquare, MapTrifold, Search as SearchIcon, MinCapacityIcon, AvgCapacityIcon, MaxCapacityIcon, HouseIcon, BriefcaseIcon, PlusIcon } from '@/components/ui/icons';

type BusRoute = {
  route: string;
  color: string;
  times: Array<{
    time: string;
    crowding: 'low' | 'medium' | 'high';
    textColor?: string;
  }>;
};

type TabItem = {
  id: string;
  label: string;
  isActive: boolean;
};

type FavoriteItem = {
  id: string;
  icon: 'home' | 'work' | 'home-work';
  label: string;
};

const busRoutes: BusRoute[] = [
  {
    route: 'A1',
    color: '#FF0000',
    times: [
      { time: '1 Min', crowding: 'medium', textColor: '#211F26' },
      { time: '5 Min', crowding: 'low', textColor: '#737373' },
      { time: '10 Min', crowding: 'low', textColor: '#737373' },
    ],
  },
  {
    route: 'D2',
    color: '#6F1B6F',
    times: [
      { time: '1 Min', crowding: 'medium', textColor: '#211F26' },
      { time: '5 Min', crowding: 'low', textColor: '#737373' },
      { time: '10 Min', crowding: 'low', textColor: '#737373' },
    ],
  },
  {
    route: 'K',
    color: '#345A9B',
    times: [
      { time: '1 Min', crowding: 'medium', textColor: '#211F26' },
      { time: '5 Min', crowding: 'low', textColor: '#737373' },
      { time: '10 Min', crowding: 'low', textColor: '#737373' },
    ],
  },
  {
    route: '188',
    color: '#55DD33',
    times: [
      { time: '1 Min', crowding: 'medium', textColor: '#211F26' },
      { time: '5 Min', crowding: 'low', textColor: '#737373' },
      { time: '10 Min', crowding: 'low', textColor: '#737373' },
    ],
  },
  {
    route: '27',
    color: '#55DD33',
    times: [
      { time: '1 Min', crowding: 'medium', textColor: '#211F26' },
      { time: '5 Min', crowding: 'low', textColor: '#737373' },
      { time: '10 Min', crowding: 'low', textColor: '#737373' },
    ],
  },
];

const tabs: TabItem[] = [
  { id: '1', label: 'Central Library', isActive: true },
  { id: '2', label: 'PGP Foryer', isActive: false },
];

const favorites: FavoriteItem[] = [
  { id: '1', icon: 'home-work', label: 'Home  -  Work' },
  { id: '2', icon: 'home', label: 'Home' },
  { id: '3', icon: 'work', label: 'Work' },
];

const CrowdingIndicator = ({ crowding }: { crowding: 'low' | 'medium' | 'high' }) => {
  const getCapacityIcon = () => {
    switch (crowding) {
      case 'low':
        return <MinCapacityIcon width={20} height={15} />;
      case 'medium':
        return <AvgCapacityIcon width={20} height={15} />;
      case 'high':
        return <MaxCapacityIcon width={20} height={15} />;
      default:
        return <MinCapacityIcon width={20} height={15} />;
    }
  };
  
  return (
    <View className="flex-row items-center justify-center">
      {getCapacityIcon()}
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
  <Text className="text-base font-semibold" style={{ color: '#FFFFFF' }}>{route.route}</Text>
      </View>

      {/* Times List */}
      <View className="rounded-b-md border border-neutral-200 border-t-0">
        {route.times.map((timeItem, index) => (
          <View key={index}>
            <View className="flex-row items-center justify-between bg-white px-3 py-2">
              <Text
                className="text-base font-medium"
                style={{ color: timeItem.textColor }}
              >
                {timeItem.time}
              </Text>
              <CrowdingIndicator crowding={timeItem.crowding} />
            </View>
            {index < route.times.length - 1 && (
              <View className="h-px bg-neutral-200" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const SearchBar = () => {
  const [searchText, setSearchText] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  
  const handleSearchPress = () => {
    router.push('/search');
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Navigate to search page when user focuses on search
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

const ActionButtons = () => {
  return (
    <View className="absolute right-5 top-14 flex-col gap-2">
      <Pressable className="h-12 w-12 items-center justify-center rounded-lg border border-neutral-200 bg-white shadow-sm">
        <MapTrifold size={28} />
      </Pressable>
      <Pressable className="h-12 w-12 items-center justify-center rounded-lg border border-neutral-200 bg-white shadow-sm">
        <CheckSquare size={27} />
      </Pressable>
    </View>
  );
};

const TabBar = ({ tabs }: { tabs: TabItem[] }) => {
  return (
    <View className="flex-row">
      {tabs.map((tab, index) => (
        <View key={tab.id} className="flex-row">
          <Pressable
            className={`border-neutral-200 px-4 py-2 ${
              tab.isActive
                ? 'border-b-0 border-l border-r border-t rounded-t-md bg-white'
                : 'border-b border-r border-t rounded-tr-md bg-white opacity-60'
            } ${index === 0 ? 'border-l' : ''}`}
          >
            <Text
              className={`text-base ${
                tab.isActive
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

const FavoriteButton = ({ item }: { item: FavoriteItem }) => {
  const renderIcons = () => {
    if (item.icon === 'home-work') {
      return (
        <View className="flex-row items-center gap-1 rounded-full bg-neutral-100 p-2">
          <HouseIcon width={16} height={16} fill="#274F9C" />
          <BriefcaseIcon width={16} height={16} fill="#274F9C" />
        </View>
      );
    } else if (item.icon === 'home') {
      return (
        <View className="items-center justify-center rounded-full bg-neutral-100 p-2">
          <HouseIcon width={16} height={16} fill="#274F9C" />
        </View>
      );
    } else {
      return (
        <View className="items-center justify-center rounded-full bg-neutral-100 p-2">
          <BriefcaseIcon width={16} height={16} fill="#274F9C" />
        </View>
      );
    }
  };

  return (
    <Pressable className="min-w-[64px] flex-col items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      {renderIcons()}
      <Text className="text-center text-xs font-medium leading-tight" style={{ color: '#274F9C' }} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
};

const AddButton = () => {
  return (
    <Pressable className="h-12 w-12 items-center justify-center">
      <PlusIcon width={24} height={24} fill="#274F9C" />
    </Pressable>
  );
};

export default function TransitPage() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <FocusAwareStatusBar />
      
      {/* Background Map */}
      <View className="absolute inset-0">
        <Image
          source={{
            uri: 'https://api.builder.io/api/v1/image/assets/TEMP/20a1776d99ec1817a0bf9ffa97a884c7f957dfa7?width=864',
          }}
          className="h-full w-full"
          style={{ resizeMode: 'cover' }}
        />
      </View>

      {/* Action Buttons */}
      <ActionButtons />

      {/* Main Card */}
      <View className="mt-auto rounded-t-xl border border-neutral-200 bg-white p-5 shadow-lg">
        <SearchBar />

        {/* Nearest Stops Section */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-neutral-500">
            Nearest Stops
          </Text>

          {/* Tab Bar */}
          <TabBar tabs={tabs} />

          {/* Bus Routes Grid */}
          <View className="rounded-b-md border border-neutral-200 border-t-0 bg-white p-2 shadow-sm">
            <View className="gap-2">
              {/* First Row */}
              <View className="flex-row gap-2">
                <BusRouteCard route={busRoutes[0]} />
                <BusRouteCard route={busRoutes[1]} />
                <BusRouteCard route={busRoutes[2]} />
              </View>
              {/* Second Row */}
              <View className="flex-row gap-2">
                <BusRouteCard route={busRoutes[3]} />
                <BusRouteCard route={busRoutes[4]} />
                <View className="flex-1" />
              </View>
            </View>
          </View>
        </View>

        {/* Favourites Section */}
        <View>
          <Text className="mb-2 text-sm font-medium text-neutral-500">
            Favourites
          </Text>
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
        </View>
      </View>
    </SafeAreaView>
  );
}
