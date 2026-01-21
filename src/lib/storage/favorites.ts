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
    console.log('📖 [Storage] getFavorites called');
    const favoritesJson = storage.getString(FAVORITES_KEY);
    console.log('📖 [Storage] Raw storage value:', favoritesJson ? `${favoritesJson.length} chars` : 'NULL');
    
    if (!favoritesJson) {
      console.log('📖 [Storage] No favorites found, returning empty array');
      return [];
    }
    
    const parsed = JSON.parse(favoritesJson);
    console.log('📖 [Storage] Parsed favorites count:', parsed.length);
    return parsed;
  } catch (error) {
    console.error('❌ [Storage] Error getting favorites:', error);
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
    console.log('📥 [Storage] addFavorite called with:', favorite);
    const favorites = getFavorites();
    console.log('📚 [Storage] Current favorites count:', favorites.length);

    // Check if this route already exists
    const exists = favorites.some(
      (f) => f.fromId === favorite.fromId && f.toId === favorite.toId
    );

    if (exists) {
      console.log('⚠️ [Storage] Favorite already exists, skipping');
      return; // Don't add duplicates
    }

    const newFavorite: FavoriteRoute = {
      ...favorite,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: Date.now(),
    };

    console.log('📝 [Storage] New favorite object:', newFavorite);
    favorites.unshift(newFavorite); // Add to beginning
    console.log('📚 [Storage] Favorites array after unshift:', favorites.length);
    
    const jsonString = JSON.stringify(favorites);
    console.log('📄 [Storage] JSON string length:', jsonString.length);
    console.log('📄 [Storage] JSON preview:', jsonString.substring(0, 200));
    
    storage.set(FAVORITES_KEY, jsonString);
    console.log('✅ [Storage] storage.set() completed');
    
    // Verify write
    const verification = storage.getString(FAVORITES_KEY);
    console.log('🔍 [Storage] Verification read:', verification ? `${verification.length} chars` : 'NULL');
    
  } catch (error) {
    console.error('❌ [Storage] Error adding favorite:', error);
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
 * Update favorite display name
 */
export const updateFavoriteLabel = (
  id: string,
  from: string,
  to: string
): void => {
  try {
    const favorites = getFavorites();
    const favorite = favorites.find((f) => f.id === id);

    if (favorite) {
      favorite.from = from;
      favorite.to = to;
      storage.set(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error updating favorite label:', error);
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
