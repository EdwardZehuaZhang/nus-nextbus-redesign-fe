import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Switch } from 'react-native';

import {
  FocusAwareStatusBar,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { CaretDown, PlusIcon } from '@/components/ui/icons';

// Custom SVG Icons for this page
const NavigationArrow = () => (
  <View className="h-5 w-5 items-center justify-center">
    <Text className="text-base text-neutral-500">📍</Text>
  </View>
);

const MenuDots = () => (
  <View className="h-5 w-5 items-center justify-center">
    <View className="flex-col items-center justify-center gap-0.5">
      <View className="h-1 w-1 rounded-full bg-neutral-500" />
      <View className="h-1 w-1 rounded-full bg-neutral-500" />
      <View className="h-1 w-1 rounded-full bg-neutral-500" />
    </View>
  </View>
);

const MapPin = ({ color = "#274F9C" }) => (
  <View className="h-5 w-5 items-center justify-center">
    <Text className="text-base" style={{ color }}>📍</Text>
  </View>
);

const Person = () => (
  <View className="h-5 w-5 items-center justify-center">
    <Text className="text-base text-neutral-500">🚶</Text>
  </View>
);

const Van = () => (
  <View className="h-5 w-5 items-center justify-center">
    <Text className="text-base" style={{ color: '#274F9C' }}>🚐</Text>
  </View>
);

const BookmarkIcon = () => (
  <View className="h-5 w-5 items-center justify-center">
    <Text className="text-base text-neutral-900">🔖</Text>
  </View>
);

const ExpandIcon = ({ expanded }: { expanded: boolean }) => (
  <View className={`h-5 w-5 items-center justify-center transition-transform ${expanded ? 'rotate-180' : ''}`}>
    <CaretDown width={16} height={16} />
  </View>
);

export default function NavigationPage() {
  const router = useRouter();
  const { from, to } = useLocalSearchParams();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <FocusAwareStatusBar />
      
      {/* Status Bar - Custom for the design */}
      <View className="flex-row items-center justify-between px-6 py-3">
        <Text className="text-lg font-semibold text-neutral-900">9:41</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-neutral-900">📶</Text>
          <Text className="text-sm text-neutral-900">📶</Text>
          <Text className="text-sm text-neutral-900">🔋</Text>
        </View>
      </View>

      {/* Map Background */}
      <View className="flex-1">
        <Image
          source={{
            uri: 'https://api.builder.io/api/v1/image/assets/TEMP/6c3b3b210b3413e5845c48ced02b558bbfe555a7?width=864',
          }}
          className="absolute inset-0 h-full w-full"
          style={{ resizeMode: 'cover' }}
        />

        {/* Location Input Card */}
        <View className="mx-3 mt-4 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          {/* Your Location */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <NavigationArrow />
              <Text className="text-base font-medium text-neutral-900">
                Your location
              </Text>
            </View>
            <MenuDots />
          </View>

          {/* Divider with dots */}
          <View className="my-2 flex-row items-center gap-5 pl-2">
            <View className="flex-col items-center gap-1">
              <View className="h-1 w-1 rounded-full bg-neutral-400" />
              <View className="h-1 w-1 rounded-full bg-neutral-400" />
              <View className="h-1 w-1 rounded-full bg-neutral-400" />
            </View>
            <View className="h-px flex-1 bg-neutral-200" />
          </View>

          {/* Destination */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <MapPin />
              <Text className="text-base font-medium text-neutral-900">
                COM3
              </Text>
            </View>
            <MenuDots />
          </View>

          {/* Divider with dots */}
          <View className="my-2 flex-row items-center gap-5 pl-2">
            <View className="flex-col items-center gap-1">
              <View className="h-1 w-1 rounded-full bg-neutral-400" />
              <View className="h-1 w-1 rounded-full bg-neutral-400" />
              <View className="h-1 w-1 rounded-full bg-neutral-400" />
            </View>
            <View className="h-px flex-1 bg-neutral-200" />
          </View>

          {/* Add Stop */}
          <View className="flex-row items-center gap-3">
            <PlusIcon width={20} height={20} fill="#274F9C" />
            <Text className="text-base font-medium" style={{ color: '#274F9C' }}>
              Add Stop
            </Text>
          </View>
        </View>

        {/* Journey Details Card */}
        <View className="absolute bottom-0 left-0 right-0 rounded-t-xl border border-neutral-200 bg-white p-5 shadow-xl">
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Journey Time Header */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-2xl font-medium text-neutral-900">28 Mins</Text>
              <View className="flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                <Text className="text-sm text-neutral-900">Arrive 9:15PM</Text>
                <CaretDown width={16} height={16} />
              </View>
            </View>

            {/* Journey Steps */}
            <View className="mb-6 gap-4">
              {/* Step 1: Your location */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <NavigationArrow />
                  <Text className="text-base font-medium text-neutral-900">
                    Your location
                  </Text>
                </View>
                <Text className="text-sm text-neutral-600">9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View className="flex-row items-center gap-5 pl-2">
                <View className="flex-col items-center gap-1">
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                </View>
                <View className="h-px flex-1 bg-neutral-200" />
              </View>

              {/* Step 2: Walk */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Person />
                  <Text className="text-base font-medium text-neutral-900">
                    Walk 10 min
                  </Text>
                </View>
                <Text className="text-sm text-neutral-600">9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View className="flex-row items-center gap-5 pl-2">
                <View className="flex-col items-center gap-1">
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                </View>
                <View className="h-px flex-1 bg-neutral-200" />
              </View>

              {/* Step 3: Bus Journey */}
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-4">
                    {/* Blue line indicator */}
                    <View className="h-full w-4 items-center">
                      <View className="h-60 w-3 rounded-full" style={{ backgroundColor: '#274F9C' }} />
                      {/* Bus icons */}
                      <View className="absolute top-4 rounded-full border border-neutral-200 bg-neutral-100 p-1.5">
                        <Van />
                      </View>
                      <View className="absolute top-24 rounded-full border border-neutral-200 bg-neutral-100 p-1.5">
                        <Van />
                      </View>
                    </View>

                    <View className="flex-1">
                      {/* Ventus */}
                      <View className="mb-4">
                        <Text className="mb-2 text-base font-medium text-neutral-900">Ventus</Text>
                        
                        {/* Bus Routes */}
                        <View className="gap-2">
                          {/* A1 Route */}
                          <View className="flex-row rounded-md border border-neutral-200 overflow-hidden">
                            <View className="items-center justify-center bg-red-500 px-3 py-2">
                              <Text className="text-sm font-semibold text-white">A1</Text>
                            </View>
                            <View className="flex-1 flex-row">
                              <View className="flex-1 items-center justify-center border-r border-neutral-200 bg-white py-2">
                                <Text className="text-sm text-neutral-900">1 Min</Text>
                                <Text className="text-xs text-neutral-500">👥</Text>
                              </View>
                              <View className="flex-1 items-center justify-center border-r border-neutral-200 bg-white py-2">
                                <Text className="text-sm text-neutral-600">5 Min</Text>
                                <Text className="text-xs text-neutral-400">👥</Text>
                              </View>
                              <View className="flex-1 items-center justify-center bg-white py-2">
                                <Text className="text-sm text-neutral-600">10 Min</Text>
                                <Text className="text-xs text-neutral-400">����</Text>
                              </View>
                            </View>
                          </View>

                          {/* D2 Route */}
                          <View className="flex-row rounded-md border border-neutral-200 overflow-hidden">
                            <View className="items-center justify-center px-3 py-2" style={{ backgroundColor: '#6F1B6F' }}>
                              <Text className="text-sm font-semibold text-white">D2</Text>
                            </View>
                            <View className="flex-1 flex-row">
                              <View className="flex-1 items-center justify-center border-r border-neutral-200 bg-white py-2">
                                <Text className="text-sm text-neutral-900">3 Min</Text>
                                <Text className="text-xs text-neutral-500">👥</Text>
                              </View>
                              <View className="flex-1 items-center justify-center border-r border-neutral-200 bg-white py-2">
                                <Text className="text-sm text-neutral-600">7 Min</Text>
                                <Text className="text-xs text-neutral-400">👥</Text>
                              </View>
                              <View className="flex-1 items-center justify-center bg-white py-2">
                                <Text className="text-sm text-neutral-600">12 Min</Text>
                                <Text className="text-xs text-neutral-400">👥</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Route Details - Expandable */}
                      <View className="mb-4">
                        <Pressable 
                          onPress={() => setRouteExpanded(!routeExpanded)}
                          className="flex-row items-center gap-2"
                        >
                          <ExpandIcon expanded={routeExpanded} />
                          <Text className="text-xs font-medium text-neutral-900">
                            Ride 5 stops (9 mins)
                          </Text>
                        </Pressable>
                        
                        {routeExpanded && (
                          <View className="ml-6 mt-2 gap-2">
                            <Text className="text-xs text-neutral-600">LT13</Text>
                            <Text className="text-xs text-neutral-600">AS5</Text>
                            <Text className="text-xs text-neutral-600">Opp NUSS</Text>
                          </View>
                        )}
                      </View>

                      {/* Final Stop */}
                      <View className="items-center py-2">
                        <Text className="text-base font-medium text-neutral-900">COM3</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Connecting line */}
              <View className="flex-row items-center gap-5 pl-2">
                <View className="flex-col items-center gap-1">
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                </View>
                <View className="h-px flex-1 bg-neutral-200" />
              </View>

              {/* Step 4: Final Walk */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Person />
                  <Text className="text-base font-medium text-neutral-900">
                    Walk 10 min
                  </Text>
                </View>
                <Text className="text-sm text-neutral-600">9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View className="flex-row items-center gap-5 pl-2">
                <View className="flex-col items-center gap-1">
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                  <View className="h-1 w-1 rounded-full bg-neutral-400" />
                </View>
                <View className="h-px flex-1 bg-neutral-200" />
              </View>

              {/* Step 5: Destination */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <MapPin />
                  <Text className="text-base font-medium text-neutral-900">COM3</Text>
                </View>
                <Text className="text-sm text-neutral-600">9:50AM</Text>
              </View>
            </View>

            {/* Divider */}
            <View className="mb-4 h-px bg-neutral-200" />

            {/* Reminder Toggle */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-sm text-neutral-900">
                Remind you to leave on time
              </Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: '#D9D9D9', true: '#274F9C' }}
                thumbColor={'#FFFFFF'}
              />
            </View>

            {/* Save as Favorite Button */}
            <Pressable className="flex-row items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
              <Text className="text-sm font-medium text-neutral-900">
                Save as favorite
              </Text>
              <BookmarkIcon />
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
