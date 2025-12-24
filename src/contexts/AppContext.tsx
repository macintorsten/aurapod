import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Podcast, Episode, PlaybackState, AppError } from "../types";
import { storageService } from "../services/storageService";
import { rssService } from "../services/rssService";
import { createError, logError } from "../utils/errorHandlers";
import { APP_CONSTANTS } from "../constants";

interface AppContextValue {
  // Podcast library
  podcasts: Podcast[];
  addPodcast: (podcast: Podcast) => void;
  removePodcast: (podcastId: string) => void;

  // Episode management
  activePodcast: Podcast | null;
  episodes: Episode[];
  loadPodcast: (podcast: Podcast) => Promise<void>;
  loadVirtualPodcast: (podcast: Podcast, episodes: Episode[]) => void;

  // New episodes
  newEpisodes: (Episode & { podcastTitle: string; podcastImage: string })[];
  loadNewEpisodes: () => Promise<void>;
  markNewEpisodesSeen: (podcastId: string) => void;

  // History
  history: Record<string, PlaybackState>;
  updateHistory: (
    episode: Episode,
    podcast: Podcast | { title: string },
    currentTime: number,
    duration: number
  ) => void;

  // Loading states
  loading: boolean;
  loadingEpisodeId: string | null;

  // Error management
  errors: AppError[];
  addError: (
    category: AppError["category"],
    message: string,
    error?: any,
    context?: any
  ) => void;
  clearErrors: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [history, setHistory] = useState<Record<string, PlaybackState>>({});
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<
    (Episode & { podcastTitle: string; podcastImage: string })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingEpisodeId, setLoadingEpisodeId] = useState<string | null>(null);
  const [errors, setErrors] = useState<AppError[]>([]);

  // Load initial data
  useEffect(() => {
    const savedPodcasts = storageService.getPodcasts();
    const savedHistory = storageService.getHistory();
    setPodcasts(savedPodcasts);
    setHistory(savedHistory);
  }, []);

  // Save podcasts to storage when changed
  useEffect(() => {
    if (podcasts.length > 0) {
      storageService.savePodcasts(podcasts);
    }
  }, [podcasts]);

  // Add error handler
  const addError = useCallback(
    (
      category: AppError["category"],
      message: string,
      error?: any,
      context?: any
    ) => {
      const errorObj = createError(category, message, error, context);
      setErrors((prev) =>
        [errorObj, ...prev].slice(0, APP_CONSTANTS.MAX_ERRORS)
      );
      logError(errorObj);
    },
    []
  );

  // Add podcast
  const addPodcast = useCallback((podcast: Podcast) => {
    setPodcasts((prev) => {
      if (prev.some((p) => p.id === podcast.id)) {
        return prev;
      }
      return [...prev, podcast];
    });
  }, []);

  // Remove podcast
  const removePodcast = useCallback((podcastId: string) => {
    setPodcasts((prev) => prev.filter((p) => p.id !== podcastId));
  }, []);

  // Load podcast episodes
  const loadPodcast = useCallback(
    async (podcast: Podcast) => {
      setLoading(true);
      setActivePodcast(podcast);

      try {
        const { podcast: fetchedPodcast, episodes: fetchedEpisodes } = await rssService.fetchPodcast(
          podcast.feedUrl
        );
        // Update with the actual podcast data from the feed
        setActivePodcast(fetchedPodcast);
        setEpisodes(fetchedEpisodes);
      } catch (err) {
        addError("feed", `Failed to load podcast: ${podcast.title}`, err, {
          feedUrl: podcast.feedUrl,
        });
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    },
    [addError]
  );

  // Load virtual podcast (from shared data, not RSS)
  const loadVirtualPodcast = useCallback(
    (podcast: Podcast, episodes: Episode[]) => {
      setActivePodcast(podcast);
      setEpisodes(episodes);
      setLoading(false);
    },
    []
  );

  // Load new episodes from all podcasts
  const loadNewEpisodes = useCallback(async () => {
    setLoading(true);
    const allNewEpisodes: (Episode & {
      podcastTitle: string;
      podcastImage: string;
    })[] = [];

    for (const podcast of podcasts) {
      try {
        const { episodes: fetchedEpisodes } = await rssService.fetchPodcast(
          podcast.feedUrl
        );
        const recentEpisodes = fetchedEpisodes
          .slice(0, APP_CONSTANTS.MAX_NEW_EPISODES_PER_PODCAST)
          .map((ep) => ({
            ...ep,
            podcastTitle: podcast.title,
            podcastImage: podcast.image,
          }));
        allNewEpisodes.push(...recentEpisodes);
      } catch (err) {
        addError(
          "feed",
          `Failed to load new episodes for ${podcast.title}`,
          err
        );
      }
    }

    // Sort by date
    allNewEpisodes.sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
    setNewEpisodes(allNewEpisodes);
    setLoading(false);
  }, [podcasts, addError]);

  // Mark new episodes as seen (placeholder for future feature)
  const markNewEpisodesSeen = useCallback((podcastId: string) => {
    // Future: Track which episodes user has seen
    console.debug("Mark seen:", podcastId);
  }, []);

  // Update playback history
  const updateHistory = useCallback(
    (
      episode: Episode,
      podcast: Podcast | { title: string },
      currentTime: number,
      duration: number
    ) => {
      storageService.updatePlayback(episode, podcast, currentTime, duration);
      setHistory(storageService.getHistory());
    },
    []
  );

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const value: AppContextValue = {
    podcasts,
    addPodcast,
    removePodcast,
    activePodcast,
    episodes,
    loadPodcast,
    loadVirtualPodcast,
    newEpisodes,
    loadNewEpisodes,
    markNewEpisodesSeen,
    history,
    updateHistory,
    loading,
    loadingEpisodeId,
    errors,
    addError,
    clearErrors,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
