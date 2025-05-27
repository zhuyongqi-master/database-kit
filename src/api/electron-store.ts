import { StoreSchema } from "../../electron/store";

/**
 * Get a value from the electron store
 */
export async function getStoreValue<K extends keyof StoreSchema>(key: K): Promise<StoreSchema[K]> {
  if (window.electronStore) {
    return window.electronStore.get<K>(key);
  }
  // Fallback to localStorage for development/testing
  const item = localStorage.getItem(key);
  if (item) {
    try {
      return JSON.parse(item);
    } catch (e) {
      console.error(`Error parsing localStorage item "${key}":`, e);
    }
  }
  return undefined as unknown as StoreSchema[K];
}

/**
 * Set a value in the electron store
 */
export async function setStoreValue<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): Promise<void> {
  if (window.electronStore) {
    await window.electronStore.set(key, value);
  } else {
    // Fallback to localStorage for development/testing
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error storing item "${key}" in localStorage:`, e);
    }
  }
}

/**
 * Delete a value from the electron store
 */
export async function deleteStoreValue(key: keyof StoreSchema): Promise<void> {
  if (window.electronStore) {
    await window.electronStore.delete(key);
  } else {
    // Fallback to localStorage for development/testing
    localStorage.removeItem(key);
  }
}

/**
 * Clear the electron store
 */
export async function clearStore(): Promise<void> {
  if (window.electronStore) {
    await window.electronStore.clear();
  } else {
    // Fallback to localStorage for development/testing
    localStorage.clear();
  }
} 