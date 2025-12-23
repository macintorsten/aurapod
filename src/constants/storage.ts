/**
 * Storage keys used throughout the application
 * Centralized to prevent typos and make refactoring easier
 */

export const STORAGE_KEYS = {
  PODCASTS: 'aurapod_podcasts',
  HISTORY: 'aurapod_history',
  THEME: 'aurapod_theme',
  QUEUE: 'aurapod_queue',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
