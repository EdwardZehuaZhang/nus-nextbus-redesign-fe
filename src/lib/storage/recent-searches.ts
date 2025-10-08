import { type BusStation } from '@/lib/bus-stations';

import { storage } from '../storage';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10; // Limit to 10 recent searches

export type RecentSearchItem = {
  id: string;
  name: string;
  type: string;
  timestamp: number; // When the search was performed
};

/**
 * Get all recent searches from storage, sorted by most recent first
 */
export const getRecentSearches = (): RecentSearchItem[] => {
  try {
    const stored = storage.getString(RECENT_SEARCHES_KEY);
    if (!stored) return [];

    const searches: RecentSearchItem[] = JSON.parse(stored);

    // Sort by timestamp (most recent first)
    return searches.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error retrieving recent searches:', error);
    return [];
  }
};

/**
 * Add a new search to recent searches
 * If the search already exists, update its timestamp and move to top
 */
export const addRecentSearch = (station: BusStation): void => {
  try {
    let recentSearches = getRecentSearches();

    // Check if this search already exists
    const existingIndex = recentSearches.findIndex(
      (item) => item.id === station.id
    );

    const searchItem: RecentSearchItem = {
      id: station.id,
      name: station.name,
      type: station.type,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      // Update existing search timestamp and move to top
      recentSearches[existingIndex] = searchItem;
    } else {
      // Add new search to the beginning
      recentSearches.unshift(searchItem);
    }

    // Keep only the most recent searches
    recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);

    // Save back to storage
    storage.set(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
};

/**
 * Clear all recent searches
 */
export const clearRecentSearches = (): void => {
  try {
    storage.delete(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
};

/**
 * Remove a specific search from recent searches
 */
export const removeRecentSearch = (searchId: string): void => {
  try {
    let recentSearches = getRecentSearches();
    recentSearches = recentSearches.filter((item) => item.id !== searchId);
    storage.set(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  } catch (error) {
    console.error('Error removing recent search:', error);
  }
};

/**
 * Convert RecentSearchItem back to a format compatible with the UI
 * This helps maintain consistency with the existing UI components
 */
export const formatRecentSearchForUI = (item: RecentSearchItem) => {
  // Map the type to appropriate icons (same logic as in bus-stations.ts)
  const getIconForType = (type: string) => {
    switch (type) {
      case 'mrt':
        return 'Train'; // You'll need to import these in the component
      case 'library':
      case 'academic':
        return 'BookOpen';
      case 'medical':
        return 'FirstAid';
      default:
        return 'Van';
    }
  };

  return {
    id: item.id,
    title: item.name,
    icon: getIconForType(item.type), // This returns string, component will need to map it
  };
};
