import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { storage } from '@/lib/storage';

const CheckIcon = () => (
  <Svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M20 6 9 17l-5-5" />
  </Svg>
);

const STORAGE_KEY = 'nus-nextbus-map-filters';

const defaultFilterItems = [
  { id: 'important', label: 'Landmarks', checked: true, type: 'checkbox' },
  { id: 'bus-stops', label: 'Bus Stops', checked: true, type: 'radio', group: 'bus-view' },
  { id: 'academic', label: 'Academic', checked: false, type: 'checkbox' },
  { id: 'residences', label: 'Residences', checked: false, type: 'checkbox' },
  { id: 'bus-route-a1', label: 'A1', checked: false, type: 'radio', group: 'bus-view' },
  { id: 'bus-route-a2', label: 'A2', checked: false, type: 'radio', group: 'bus-view' },
  { id: 'bus-route-d1', label: 'D1', checked: false, type: 'radio', group: 'bus-view' },
  { id: 'bus-route-d2', label: 'D2', checked: false, type: 'radio', group: 'bus-view' },
  { id: 'bus-route-btc', label: 'BTC', checked: false, type: 'radio', group: 'bus-view' },
  { id: 'bus-route-e', label: 'E', checked: false, type: 'radio', group: 'bus-view' },
  { id: 'bus-route-k', label: 'K', checked: false, type: 'radio', group: 'bus-view' },
  { id: 'bus-route-l', label: 'L', checked: false, type: 'radio', group: 'bus-view' },
];

interface MapFilterSelectorProps {
  onFilterChange?: (filters: Record<string, boolean>) => void;
  filters?: Record<string, boolean>; // Current filter state from parent
}

export const MapFilterSelector: React.FC<MapFilterSelectorProps> = ({
  onFilterChange,
  filters,
}) => {
  const [items, setItems] = useState(defaultFilterItems);

  // Load saved filters from storage on mount
  useEffect(() => {
    try {
      const savedFilters = storage.getString(STORAGE_KEY);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        const updatedItems = defaultFilterItems.map((item) => ({
          ...item,
          checked: parsedFilters[item.id] ?? item.checked,
        }));
        setItems(updatedItems);
        
        // Notify parent of initial state
        if (onFilterChange) {
          onFilterChange(parsedFilters);
        }
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  }, []);

  // Sync with parent's filter state when it changes
  useEffect(() => {
    if (filters) {
      const updatedItems = defaultFilterItems.map((item) => ({
        ...item,
        checked: filters[item.id] ?? item.checked,
      }));
      setItems(updatedItems);
    }
  }, [filters]);

  const handleToggle = (id: string) => {
    const clickedItem = items.find((item) => item.id === id);
    
    let updatedItems;
    if (clickedItem?.type === 'radio' && clickedItem.group) {
      // For radio buttons in the same group
      // If clicking the already-selected radio button, deselect it
      // Otherwise, select the clicked one and deselect all others in the group
      if (clickedItem.checked) {
        // Clicking the already-selected radio button - deselect it
        updatedItems = items.map((item) => {
          if (item.id === id) {
            return { ...item, checked: false };
          }
          return item;
        });
      } else {
        // Clicking a different radio button - select it and deselect others in the group
        updatedItems = items.map((item) => {
          if (item.group === clickedItem.group) {
            return { ...item, checked: item.id === id };
          }
          return item;
        });
      }
    } else {
      // For checkboxes, just toggle
      updatedItems = items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
    }
    
    setItems(updatedItems);

    const filters = updatedItems.reduce(
      (acc, item) => ({ ...acc, [item.id]: item.checked }),
      {}
    );

    // Save to storage
    try {
      storage.set(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }

    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  return (
    <View 
      className={`relative flex flex-col items-start ${Platform.OS === 'web' ? 'w-full rounded-md border border-neutral-200 bg-white px-4 py-2 shadow-sm' : ''}`}
      style={{ zIndex: 10000 }}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <TouchableOpacity 
            className="flex h-8 w-full flex-row items-center self-stretch rounded-[var(--border-radius-rounded-sm)]"
            onPress={() => handleToggle(item.id)}
            activeOpacity={0.7}
          >
            <Text
              className="font-text-sm-regular text-shadcn-ui-app-popover-foreground flex-1 text-[length:var(--text-sm-regular-font-size)] font-[number:var(--text-sm-regular-font-weight)] leading-[var(--text-sm-regular-line-height)] tracking-[var(--text-sm-regular-letter-spacing)] [font-style:var(--text-sm-regular-font-style)]"
            >
              {item.label}
            </Text>

            <View className="ml-2">
              {item.type === 'radio' ? (
                // Radio button (circle) - but render as checkbox for bus-stops
                item.id === 'bus-stops' ? (
                  // Render checkbox for bus-stops
                  item.checked ? (
                    <View className="flex size-[17.18px] flex-col items-center justify-center overflow-hidden rounded-[2.86px] bg-[#274f9c]">
                      <CheckIcon />
                    </View>
                  ) : (
                    <View className="size-[17.18px] rounded-[2.86px] border-[0.72px] border-solid border-[#cdcdcd]" />
                  )
                ) : item.checked ? (
                  <View className="border-shadcn-ui-app-border shadow-box-shadow-shadow-xs size-4 rounded-full border border-solid border-[#274F9C] bg-[#274F9C]">
                    <View className="flex size-full items-center justify-center">
                      <View className="size-1.5 rounded-full bg-white"></View>
                    </View>
                  </View>
                ) : (
                  <View className="size-4 rounded-full border-[0.72px] border-solid border-[#cdcdcd]" />
                )
              ) : item.checked ? (
                <View className="flex size-[17.18px] flex-col items-center justify-center overflow-hidden rounded-[2.86px] bg-[#274f9c]">
                  <CheckIcon />
                </View>
              ) : (
                <View className="size-[17.18px] rounded-[2.86px] border-[0.72px] border-solid border-[#cdcdcd]" />
              )}
            </View>
          </TouchableOpacity>
          {/* Add divider between Residences and A1 */}
          {item.id === 'residences' && index < items.length - 1 && (
            <View className="my-1 w-full border-t border-solid border-[#e5e5e5]"></View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
};
