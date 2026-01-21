import { MMKV } from 'react-native-mmkv';

// Lazy initialization to prevent errors during import
let _storage: MMKV | null = null;
let _initError: Error | null = null;
// In-memory fallback store for environments where MMKV isn't available (e.g., web/dev)
const _memoryStore: Record<string, string> = {};
let _usingMemoryFallback = false;

function getStorage(): MMKV | null {
  if (_initError) {
    return null; // Already failed, don't retry
  }
  
  if (!_storage) {
    try {
      _storage = new MMKV();
    } catch (error) {
      _initError = error as Error;
      _usingMemoryFallback = true;
      console.warn('MMKV initialization failed, using in-memory fallback:', error);
      return null;
    }
  }
  return _storage;
}

export const storage = {
  getString: (key: string) => {
    const mmkv = getStorage();
    if (mmkv) {
      return mmkv.getString(key) || undefined;
    }
    // Fallback: in-memory
    if (_usingMemoryFallback) {
      if (__DEV__) {
        // Lightweight debug: show when fallback is used
        // Avoid noisy logs by not printing actual values here
        console.debug('[Storage] Using memory fallback for getString:', key);
      }
      return _memoryStore[key];
    }
    return undefined;
  },
  set: (key: string, value: string) => {
    const mmkv = getStorage();
    if (mmkv) {
      mmkv.set(key, value);
      return;
    }
    // Fallback: in-memory
    if (_usingMemoryFallback) {
      if (__DEV__) {
        console.debug('[Storage] Using memory fallback for set:', key);
      }
      _memoryStore[key] = value;
    }
  },
  delete: (key: string) => {
    const mmkv = getStorage();
    if (mmkv) {
      mmkv.delete(key);
      return;
    }
    // Fallback: in-memory
    if (_usingMemoryFallback) {
      if (__DEV__) {
        console.debug('[Storage] Using memory fallback for delete:', key);
      }
      delete _memoryStore[key];
    }
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
