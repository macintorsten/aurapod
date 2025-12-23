
import React, { useState, useEffect, useRef } from 'react';
import { Podcast, Episode, PlaybackState, Theme } from './types';
import { storageService } from './services/storageService';
import { rssService } from './services/rssService';
import { shareService, SharedData } from './services/shareService';
import Player from './components/Player';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [history, setHistory] = useState<Record<string, PlaybackState>>({});
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<(Episode & { podcastTitle: string; podcastImage: string })[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const [suggestedPodcasts, setSuggestedPodcasts] = useState<Podcast[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [view, setView] = useState<'home' | 'podcast' | 'history' | 'new'>('home');
  const [theme, setTheme] = useState<Theme>(storageService.getTheme());
  
  // Share Modal State
  const [shareData, setShareData] = useState<SharedData | null>(null);
  const [importData, setImportData] = useState<SharedData | null>(null);

  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loadedPodcasts = storageService.getPodcasts();
    setPodcasts(loadedPodcasts);
    setHistory(storageService.getHistory());
    setQueue(storageService.getQueue());

    const fetchTrending = async () => {
      setLoadingSuggestions(true);
      const trending = await rssService.getTrendingPodcasts();
      setSuggestedPodcasts(trending);
      setLoadingSuggestions(false);
    };
    fetchTrending();

    const params = new URLSearchParams(window.location.search);
    const shareCode = params.get('s');
    if (shareCode) {
      const decoded = shareService.decode(shareCode);
      if (decoded) {
        setImportData(decoded);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: Theme) => {
      let actualTheme = t;
      if (t === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      root.classList.remove('light', 'dark');
      root.classList.add(actualTheme);
    };

    applyTheme(theme);
    storageService.saveTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  useEffect(() => {
    storageService.saveQueue(queue);
  }, [queue]);

  const addToQueue = (episode: Episode) => {
    if (queue.find(e => e.id === episode.id)) return;
    setQueue(prev => [...prev, episode]);
  };

  const removeFromQueue = (episodeId: string) => {
    setQueue(prev => prev.filter(e => e.id !== episodeId));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const playNext = () => {
    if (queue.length > 0) {
      const nextEpisode = queue[0];
      const nextQueue = queue.slice(1);
      
      const pod = podcasts.find(p => p.id === nextEpisode.podcastId);
      if (pod) {
        setActivePodcast(pod);
        setCurrentEpisode(nextEpisode);
        setQueue(nextQueue);
      } else {
        setQueue(nextQueue);
        playNext();
      }
    } else {
      setCurrentEpisode(null);
    }
  };

  const handleImport = async () => {
    if (!importData) return;
    setLoading(true);
    try {
      const feedsToLoad = importData.f || [];
      if (importData.p && !feedsToLoad.includes(importData.p)) {
        feedsToLoad.push(importData.p);
      }

      const results = await Promise.all(feedsToLoad.map(url => rssService.fetchPodcast(url).catch(() => null)));
      const newPodcasts = results.filter(r => r !== null).map(r => r!.podcast);
      
      const merged = [...podcasts];
      newPodcasts.forEach(np => {
        if (!merged.find(mp => mp.feedUrl === np.feedUrl)) {
          merged.push(np);
        }
      });

      setPodcasts(merged);
      storageService.savePodcasts(merged);

      if (importData.p) {
        const target = merged.find(p => p.feedUrl === importData.p);
        if (target) {
          handleSelectPodcast(target);
          if (importData.e) {
            const { episodes: targetEpisodes } = await rssService.fetchPodcast(target.feedUrl);
            const ep = targetEpisodes.find(e => e.id === importData.e);
            if (ep) setCurrentEpisode(ep);
          }
        }
      }
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      setErrorMsg("Failed to import shared content.");
    } finally {
      setLoading(false);
      setImportData(null);
    }
  };

  const handleSearch = async (query: string) => {
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
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const loadNewEpisodes = async () => {
    if (podcasts.length === 0) {
      setView('new');
      return;
    }
    setLoading(true);
    setView('new');
    try {
      const allRequests = podcasts.map(p => rssService.fetchPodcast(p.feedUrl).catch(() => null));
      const results = await Promise.all(allRequests);
      
      const aggregated: (Episode & { podcastTitle: string; podcastImage: string })[] = [];
      results.forEach((res, index) => {
        if (res) {
          res.episodes.slice(0, 5).forEach(ep => {
            aggregated.push({
              ...ep,
              podcastTitle: podcasts[index].title,
              podcastImage: podcasts[index].image
            });
          });
        }
      });

      aggregated.sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return dateB - dateA;
      });

      setNewEpisodes(aggregated);
    } catch (err) {
      setErrorMsg("Failed to sync new releases.");
    } finally {
      setLoading(false);
    }
  };

  const subscribePodcast = (podcast: Podcast) => {
    const exists = podcasts.find(p => p.feedUrl === podcast.feedUrl);
    if (!exists) {
      const updatedPodcasts = [...podcasts, podcast];
      setPodcasts(updatedPodcasts);
      storageService.savePodcasts(updatedPodcasts);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#8b5cf6', '#ec4899']
      });
    }
  };

  const handleAddPodcastByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl) return;
    
    setLoading(true);
    setErrorMsg(null);
    try {
      const { podcast } = await rssService.fetchPodcast(newFeedUrl);
      subscribePodcast(podcast);
      setNewFeedUrl('');
      handleSelectPodcast(podcast);
    } catch (error: any) {
      setErrorMsg(error.message || "Could not load podcast.");
      setTimeout(() => setErrorMsg(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPodcast = async (podcast: Podcast) => {
    setLoading(true);
    setErrorMsg(null);
    setActivePodcast(podcast);
    setView('podcast');
    try {
      const { episodes: podcastEpisodes, podcast: updatedDetails } = await rssService.fetchPodcast(podcast.feedUrl);
      setEpisodes(podcastEpisodes);
      setActivePodcast(prev => prev ? { ...prev, ...updatedDetails } : updatedDetails);
    } catch (err: any) {
      setErrorMsg("Error loading feed contents.");
    } finally {
      setLoading(false);
    }
  };

  const removePodcast = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = podcasts.filter(p => p.id !== id);
    setPodcasts(updated);
    storageService.savePodcasts(updated);
  };

  const getProgress = (episodeId: string) => {
    const state = history[episodeId];
    if (!state || !state.duration) return 0;
    return (state.currentTime / state.duration) * 100;
  };

  const isSubscribed = (feedUrl: string) => {
    return podcasts.some(p => p.feedUrl === feedUrl);
  };

  return (
    <div className="flex h-screen overflow-hidden text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 text-zinc-900 dark:text-white group cursor-pointer" onClick={() => setView('home')}>
            <div className="w-9 h-9 aura-logo rounded-xl flex items-center justify-center text-white animate-pulse-slow">
              <i className="fa-solid fa-microphone-lines text-sm relative z-10"></i>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight leading-none">AuraPod</h1>
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Standalone</span>
            </div>
          </div>
          
          <nav className="space-y-1">
            <button 
              onClick={() => setView('home')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${view === 'home' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
            >
              <i className="fa-solid fa-compass text-sm"></i> Discover
            </button>
            <button 
              onClick={loadNewEpisodes} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${view === 'new' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
            >
              <i className="fa-solid fa-sparkles text-sm"></i> New Releases
            </button>
            <button 
              onClick={() => setView('history')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${view === 'history' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
            >
              <i className="fa-solid fa-clock-rotate-left text-sm"></i> History
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Library</h2>
            {podcasts.length > 0 && (
              <button 
                onClick={() => setShareData({ f: podcasts.map(p => p.feedUrl) })}
                className="text-zinc-400 hover:text-indigo-500 transition"
                title="Share Library"
              >
                <i className="fa-solid fa-share-nodes text-[10px]"></i>
              </button>
            )}
          </div>
          <div className="space-y-1">
            {podcasts.map(p => (
              <div 
                key={p.id} 
                onClick={() => handleSelectPodcast(p)}
                className={`group flex items-center gap-3 cursor-pointer p-2 rounded-xl transition ${activePodcast?.feedUrl === p.feedUrl && view === 'podcast' ? 'bg-indigo-500/10 dark:bg-indigo-900/20' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
              >
                <img src={p.image} className="w-8 h-8 rounded-lg object-cover shadow-sm" alt="" />
                <span className={`text-xs truncate flex-1 ${activePodcast?.feedUrl === p.feedUrl && view === 'podcast' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : ''}`}>{p.title}</span>
                <button 
                  onClick={(e) => removePodcast(p.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition"
                >
                  <i className="fa-solid fa-trash-can text-[10px]"></i>
                </button>
              </div>
            ))}
            {podcasts.length === 0 && (
              <p className="text-[10px] text-zinc-500 italic px-2">Your library is empty.</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
           {/* Theme Switcher */}
           <div className="flex items-center justify-between p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
              <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${theme === 'light' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}><i className="fa-solid fa-sun text-xs"></i></button>
              <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${theme === 'dark' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}><i className="fa-solid fa-moon text-xs"></i></button>
              <button onClick={() => setTheme('system')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${theme === 'system' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}><i className="fa-solid fa-desktop text-xs"></i></button>
           </div>

           <form onSubmit={handleAddPodcastByUrl} className="space-y-2">
             <input 
               type="text" 
               placeholder="Add via RSS URL..." 
               className="w-full bg-zinc-200 dark:bg-zinc-800 border-none rounded-xl py-2.5 px-3 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-zinc-500"
               value={newFeedUrl}
               onChange={(e) => setNewFeedUrl(e.target.value)}
             />
             <button 
               type="submit" 
               disabled={loading}
               className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-plus"></i> Import Show</>}
             </button>
           </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
        <header className="h-16 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-8 justify-between shrink-0 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-zinc-900 dark:text-white text-lg">
              {view === 'home' ? 'Discover' : view === 'history' ? 'History' : view === 'new' ? 'New Releases' : activePodcast?.title}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             {errorMsg && (
               <div className="bg-red-500/10 text-red-600 dark:text-red-500 text-[10px] font-bold px-3 py-1.5 rounded-full border border-red-500/20 animate-fade-in">
                 <i className="fa-solid fa-circle-exclamation mr-1"></i> {errorMsg}
               </div>
             )}
             <div className="w-8 h-8 rounded-full aura-logo shadow-lg shadow-indigo-500/20 opacity-80"></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-32">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto">
              <div className="mb-12">
                <div className="relative max-w-2xl">
                  <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400"></i>
                  <input 
                    type="text"
                    placeholder="Search millions of podcasts..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-5 pl-14 pr-6 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-400 text-lg shadow-sm"
                  />
                  {searching && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                      <i className="fa-solid fa-spinner fa-spin text-indigo-500"></i>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-12">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-8">Search Results</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                      {searchResults.map(result => (
                        <div 
                          key={result.id}
                          onClick={() => handleSelectPodcast(result)}
                          className="group cursor-pointer flex flex-col"
                        >
                          <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-300">
                            <img src={result.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); subscribePodcast(result); }}
                                 className="bg-white text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-full hover:bg-zinc-100 transition transform hover:scale-105"
                               >
                                 {isSubscribed(result.feedUrl) ? 'IN LIBRARY' : 'ADD TO LIBRARY'}
                               </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-zinc-900 dark:text-white truncate text-sm mb-1">{result.title}</h4>
                          <p className="text-[10px] text-zinc-500 truncate font-medium">{result.author}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!searchQuery && (
                <>
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-8">Trending Worldwide</h3>
                    {loadingSuggestions ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-900/40 rounded-2xl"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {suggestedPodcasts.map(podcast => (
                          <button 
                            key={podcast.feedUrl || podcast.id}
                            onClick={() => handleSelectPodcast(podcast)}
                            className="bg-zinc-50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition flex items-center gap-4 group shadow-sm text-left"
                          >
                            <img src={podcast.image} className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm" alt="" />
                            <div className="overflow-hidden flex-1">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{podcast.title}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{podcast.author}</p>
                            </div>
                            {isSubscribed(podcast.feedUrl) ? (
                              <i className="fa-solid fa-check text-green-500 shrink-0 ml-auto"></i>
                            ) : (
                              <i 
                                onClick={(e) => { e.stopPropagation(); subscribePodcast(podcast); }}
                                className="fa-solid fa-plus text-zinc-300 group-hover:text-indigo-600 transition shrink-0 ml-auto p-2 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-full"
                              ></i>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'history' && (
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">Listen History</h3>
              {Object.keys(history).length === 0 ? (
                <div className="text-center py-32 space-y-4">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                    <i className="fa-solid fa-clock-rotate-left text-2xl"></i>
                  </div>
                  <p className="text-zinc-500 italic">No history yet. Start listening to see your progress here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(history).sort((a,b) => b.lastUpdated - a.lastUpdated).map(item => (
                    <div key={item.episodeId} className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-5 shadow-sm">
                      <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0 flex items-center justify-center">
                        <i className="fa-solid fa-music text-lg"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-zinc-900 dark:text-white font-bold truncate">Episode {item.episodeId.slice(0, 8)}...</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(item.currentTime / (item.duration || 1)) * 100}%` }}></div>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold tabular-nums">
                            {Math.floor(item.currentTime / 60)}m / {Math.floor(item.duration / 60)}m
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'new' && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">New Releases</h3>
                <button 
                  onClick={loadNewEpisodes} 
                  disabled={loading}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                >
                  <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> Refresh
                </button>
              </div>

              {loading && newEpisodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-8">
                  <div className="w-20 h-20 aura-logo rounded-2xl animate-spin shadow-2xl flex items-center justify-center">
                    <i className="fa-solid fa-podcast text-white text-3xl"></i>
                  </div>
                  <p className="font-bold text-zinc-400 animate-pulse tracking-wide uppercase text-xs">Syncing Your Waves...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {newEpisodes.map(episode => (
                    <div key={episode.id} className="bg-zinc-50 dark:bg-zinc-900/30 hover:bg-white dark:hover:bg-zinc-900/60 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-900/50 transition group flex flex-col md:flex-row gap-8 shadow-sm">
                      <div className="relative shrink-0 w-28 h-28 md:w-36 md:h-36">
                        <img src={episode.podcastImage} className="w-full h-full object-cover rounded-2xl shadow-lg" alt="" />
                        <div className="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center rounded-2xl">
                          <button 
                            onClick={() => setCurrentEpisode(episode)}
                            className="w-12 h-12 bg-white text-zinc-950 rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition duration-300"
                          >
                            <i className="fa-solid fa-play ml-1"></i>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-3">
                           <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{episode.podcastTitle}</span>
                           <span className="text-zinc-300 dark:text-zinc-700">•</span>
                           <span className="text-[10px] text-zinc-500 font-medium">{new Date(episode.pubDate).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xl font-bold text-zinc-900 dark:text-white truncate mb-2 group-hover:text-indigo-600 transition">{episode.title}</h4>
                        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: episode.description }}></p>
                        <div className="mt-5 flex items-center gap-6 text-zinc-400">
                          <span className="text-[10px] font-bold uppercase tracking-tight"><i className="fa-regular fa-clock mr-2"></i> {episode.duration}</span>
                          <button onClick={() => addToQueue(episode)} className="text-[10px] font-bold uppercase tracking-tight hover:text-indigo-600 transition"><i className="fa-solid fa-plus mr-2"></i> Add to Queue</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'podcast' && activePodcast && (
            <div className="max-w-5xl mx-auto">
              <button 
                onClick={() => setView('home')}
                className="mb-10 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-3"
              >
                <i className="fa-solid fa-arrow-left"></i> Back to Explore
              </button>

              <div className="flex flex-col md:flex-row gap-10 mb-16 items-start">
                <img src={activePodcast.image} className="w-56 h-56 md:w-72 md:h-72 rounded-3xl shadow-2xl object-cover shrink-0" alt="" />
                <div className="space-y-5 flex-1 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">Aura Verified</span>
                    <div className="flex items-center gap-3">
                      {!isSubscribed(activePodcast.feedUrl) ? (
                        <button 
                          onClick={() => subscribePodcast(activePodcast)}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-xl hover:bg-indigo-700 transition transform hover:scale-105"
                        >
                          <i className="fa-solid fa-plus mr-2"></i> SUBSCRIBE
                        </button>
                      ) : (
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-6 py-2 rounded-full text-xs font-bold border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                          <i className="fa-solid fa-check"></i> LIBRARY
                        </span>
                      )}
                      <button 
                        onClick={() => setShareData({ p: activePodcast.feedUrl })}
                        className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 transition"
                      >
                        <i className="fa-solid fa-share-nodes"></i>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-5xl font-extrabold text-zinc-900 dark:text-white leading-tight tracking-tight">{activePodcast.title}</h3>
                  <p className="text-xl text-indigo-600 dark:text-indigo-400 font-semibold">{activePodcast.author}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-3xl leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: activePodcast.description }}></p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-zinc-100 dark:border-zinc-900">
                  <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">Episodes</h4>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{episodes.length} Available</span>
                </div>

                {episodes.map(episode => (
                  <div key={episode.id} className="bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-900 transition group">
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                      <div className="flex flex-col gap-4 shrink-0 pt-1">
                        <button 
                          onClick={() => setCurrentEpisode(episode)}
                          className="w-14 h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center hover:bg-indigo-600 dark:hover:bg-indigo-500 transition shadow-lg transform group-hover:scale-110"
                        >
                          <i className="fa-solid fa-play ml-1 text-lg"></i>
                        </button>
                        <button 
                          onClick={() => addToQueue(episode)}
                          className="w-14 h-10 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <i className="fa-solid fa-plus text-xs"></i>
                        </button>
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <h5 className="font-bold text-xl text-zinc-900 dark:text-white group-hover:text-indigo-600 transition cursor-pointer leading-snug" onClick={() => setCurrentEpisode(episode)}>{episode.title}</h5>
                          <button 
                            onClick={() => setShareData({ p: activePodcast.feedUrl, e: episode.id })}
                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-indigo-500 transition"
                          >
                            <i className="fa-solid fa-share-nodes text-xs"></i>
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                          <span>{episode.pubDate}</span>
                          <span className="text-zinc-200 dark:text-zinc-800">•</span>
                          <span>{episode.duration}</span>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: episode.description }}></p>

                        {getProgress(episode.id) > 0 && (
                          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-6">
                            <div className="h-full bg-indigo-500" style={{ width: `${getProgress(episode.id)}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {currentEpisode && (
        <Player 
          episode={currentEpisode} 
          podcast={activePodcast || { id: currentEpisode.podcastId, title: 'Unknown', image: '', feedUrl: '', author: '', description: '' }} 
          queue={queue}
          onNext={playNext}
          onRemoveFromQueue={removeFromQueue}
          onClearQueue={clearQueue}
          onClose={() => setCurrentEpisode(null)}
          onShare={() => setShareData({ p: activePodcast?.feedUrl || '', e: currentEpisode.id })}
        />
      )}

      {/* Share Modal */}
      {shareData && (
        <ShareModal 
          data={shareData} 
          onClose={() => setShareData(null)} 
        />
      )}

      {/* Import Notification */}
      {importData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-10 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-fade-in text-center">
             <div className="w-20 h-20 aura-logo rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <i className="fa-solid fa-wand-magic-sparkles text-white text-3xl"></i>
             </div>
             <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">Sync shared waves?</h3>
             <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-10 leading-relaxed">
               AuraPod detected shared content. Join this audio frequency and add it to your collection?
             </p>
             <div className="flex flex-col gap-4">
               <button onClick={handleImport} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition shadow-xl">Join Aura</button>
               <button onClick={() => setImportData(null)} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-bold rounded-2xl transition">Dismiss</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ShareModalProps {
  data: SharedData;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ data, onClose }) => {
  const { url, length, isTooLong } = shareService.generateUrl(data);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-xl" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-fade-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 aura-logo rounded-xl flex items-center justify-center text-white">
              <i className="fa-solid fa-share-nodes text-sm"></i>
            </div>
            <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Broadcast Wave</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 p-2 transition">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          Broadcasting a {data.f ? 'full library' : data.e ? 'specific episode' : 'show'}. The receiver can join this aura instantly.
        </p>

        <div className="space-y-6">
          <div className="relative">
            <input 
              readOnly 
              value={url} 
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl py-5 pl-6 pr-32 text-xs text-zinc-500 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none tabular-nums"
            />
            <button 
              onClick={handleCopy}
              className={`absolute right-2.5 top-2.5 bottom-2.5 px-6 rounded-xl font-bold text-xs transition flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {copied ? <><i className="fa-solid fa-check"></i> Copied</> : <><i className="fa-solid fa-copy"></i> Copy Link</>}
            </button>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className={`text-[10px] font-bold uppercase tracking-widest ${isTooLong ? 'text-orange-500' : 'text-zinc-400'}`}>
              <i className={`fa-solid ${isTooLong ? 'fa-triangle-exclamation mr-1.5' : 'fa-info-circle mr-1.5'}`}></i>
              Data Weight: {length} chars
            </div>
            {isTooLong && (
              <span className="text-[10px] text-orange-500 font-bold">Heavier wave, may be clipped by some apps.</span>
            )}
          </div>
        </div>

        <div className="mt-10 pt-10 border-t border-zinc-100 dark:border-zinc-800 flex gap-6 items-start">
          <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
             <i className="fa-solid fa-bolt-lightning text-xl"></i>
          </div>
          <div className="flex-1">
             <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1.5">Zero Server Dependency</h4>
             <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">This link encodes everything needed. No database or cloud storage involved—the data is in the URI itself.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
