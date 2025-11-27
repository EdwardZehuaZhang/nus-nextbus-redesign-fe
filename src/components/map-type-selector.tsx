import React, { useState } from 'react';

import { MapFilterSelector } from './map-filter-selector';

const mapOptions = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'hybrid', label: 'Hybrid' },
];

interface MapTypeSelectorProps {
  onMapTypeChange?: (mapType: google.maps.MapTypeId | 'dark' | 'light') => void;
  onFilterChange?: (filters: Record<string, boolean>) => void;
  filters?: Record<string, boolean>; // Current filter state to sync with MapFilterSelector
  initialMapType?: google.maps.MapTypeId | 'dark' | 'light';
}

const LayersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#274F9C"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

const MapIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#274F9C"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
    <path d="M15 5.764v15" />
    <path d="M9 3.236v15" />
  </svg>
);

interface DropdownProps {
  selectedMap: string;
  onMapChange: (value: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ selectedMap, onMapChange }) => (
  <div className="border-shadcn-ui-app-border flex flex-col items-start rounded-md border border-solid bg-white px-4 py-2">
    {mapOptions.map((option) => (
      <div
        key={option.id}
        className="flex h-8 w-full items-center self-stretch rounded-[var(--border-radius-rounded-sm)] py-[var(--tw-padding-py-1-5)]"
        onClick={() => onMapChange(option.id)}
      >
        <label
          htmlFor={option.id}
          className="font-text-sm-regular text-shadcn-ui-app-popover-foreground relative mt-[-1.00px] cursor-pointer whitespace-nowrap text-[length:var(--text-sm-regular-font-size)] font-[number:var(--text-sm-regular-font-weight)] leading-[var(--text-sm-regular-line-height)] tracking-[var(--text-sm-regular-letter-spacing)] [font-style:var(--text-sm-regular-font-style)]"
        >
          {option.label}
        </label>

        <div className="relative ml-auto shrink-0 pl-8">
          <div
            className={`border-shadcn-ui-app-border shadow-box-shadow-shadow-xs size-4 cursor-pointer rounded-full border border-solid ${
              selectedMap === option.id
                ? 'border-[#274F9C] bg-[#274F9C]'
                : 'bg-shadcn-ui-app-background'
            }`}
          >
            {selectedMap === option.id && (
              <div className="flex size-full items-center justify-center">
                <div className="size-1.5 rounded-full bg-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const MapTypeSelector: React.FC<MapTypeSelectorProps> = ({
  onMapTypeChange,
  onFilterChange,
  filters,
  initialMapType = 'light',
}) => {
  const [selectedMap, setSelectedMap] = useState(initialMapType);
  const [isMapTypeOpen, setIsMapTypeOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleMapChange = (value: string) => {
    setSelectedMap(value as google.maps.MapTypeId | 'dark' | 'light');
    if (onMapTypeChange) {
      onMapTypeChange(value as google.maps.MapTypeId | 'dark' | 'light');
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
    <div className="relative flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-sm"
          onClick={toggleMapType}
          aria-label="Map type"
        >
          <MapIcon />
        </button>
        <button
          className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-sm"
          onClick={toggleFilter}
          aria-label="Map layers"
        >
          <LayersIcon />
        </button>
      </div>

      {isFilterOpen && (
        <MapFilterSelector onFilterChange={onFilterChange} filters={filters} />
      )}
      {isMapTypeOpen && (
        <Dropdown selectedMap={selectedMap} onMapChange={handleMapChange} />
      )}
    </div>
  );
};
