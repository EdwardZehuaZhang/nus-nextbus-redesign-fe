import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';

import {
  FocusAwareStatusBar,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { MapTrifold, CheckSquare } from '@/components/ui/icons';

export default function NavigationPage() {
  const router = useRouter();
  const { destination } = useLocalSearchParams();

  const handleBackPress = () => {
    router.back();
  };

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

      {/* Header with Back Button */}
      <View className="absolute left-0 right-0 top-12 z-10">
        <View className="flex-row items-center justify-between px-5 py-2">
          <Pressable
            onPress={handleBackPress}
            className="h-12 w-12 items-center justify-center rounded-lg border border-neutral-200 bg-white shadow-sm"
          >
            <Text className="text-lg font-semibold text-neutral-800">←</Text>
          </Pressable>
          
          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-white">
              Navigation
            </Text>
          </View>
          
          <View className="h-12 w-12" />
        </View>
      </View>

      {/* Navigation Card */}
      <View className="absolute bottom-0 left-0 right-0">
        <View className="rounded-t-xl border border-neutral-200 bg-white px-5 py-6 shadow-lg">
          {/* Route Info */}
          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-neutral-900">
                Route to {destination || 'UTown'}
              </Text>
              <View className="rounded-full bg-blue-100 px-3 py-1">
                <Text className="text-sm font-medium" style={{ color: '#274F9C' }}>
                  15 min
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-green-500" />
              <Text className="text-sm text-neutral-600">
                From: Current Location
              </Text>
            </View>
            
            <View className="ml-1 h-6 w-px bg-neutral-300" />
            
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: '#274F9C' }} />
              <Text className="text-sm text-neutral-600">
                To: {destination || 'UTown #NUS Sign'}
              </Text>
            </View>
          </View>

          {/* Transportation Options */}
          <View className="mb-6">
            <Text className="mb-3 text-base font-semibold text-neutral-800">
              Transportation
            </Text>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              <TransportCard
                type="Bus"
                route="A1"
                time="5 min"
                color="#FF6B35"
                isSelected={true}
              />
              <TransportCard
                type="Bus"
                route="D2"
                time="8 min"
                color="#4ECDC4"
                isSelected={false}
              />
              <TransportCard
                type="Walk"
                route="Direct"
                time="15 min"
                color="#45B7D1"
                isSelected={false}
              />
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Pressable className="flex-1 rounded-lg py-4 px-6" style={{ backgroundColor: '#274F9C' }}>
              <Text className="text-center text-base font-semibold text-white">
                Start Navigation
              </Text>
            </Pressable>
            
            <Pressable className="rounded-lg border border-neutral-300 py-4 px-6">
              <MapTrifold size={20} color="#274F9C" />
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface TransportCardProps {
  type: string;
  route: string;
  time: string;
  color: string;
  isSelected: boolean;
}

const TransportCard: React.FC<TransportCardProps> = ({
  type,
  route,
  time,
  color,
  isSelected,
}) => {
  return (
    <Pressable
      className={`w-24 rounded-lg border p-3 ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        {isSelected && (
          <View className="h-4 w-4 items-center justify-center rounded-full bg-blue-500">
            <CheckSquare size={10} color="white" />
          </View>
        )}
      </View>
      
      <Text className="mb-1 text-xs font-medium text-neutral-900">
        {type}
      </Text>
      
      <Text className="mb-1 text-sm font-bold text-neutral-900">
        {route}
      </Text>
      
      <Text className="text-xs text-neutral-600">
        {time}
      </Text>
    </Pressable>
  );
};