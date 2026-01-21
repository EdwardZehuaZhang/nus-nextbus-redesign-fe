import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  getFavorites, 
  addFavorite as addFavoriteToStorage, 
  removeFavorite as removeFavoriteFromStorage,
  isFavorite as checkIsFavorite,
  updateFavoriteLabel as updateFavoriteLabelInStorage,
  type FavoriteRoute 
} from '../storage/favorites';

interface FavoritesContextValue {
  favorites: FavoriteRoute[];
  addFavorite: (favorite: Omit<FavoriteRoute, 'id' | 'savedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (fromId: string, toId: string) => boolean;
  updateFavoriteLabel: (id: string, from: string, to: string) => void;
  refreshFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);

  // Load favorites from storage on mount
  const refreshFavorites = useCallback(() => {
    const stored = getFavorites();
    console.log('🔄 [FavoritesContext] Refreshing favorites:', stored.length);
    setFavorites(stored);
  }, []);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const addFavorite = useCallback((favorite: Omit<FavoriteRoute, 'id' | 'savedAt'>) => {
    console.log('➕ [FavoritesContext] Adding favorite:', favorite);
    addFavoriteToStorage(favorite);
    refreshFavorites(); // Immediately refresh state
  }, [refreshFavorites]);

  const removeFavorite = useCallback((id: string) => {
    console.log('➖ [FavoritesContext] Removing favorite:', id);
    removeFavoriteFromStorage(id);
    refreshFavorites(); // Immediately refresh state
  }, [refreshFavorites]);

  const isFavorite = useCallback((fromId: string, toId: string) => {
    return checkIsFavorite(fromId, toId);
  }, []);

  const updateFavoriteLabel = useCallback((id: string, from: string, to: string) => {
    console.log('✏️ [FavoritesContext] Updating favorite label:', id, from, to);
    updateFavoriteLabelInStorage(id, from, to);
    refreshFavorites(); // Immediately refresh state
  }, [refreshFavorites]);

  const value: FavoritesContextValue = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    updateFavoriteLabel,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavoritesContext = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
};
