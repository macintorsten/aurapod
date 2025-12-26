import { useState, useRef, useCallback } from 'react';
import { Podcast } from '../types';
import { rssService } from '../services/rssService';

/**
 * Hook for podcast search with debouncing and error handling
 * @param onError - Optional callback for handling search errors
 * @returns Search state and functions
 */
export const usePodcastSearch = (onError?: (err: any, query: string) => void) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  /**
   * Search for podcasts with 500ms debounce
   * @param query - Search query string
   */
  const search = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await rssService.searchPodcasts(query);
        setSearchResults(results);
      } catch (err) {
        onError?.(err, query);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, [onError]);

  /**
   * Clear search query and results
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    searchQuery,
    searchResults,
    searching,
    search,
    clearSearch,
  };
};
