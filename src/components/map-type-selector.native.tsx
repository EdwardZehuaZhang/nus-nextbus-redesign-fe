import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Funnel } from 'phosphor-react-native';

import { Text } from './ui';
import { MapFilterSelector } from './map-filter-selector';

const mapOptions = [
  { id: 'standard', label: 'Standard' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'terrain', label: 'Terrain' },
];

interface MapTypeSelectorProps {
  onMapTypeChange?: (mapType: 'standard' | 'satellite' | 'hybrid' | 'terrain') => void;
  onFilterChange?: (filters: Record<string, boolean>) => void;
  filters?: Record<string, boolean>;
  initialMapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain';
}

export const MapTypeSelector: React.FC<MapTypeSelectorProps> = ({
  onMapTypeChange,
  onFilterChange,
  filters,
  initialMapType = 'standard',
}) => {
  const [selectedMap, setSelectedMap] = useState(initialMapType);
  const [isMapTypeOpen, setIsMapTypeOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleMapChange = (value: string) => {
    setSelectedMap(value as any);
    if (onMapTypeChange) {
      onMapTypeChange(value as any);
    }
    setIsMapTypeOpen(false);
  };

  const toggleMapType = () => {
    setIsMapTypeOpen(!isMapTypeOpen);
    setIsFilterOpen(false);
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
    setIsMapTypeOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={toggleMapType}
          accessibilityLabel="Map type"
        >
          <MapPin size={20} color="#274F9C" weight="regular" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={toggleFilter}
          accessibilityLabel="Map layers"
        >
          <Funnel size={20} color="#274F9C" weight="regular" />
        </TouchableOpacity>
      </View>

      {isFilterOpen && (
        <View style={styles.dropdown}>
          <MapFilterSelector onFilterChange={onFilterChange} filters={filters} />
        </View>
      )}
      
      {isMapTypeOpen && (
        <View style={styles.dropdown}>
          {mapOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.option}
              onPress={() => handleMapChange(option.id)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              <View
                style={[
                  styles.radio,
                  selectedMap === option.id && styles.radioSelected,
                ]}
              >
                {selectedMap === option.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 32,
  },
  optionText: {
    fontSize: 14,
    color: '#1f2937',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#274F9C',
    backgroundColor: '#274F9C',
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
});
