import { MMKV } from 'react-native-mmkv';

// Lazy initialization to prevent errors during import
let _storage: MMKV | null = null;
let _initError: Error | null = null;

function getStorage(): MMKV | null {
  if (_initError) {
    return null; // Already failed, don't retry
  }
  
  if (!_storage) {
    try {
      _storage = new MMKV();
    } catch (error) {
      _initError = error as Error;
      console.warn('MMKV initialization failed, using in-memory fallback:', error);
      return null;
    }
  }
  return _storage;
}

export const storage = {
  getString: (key: string) => {
    const mmkv = getStorage();
    return mmkv?.getString(key) || undefined;
  },
  set: (key: string, value: string) => {
    const mmkv = getStorage();
    mmkv?.set(key, value);
  },
  delete: (key: string) => {
    const mmkv = getStorage();
    mmkv?.delete(key);
  },
};

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key);
  return value ? JSON.parse(value) || null : null;
}

export async function setItem<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  storage.delete(key);
}
