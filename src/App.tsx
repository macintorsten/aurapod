import React, { useState, useEffect, useCallback, useMemo } from "react";
import { HashRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Podcast, Episode, PlaybackState } from "./types";
import { rssService } from "./services/rssService";
import { shareService, Feed, ShareType } from "./services/shareService";
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
    loadVirtualPodcast,
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
    shareType: ShareType;
    podcast?: Podcast;
    episode?: Episode;
  } | null>(null);
  const [suggestedPodcasts, setSuggestedPodcasts] = useState<Podcast[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

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

  const handleImportDirect = useCallback(
    async (feed: Feed) => {
      // Handle feed with multiple tracks (full-manifest mode)
      if (feed.tracks && feed.tracks.length > 1) {
        const podcastId = feed.url
          ? btoa(feed.url).substring(0, 16)
          : APP_CONSTANTS.STANDALONE_PODCAST_ID_PREFIX + Date.now();
        
        const virtualPodcast: Podcast = {
          id: podcastId,
          title: feed.title || APP_CONSTANTS.DEFAULT_SHARED_PODCAST_TITLE,
          image: "",
          feedUrl: "", // No RSS URL for virtual podcast
          author: APP_CONSTANTS.DEFAULT_SHARED_AUTHOR,
          description: feed.description || "Shared podcast content",
        };

        // Convert tracks to full episodes (pass feed image as fallback)
        const virtualEpisodes: Episode[] = feed.tracks.map((track, index) => 
          shareService.trackToEpisode(track, podcastId, index, feed.image || undefined)
        );

        // Load virtual podcast and navigate to it
        loadVirtualPodcast(virtualPodcast, virtualEpisodes);
        
        // Navigate to virtual podcast detail view (replace to clear ?s= param)
        navigate(`/shared/${podcastId}`, { replace: true });
        
        return;
      }
      
      // Handle RSS frequency mode (feed with URL but no tracks)
      if (feed.url && (!feed.tracks || feed.tracks.length === 0)) {
        // Just RSS URL, load it normally via existing route
        navigate(`/podcast/${encodeURIComponent(feed.url)}`, { replace: true });
        return;
      }
      
      // Handle single track (embedded-payload)
      if (feed.tracks && feed.tracks.length === 1) {
        const track = feed.tracks[0];
        const podcastId = APP_CONSTANTS.STANDALONE_PODCAST_ID_PREFIX + Date.now();
        
        const virtualPodcast: Podcast = {
          id: podcastId,
          title: feed.title || "Shared Track",
          image: "",
          feedUrl: "", // No RSS URL for virtual podcast
          author: APP_CONSTANTS.DEFAULT_SHARED_AUTHOR,
          description: feed.description || "Shared single track",
        };
        
        const virtualEpisode: Episode = shareService.trackToEpisode(track, podcastId, 0, feed.image || undefined);

        // Load as a virtual podcast with single episode
        loadVirtualPodcast(virtualPodcast, [virtualEpisode]);
        
        // Navigate to virtual podcast detail view (replace to clear ?s= param)
        navigate(`/shared/${podcastId}`, { replace: true });
      }
    },
    [loadVirtualPodcast, navigate]
  );

  // Handle URL share data when location changes
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
  }, [location, handleImportDirect]);

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
          shareType: 'frequency',
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
          path="/shared/:podcastId"
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
