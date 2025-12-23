import { useState, useRef, useCallback } from 'react';
import { Podcast } from '../types';
import { rssService } from '../services/rssService';

export const usePodcastSearch = (onError?: (err: any, query: string) => void) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

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
