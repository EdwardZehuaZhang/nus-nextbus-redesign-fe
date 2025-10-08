import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React from 'react';

import type { Post } from '@/api';
import { usePosts } from '@/api';
import { Card } from '@/components/card';
import {
  EmptyList,
  FocusAwareStatusBar,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import { Search as SearchIcon } from '@/components/ui/icons';

function SearchBar() {
  const router = useRouter();

  const handleSearchPress = () => {
    router.push('/search');
  };

  return (
    <View className="mx-4 mb-4 mt-2">
      <Pressable
        onPress={handleSearchPress}
        className="flex-row items-center gap-3 rounded-md border border-neutral-200 bg-white p-3 shadow-sm"
      >
        <SearchIcon />
        <Text className="flex-1 text-base text-neutral-500">
          Search for location...
        </Text>
      </Pressable>
    </View>
  );
}

export default function Feed() {
  const { data, isPending, isError } = usePosts();
  const renderItem = React.useCallback(
    ({ item }: { item: Post }) => <Card {...item} />,
    []
  );

  if (isError) {
    return (
      <View>
        <Text> Error Loading data </Text>
      </View>
    );
  }
  return (
    <View className="flex-1 ">
      <FocusAwareStatusBar />
      <SearchBar />
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={(_, index) => `item-${index}`}
        ListEmptyComponent={<EmptyList isLoading={isPending} />}
        estimatedItemSize={300}
      />
    </View>
  );
}
