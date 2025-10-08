import { storage } from '../storage';

const FAVORITES_KEY = 'favorites';

export type FavoriteRoute = {
  id: string;
  from: string;
  to: string;
  fromId: string;
  toId: string;
  savedAt: number;
  icon?: 'home' | 'work' | 'home-work';
};

/**
 * Get all favorite routes
 */
export const getFavorites = (): FavoriteRoute[] => {
  try {
    const favoritesJson = storage.getString(FAVORITES_KEY);
    if (!favoritesJson) {
      return [];
    }
    return JSON.parse(favoritesJson);
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

/**
 * Add a new favorite route
 */
export const addFavorite = (
  favorite: Omit<FavoriteRoute, 'id' | 'savedAt'>
): void => {
  try {
    const favorites = getFavorites();

    // Check if this route already exists
    const exists = favorites.some(
      (f) => f.fromId === favorite.fromId && f.toId === favorite.toId
    );

    if (exists) {
      return; // Don't add duplicates
    }

    const newFavorite: FavoriteRoute = {
      ...favorite,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: Date.now(),
    };

    favorites.unshift(newFavorite); // Add to beginning
    storage.set(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
};

/**
 * Remove a favorite route by id
 */
export const removeFavorite = (id: string): void => {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter((f) => f.id !== id);
    storage.set(FAVORITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
};

/**
 * Check if a route is favorited
 */
export const isFavorite = (fromId: string, toId: string): boolean => {
  const favorites = getFavorites();
  return favorites.some((f) => f.fromId === fromId && f.toId === toId);
};

/**
 * Update favorite icon
 */
export const updateFavoriteIcon = (
  id: string,
  icon: 'home' | 'work' | 'home-work'
): void => {
  try {
    const favorites = getFavorites();
    const favorite = favorites.find((f) => f.id === id);

    if (favorite) {
      favorite.icon = icon;
      storage.set(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error updating favorite icon:', error);
  }
};

/**
 * Clear all favorites
 */
export const clearFavorites = (): void => {
  try {
    storage.delete(FAVORITES_KEY);
  } catch (error) {
    console.error('Error clearing favorites:', error);
  }
};
