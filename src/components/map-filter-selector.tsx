import React, { useState, useEffect } from 'react';

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const STORAGE_KEY = 'nus-nextbus-map-filters';

const defaultFilterItems = [
  { id: 'important', label: 'Landmarks', checked: true, type: 'checkbox' },
  { id: 'bus-stops', label: 'Bus Stops', checked: true, type: 'radio', group: 'bus-view' },
  { id: 'academic', label: 'Academic', checked: false, type: 'checkbox' },
  { id: 'residences', label: 'Residences', checked: false, type: 'checkbox' },
  // Temporarily hidden bus routes - uncomment to restore
  // { id: 'bus-route-a1', label: 'A1', checked: false, type: 'radio', group: 'bus-view' },
  // { id: 'bus-route-a2', label: 'A2', checked: false, type: 'radio', group: 'bus-view' },
  // { id: 'bus-route-d1', label: 'D1', checked: false, type: 'radio', group: 'bus-view' },
  // { id: 'bus-route-d2', label: 'D2', checked: false, type: 'radio', group: 'bus-view' },
  // { id: 'bus-route-btc', label: 'BTC', checked: false, type: 'radio', group: 'bus-view' },
  // { id: 'bus-route-e', label: 'E', checked: false, type: 'radio', group: 'bus-view' },
  // { id: 'bus-route-k', label: 'K', checked: false, type: 'radio', group: 'bus-view' },
  // { id: 'bus-route-l', label: 'L', checked: false, type: 'radio', group: 'bus-view' },
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

  // Load saved filters from localStorage on mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEY);
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

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }

    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  return (
    <div className="border-shadcn-ui-app-border relative flex flex-col items-start rounded-md border border-solid bg-white px-4 py-2" style={{ zIndex: 10000 }}>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <div className="flex h-8 w-full items-center self-stretch rounded-[var(--border-radius-rounded-sm)] py-[var(--tw-padding-py-1-5)]">
            <label
              htmlFor={item.id}
              className="font-text-sm-regular text-shadcn-ui-app-popover-foreground relative mt-[-1.00px] cursor-pointer whitespace-nowrap text-[length:var(--text-sm-regular-font-size)] font-[number:var(--text-sm-regular-font-weight)] leading-[var(--text-sm-regular-line-height)] tracking-[var(--text-sm-regular-letter-spacing)] [font-style:var(--text-sm-regular-font-style)]"
              onClick={() => handleToggle(item.id)}
            >
              {item.label}
            </label>

            <div className="relative ml-auto shrink-0 pl-8">
              {item.type === 'radio' ? (
                // Radio button (circle) - but render as checkbox for bus-stops
                item.id === 'bus-stops' ? (
                  // Render checkbox for bus-stops
                  item.checked ? (
                    <div
                      className="flex size-[17.18px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2.86px] bg-[#274f9c]"
                      onClick={() => handleToggle(item.id)}
                    >
                      <CheckIcon />
                    </div>
                  ) : (
                    <div
                      className="size-[17.18px] cursor-pointer rounded-[2.86px] border-[0.72px] border-solid border-[#cdcdcd]"
                      onClick={() => handleToggle(item.id)}
                    />
                  )
                ) : item.checked ? (
                  <div
                    className="border-shadcn-ui-app-border shadow-box-shadow-shadow-xs size-4 cursor-pointer rounded-full border border-solid border-[#274F9C] bg-[#274F9C]"
                    onClick={() => handleToggle(item.id)}
                  >
                    <div className="flex size-full items-center justify-center">
                      <div className="size-1.5 rounded-full bg-white"></div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="size-4 cursor-pointer rounded-full border-[0.72px] border-solid border-[#cdcdcd]"
                    onClick={() => handleToggle(item.id)}
                  />
                )
              ) : item.checked ? (
                <div
                  className="flex size-[17.18px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2.86px] bg-[#274f9c]"
                  onClick={() => handleToggle(item.id)}
                >
                  <CheckIcon />
                </div>
              ) : (
                <div
                  className="size-[17.18px] cursor-pointer rounded-[2.86px] border-[0.72px] border-solid border-[#cdcdcd]"
                  onClick={() => handleToggle(item.id)}
                />
              )}
            </div>
          </div>
          {/* Add divider between Residences and A1 */}
          {item.id === 'residences' && index < items.length - 1 && (
            <div className="my-1 w-full border-t border-solid border-[#e5e5e5]"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
