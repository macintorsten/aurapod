import React, { useState, useEffect, useCallback, useMemo } from "react";
import { HashRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Podcast, Episode, PlaybackState } from "./types";
import { rssService } from "./services/rssService";
import { shareService, SharedData } from "./services/shareService";
import { storageService } from "./services/storageService";
import Player from "./components/Player";
import { useQueue } from "./hooks/useQueue";
import { usePodcastSearch } from "./hooks/usePodcastSearch";
import { MainLayout } from "./components/Layout";
import { SystemStatusPanel, ShareModal } from "./components/Modals";
import { LoadingView } from "./components/Loading";
import { HomePage } from "./pages/Home";
import { PodcastDetailPage } from "./pages/PodcastDetail";
import { ArchivePage } from "./pages/Archive";
import { NewReleasesPage } from "./pages/NewReleases";
import { AppProvider, useAppContext } from "./contexts/AppContext";
import { PlayerProvider, usePlayerContext } from "./contexts/PlayerContext";
import { UIProvider, useUIContext } from "./contexts/UIContext";
import { APP_CONSTANTS } from "./constants";
import confetti from "canvas-confetti";

const AppContent: React.FC = () => {
  const {
    podcasts,
    addPodcast,
    activePodcast,
    episodes,
    loadPodcast,
    newEpisodes,
    loadNewEpisodes,
    history,
    updateHistory,
    loading,
    loadingEpisodeId,
    errors,
    clearErrors,
  } = useAppContext();

  const {
    currentEpisode,
    setCurrentEpisode,
    playerAutoplay,
    setPlayerAutoplay,
  } = usePlayerContext();

  const {
    theme,
    setTheme,
    showStatusPanel,
    setShowStatusPanel,
    version,
  } = useUIContext();

  const [shareModalData, setShareModalData] = useState<{
    shareType: 'track' | 'rss';
    podcast?: Podcast;
    episode?: Episode;
  } | null>(null);
  const [suggestedPodcasts, setSuggestedPodcasts] = useState<Podcast[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const { queue, addToQueue, removeFromQueue, clearQueue, playNext } =
    useQueue();
  const {
    searchQuery,
    searchResults,
    searching,
    search: handleSearch,
  } = usePodcastSearch();

  // Load trending podcasts on mount
  useEffect(() => {
    rssService
      .getTrendingPodcasts()
      .then(setSuggestedPodcasts)
      .catch((err: any) => console.error("Failed to load trending:", err))
      .finally(() => setLoadingSuggestions(false));
  }, []);

  // Handle URL share data on mount
  useEffect(() => {
    // With hash routing, query params are in the hash fragment
    // Format: baseUrl/#/?s=encodedData
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    
    if (queryStart !== -1) {
      const queryString = hash.substring(queryStart + 1);
      const urlParams = new URLSearchParams(queryString);
      const sharedPayload = urlParams.get("s") || urlParams.get("d"); // Support both ?s= and legacy ?d=
      
      if (sharedPayload) {
        try {
          const data = shareService.decode(sharedPayload);
          if (data) {
            handleImportDirect(data);
          }
        } catch (e) {
          console.error("Failed to parse shared data:", e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportDirect = useCallback(
    async (data: SharedData) => {
      // Handle RSS manifest mode (sharing multiple episodes)
      if (data.shareMode === 'full-manifest' && data.episodes && data.episodes.length > 0) {
        const podcastId = data.p
          ? btoa(data.p).substring(0, 16)
          : APP_CONSTANTS.STANDALONE_PODCAST_ID_PREFIX;
        
        const standalonePodcast: Podcast = {
          id: podcastId,
          title: data.pt || APP_CONSTANTS.DEFAULT_SHARED_PODCAST_TITLE,
          image: data.pi || "",
          feedUrl: data.p || "",
          author: APP_CONSTANTS.DEFAULT_SHARED_AUTHOR,
          description: data.pd || "",
        };

        await loadPodcast(standalonePodcast);
        
        // Optionally auto-play the first episode
        const firstEpisode: Episode = {
          id: data.episodes[0].id,
          podcastId: podcastId,
          title: data.episodes[0].title,
          image: data.episodes[0].image || data.pi,
          description: data.episodes[0].description || "",
          audioUrl: data.episodes[0].audioUrl,
          duration: data.episodes[0].duration || "Shared",
          pubDate: data.episodes[0].pubDate || "",
          link: "",
          podcastTitle: data.pt,
        };
        setCurrentEpisode(firstEpisode);
        setPlayerAutoplay(false);
        
        return;
      }
      
      // Handle RSS frequency mode or wave-source mode
      if (data.p && !data.t) {
        // Just RSS URL, subscribe to it
        try {
          const { podcast } = await rssService.fetchPodcast(data.p);
          await loadPodcast(podcast);
        } catch (e) {
          console.error("Failed to load RSS feed:", e);
        }
        return;
      }
      
      // Handle single track (embedded-payload or wave-source)
      if (data.t && data.u) {
        const podcastId = data.p
          ? btoa(data.p).substring(0, 16)
          : APP_CONSTANTS.STANDALONE_PODCAST_ID_PREFIX;
        const standalonePodcast: Podcast = {
          id: podcastId,
          title: data.st || APP_CONSTANTS.DEFAULT_SHARED_PODCAST_TITLE,
          image: data.si || data.i || "",
          feedUrl: data.p || "",
          author: APP_CONSTANTS.DEFAULT_SHARED_AUTHOR,
          description: "",
        };
        const standaloneEpisode: Episode = {
          id: data.e || APP_CONSTANTS.DEFAULT_SHARED_EPISODE_ID,
          podcastId: podcastId,
          title: data.t,
          image: data.i,
          description: data.d || "",
          audioUrl: data.u,
          duration: "Shared",
          pubDate: "",
          link: "",
          podcastTitle: data.st,
        };

        await loadPodcast(standalonePodcast);
        setCurrentEpisode(standaloneEpisode);
        setPlayerAutoplay(false); // Don't auto-play shared links

        if (data.p) {
          try {
            await loadPodcast({ ...standalonePodcast, feedUrl: data.p });
          } catch (e) {
            console.error("Background feed sync failed:", e);
          }
        }
      }
    },
    [loadPodcast, setCurrentEpisode, setPlayerAutoplay]
  );

  const subscribePodcast = useCallback(
    (podcast: Podcast) => {
      addPodcast(podcast);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    },
    [addPodcast]
  );

  const handleSelectPodcast = useCallback(
    async (podcast: Podcast) => {
      await loadPodcast(podcast);
    },
    [loadPodcast]
  );

  const handlePlayEpisode = useCallback(
    (episode: Episode) => {
      setPlayerAutoplay(true);
      setCurrentEpisode(episode);
    },
    [setCurrentEpisode, setPlayerAutoplay]
  );

  const isSubscribed = useCallback(
    (feedUrl: string) => podcasts.some((p) => p.feedUrl === feedUrl),
    [podcasts]
  );

  const handlePlayFromHistory = useCallback(
    async (item: PlaybackState) => {
      const podcast = podcasts.find((p) => p.id === item.podcastId);

      if (podcast) {
        try {
          await loadPodcast(podcast);
          const ep = episodes.find((e) => e.id === item.episodeId);
          if (ep) {
            handlePlayEpisode(ep);
            return;
          }
        } catch (e) {
          console.error("Failed to load episode from history:", e);
        }
      }

      // Fallback: play from history snapshot
      if (item.audioUrl && item.title) {
        const historyEpisode: Episode = {
          id: item.episodeId,
          podcastId: item.podcastId,
          title: item.title,
          image: item.image,
          podcastTitle: item.podcastTitle,
          description: item.description || "",
          audioUrl: item.audioUrl,
          duration: item.duration
            ? `${Math.floor(item.duration / 60)}m`
            : "0:00",
          pubDate: item.pubDate || "",
          link: "",
        };
        handlePlayEpisode(historyEpisode);
      }
    },
    [podcasts, episodes, loadPodcast, handlePlayEpisode]
  );

  const generateShareData = useCallback(
    (podcastUrl: string, episodeId?: string) => {
      const pod =
        podcasts.find((p) => p.feedUrl === podcastUrl) || activePodcast;
      const ep =
        episodes.find((e) => e.id === episodeId) ||
        (currentEpisode?.id === episodeId ? currentEpisode : null);

      if (episodeId && ep) {
        // Sharing a track
        setShareModalData({
          shareType: 'track',
          podcast: pod || undefined,
          episode: ep,
        });
      } else {
        // Sharing RSS feed only
        setShareModalData({
          shareType: 'rss',
          podcast: pod || undefined,
        });
      }
    },
    [podcasts, activePodcast, episodes, currentEpisode]
  );

  const handlePlayNext = useCallback(() => {
    const nextEp = playNext();
    if (nextEp) {
      handlePlayEpisode(nextEp);
    }
  }, [playNext, handlePlayEpisode]);

  const syncHistory = useCallback(() => {
    // History is automatically synced via context
  }, []);

  const handleClearHistory = useCallback(() => {
    storageService.saveHistory({});
    window.location.reload();
  }, []);

  const playerPodcast = useMemo(() => {
    if (!currentEpisode) return null;
    return (
      podcasts.find((p) => p.id === currentEpisode.podcastId) ||
      activePodcast || {
        id: currentEpisode.podcastId,
        title: currentEpisode.podcastTitle || "Show",
        image: currentEpisode.podcastImage || currentEpisode.image || "",
        feedUrl: "",
        author: "",
        description: "",
      }
    );
  }, [currentEpisode, podcasts, activePodcast]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <MainLayout
          podcasts={podcasts}
          activePodcast={activePodcast}
          queueCount={queue.length}
          theme={theme}
          onThemeChange={setTheme}
          version={version}
          errorCount={errors.length}
          onShowStatusPanel={() => setShowStatusPanel(true)}
          onLoadNewEpisodes={loadNewEpisodes}
          onSyncHistory={syncHistory}
        >
      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <LoadingView message="Harmonizing Signal..." />
            ) : (
              <HomePage
                searchQuery={searchQuery}
                searchResults={searchResults}
                searching={searching}
                onSearch={handleSearch}
                suggestedPodcasts={suggestedPodcasts}
                loadingSuggestions={loadingSuggestions}
                onSubscribe={subscribePodcast}
                isSubscribed={isSubscribed}
              />
            )
          }
        />
        <Route
          path="/podcast/:feedUrl"
          element={
            <PodcastDetailPage
              episodes={episodes}
              currentEpisode={currentEpisode}
              loadingEpisodeId={loadingEpisodeId}
              onPlayEpisode={handlePlayEpisode}
              onAddToQueue={addToQueue}
              onShare={generateShareData}
              onSubscribe={subscribePodcast}
              isSubscribed={isSubscribed}
            />
          }
        />
        <Route
          path="/podcast/:feedUrl/episode/:episodeId"
          element={
            <PodcastDetailPage
              episodes={episodes}
              currentEpisode={currentEpisode}
              loadingEpisodeId={loadingEpisodeId}
              onPlayEpisode={handlePlayEpisode}
              onAddToQueue={addToQueue}
              onShare={generateShareData}
              onSubscribe={subscribePodcast}
              isSubscribed={isSubscribed}
            />
          }
        />
        <Route
          path="/new"
          element={
            <NewReleasesPage
              newEpisodes={newEpisodes}
              currentEpisode={currentEpisode}
              podcasts={podcasts}
              onPlayEpisode={handlePlayEpisode}
              onAddToQueue={addToQueue}
              onShare={generateShareData}
              onRefresh={loadNewEpisodes}
            />
          }
        />
        <Route
          path="/archive"
          element={
            <ArchivePage
              queue={queue}
              history={history}
              currentEpisode={currentEpisode}
              loadingEpisodeId={loadingEpisodeId}
              onPlayEpisode={handlePlayEpisode}
              onPlayFromHistory={handlePlayFromHistory}
              onRemoveFromQueue={removeFromQueue}
              onClearQueue={clearQueue}
              onClearHistory={handleClearHistory}
            />
          }
        />
      </Routes>

      {showStatusPanel && (
        <SystemStatusPanel
          errors={errors}
          onClose={() => setShowStatusPanel(false)}
          onClear={clearErrors}
        />
      )}

      {shareModalData && (
        <ShareModal
          shareType={shareModalData.shareType}
          podcast={shareModalData.podcast}
          episode={shareModalData.episode}
          onClose={() => setShareModalData(null)}
        />
      )}
        </MainLayout>
      </div>

      {currentEpisode && playerPodcast && (
        <Player
          episode={currentEpisode}
          podcast={playerPodcast}
          queue={queue}
          autoPlay={playerAutoplay}
          onNext={handlePlayNext}
          onRemoveFromQueue={removeFromQueue}
          onClearQueue={clearQueue}
          onClose={() => setCurrentEpisode(null)}
          onShare={() =>
            generateShareData(activePodcast?.feedUrl || "", currentEpisode.id)
          }
          onProgress={syncHistory}
          onReady={() => {}}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppProvider>
        <PlayerProvider>
          <UIProvider>
            <AppContent />
          </UIProvider>
        </PlayerProvider>
      </AppProvider>
    </HashRouter>
  );
};

export default App;
