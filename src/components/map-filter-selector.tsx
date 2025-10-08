import React, { useState } from 'react';

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

const filterItems = [
  { id: 'residences', label: 'Residences', checked: true },
  { id: 'academic', label: 'Academic', checked: true },
  { id: 'bus-stops', label: 'Bus Stops', checked: false },
  { id: 'bus-routes', label: 'Bus Routes', checked: false },
];

interface MapFilterSelectorProps {
  onFilterChange?: (filters: Record<string, boolean>) => void;
}

export const MapFilterSelector: React.FC<MapFilterSelectorProps> = ({
  onFilterChange,
}) => {
  const [items, setItems] = useState(filterItems);

  const handleToggle = (id: string) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);

    if (onFilterChange) {
      const filters = updatedItems.reduce(
        (acc, item) => ({ ...acc, [item.id]: item.checked }),
        {}
      );
      onFilterChange(filters);
    }
  };

  return (
    <div className="border-shadcn-ui-app-border flex flex-col items-start rounded-md border border-solid bg-white px-4 py-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex h-8 w-full items-center self-stretch rounded-[var(--border-radius-rounded-sm)] py-[var(--tw-padding-py-1-5)]"
        >
          <label
            htmlFor={item.id}
            className="font-text-sm-regular text-shadcn-ui-app-popover-foreground relative mt-[-1.00px] cursor-pointer whitespace-nowrap text-[length:var(--text-sm-regular-font-size)] font-[number:var(--text-sm-regular-font-weight)] leading-[var(--text-sm-regular-line-height)] tracking-[var(--text-sm-regular-letter-spacing)] [font-style:var(--text-sm-regular-font-style)]"
            onClick={() => handleToggle(item.id)}
          >
            {item.label}
          </label>

          <div className="relative ml-auto shrink-0 pl-8">
            {item.checked ? (
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
      ))}
    </div>
  );
};
