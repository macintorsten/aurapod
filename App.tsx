
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Podcast, Episode, PlaybackState, Theme } from './types';
import { storageService } from './services/storageService';
import { rssService } from './services/rssService';
import { shareService, SharedData } from './services/shareService';
import { APP_CONFIG } from './config';
import Player from './components/Player';
import EpisodeItem from './components/EpisodeItem';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [history, setHistory] = useState<Record<string, PlaybackState>>({});
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<(Episode & { podcastTitle: string; podcastImage: string })[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [playerAutoplay, setPlayerAutoplay] = useState(true);
  const [queue, setQueue] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const [suggestedPodcasts, setSuggestedPodcasts] = useState<Podcast[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [view, setView] = useState<'home' | 'podcast' | 'history' | 'new' | 'queue'>('home');
  const [theme, setTheme] = useState<Theme>(storageService.getTheme() || APP_CONFIG.defaultTheme);
  
  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Share Modal State
  const [shareData, setShareData] = useState<SharedData | null>(null);

  const searchTimeoutRef = useRef<number | null>(null);

  const handleImportDirect = useCallback(async (data: SharedData) => {
    setLoading(true);
    try {
      if (data.t && data.u) {
        const podcastId = data.p ? btoa(data.p).substring(0, 16) : 'standalone';
        const standalonePodcast: Podcast = {
          id: podcastId,
          title: data.st || 'Shared Frequency',
          image: data.si || data.i || '',
          feedUrl: data.p || '',
          author: 'Independent Broadcast',
          description: ''
        };

        const standaloneEpisode: Episode = {
          id: data.e || 'shared-track',
          podcastId: podcastId,
          title: data.t,
          image: data.i,
          description: data.d || '',
          audioUrl: data.u,
          duration: 'Shared',
          pubDate: '',
          link: '',
          podcastTitle: data.st
        };

        setActivePodcast(standalonePodcast);
        setEpisodes([standaloneEpisode]);
        setCurrentEpisode(standaloneEpisode);
        setPlayerAutoplay(false);
        setView('podcast');
        
        if (data.p) {
          try {
            const { podcast: fullPod, episodes: fullEps } = await rssService.fetchPodcast(data.p);
            setActivePodcast(fullPod);
            setEpisodes(fullEps);
          } catch (e) {
            console.warn("Background feed refresh failed", e);
          }
        }
      } 
      else if (data.p) {
        const { podcast, episodes: fetchedEpisodes } = await rssService.fetchPodcast(data.p);
        setActivePodcast(podcast);
        setEpisodes(fetchedEpisodes);
        setView('podcast');

        if (data.e) {
          const ep = fetchedEpisodes.find(it => it.id === data.e);
          if (ep) {
            setPlayerAutoplay(false);
            setCurrentEpisode(ep);
          }
        }
      } 
      else if (data.f && data.f.length > 0) {
        if (data.f.length === 1) {
          const { podcast, episodes: fetchedEpisodes } = await rssService.fetchPodcast(data.f[0]);
          setActivePodcast(podcast);
          setEpisodes(fetchedEpisodes);
          setView('podcast');
        } else {
          setView('home'); 
        }
      }

      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 }, colors: ['#6366f1', '#a855f7', '#ec4899'] });
    } catch (err) {
      setErrorMsg("Failed to synchronize with the shared wave.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(persistent => {
        if (persistent) console.log("Storage is persistent.");
      });
    }

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
    const viewParam = params.get('view');
    if (viewParam === 'history') setView('history');
    if (viewParam === 'new') setView('new');
    if (viewParam === 'queue') setView('queue');

    const shareCode = params.get('s');
    if (shareCode) {
      const decoded = shareService.decode(shareCode);
      if (decoded) {
        handleImportDirect(decoded);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [handleImportDirect]);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const syncHistory = useCallback(() => {
    setHistory(storageService.getHistory());
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
    let tempQueue = [...queue];
    let foundNext = false;

    while (tempQueue.length > 0) {
      const nextEpisode = tempQueue.shift()!;
      const pod = podcasts.find(p => p.id === nextEpisode.podcastId);
      
      if (pod) {
        setActivePodcast(pod);
        setPlayerAutoplay(true);
        setCurrentEpisode(nextEpisode);
        setQueue(tempQueue);
        foundNext = true;
        break;
      }
    }

    if (!foundNext) {
      setQueue([]);
      setCurrentEpisode(null);
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

  const handlePlayFromHistory = async (item: PlaybackState) => {
    setLoading(true);
    try {
      const feedUrl = podcasts.find(p => p.id === item.podcastId)?.feedUrl;
      if (feedUrl) {
        const { episodes: podcastEpisodes, podcast: p } = await rssService.fetchPodcast(feedUrl);
        const ep = podcastEpisodes.find(e => e.id === item.episodeId);
        if (ep) {
          setActivePodcast(p);
          setPlayerAutoplay(true);
          setCurrentEpisode(ep);
          return;
        }
      } 
      
      if (item.audioUrl && item.title) {
        setActivePodcast({
          id: item.podcastId,
          title: item.podcastTitle || 'Legacy Show',
          image: item.image || '',
          feedUrl: '',
          author: '',
          description: ''
        });
        setPlayerAutoplay(true);
        setCurrentEpisode({
           id: item.episodeId,
           podcastId: item.podcastId,
           title: item.title,
           image: item.image,
           podcastTitle: item.podcastTitle,
           description: item.description || '',
           audioUrl: item.audioUrl,
           duration: item.duration ? `${Math.floor(item.duration/60)}m` : '0:00',
           pubDate: item.pubDate || '',
           link: ''
        });
      } else {
        setErrorMsg("Original source frequency has faded.");
      }
    } catch (e) {
      setErrorMsg("Could not re-establish audio frequency.");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory({});
    storageService.saveHistory({});
  };

  const generateShareData = (pUrl: string, epId?: string) => {
    const data: SharedData = { p: pUrl, e: epId };
    if (epId) {
      const ep = episodes.find(it => it.id === epId);
      if (ep) {
        data.t = ep.title;
        data.u = ep.audioUrl;
        data.i = ep.image;
        data.d = shareService.sanitizeDescription(ep.description);
        data.st = activePodcast?.title;
        data.si = activePodcast?.image;
        data.p = undefined; 
      }
    }
    setShareData(data);
  };

  return (
    <div className="flex h-screen overflow-hidden text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 text-zinc-900 dark:text-white group cursor-pointer" onClick={() => setView('home')}>
            <div className="w-9 h-9 aura-logo rounded-xl flex items-center justify-center text-white animate-pulse-slow">
              <i className="fa-solid fa-microphone-lines text-sm relative z-10"></i>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight leading-none">{APP_CONFIG.appName}</h1>
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
              <i className="fa-solid fa-bolt-lightning text-sm"></i> New Releases
            </button>
            <button 
              onClick={() => { setView('queue'); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${view === 'queue' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
            >
              <i className="fa-solid fa-list-ul text-sm"></i> Play Queue
              {queue.length > 0 && (
                <span className="ml-auto text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">{queue.length}</span>
              )}
            </button>
            <button 
              onClick={() => { setView('history'); syncHistory(); }} 
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
          </div>

          {showInstallBanner && (
            <div className="mt-8 p-4 bg-indigo-500/10 dark:bg-indigo-900/20 border border-indigo-500/20 rounded-2xl animate-fade-in relative overflow-hidden group">
              <div className="absolute inset-0 aura-logo opacity-5 group-hover:opacity-10 transition"></div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 relative">Always Ready</p>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight mb-3 relative">Use {APP_CONFIG.appName} as an App</h4>
              <button 
                onClick={installApp}
                className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition relative"
              >
                ADD TO YOUR APPS
              </button>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600"
              >
                <i className="fa-solid fa-xmark text-[8px]"></i>
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
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

      <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
        <header className="h-16 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-8 justify-between shrink-0 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-zinc-900 dark:text-white text-lg">
              {view === 'home' ? 'Discover' : 
               view === 'history' ? 'History' : 
               view === 'new' ? 'New Releases' : 
               view === 'queue' ? 'Play Queue' :
               activePodcast?.title}
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-900/40 rounded-2xl"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {suggestedPodcasts.map(podcast => (
                          <button 
                            key={podcast.feedUrl || podcast.id}
                            onClick={() => handleSelectPodcast(podcast)}
                            className="bg-zinc-50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition flex items-center gap-4 group shadow-sm text-left overflow-hidden"
                          >
                            <img src={podcast.image} className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm" alt="" />
                            <div className="overflow-hidden flex-1 min-w-0">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{podcast.title}</p>
                              <p className="text-[10px] text-zinc-500 truncate font-medium">{podcast.author}</p>
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
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Waves of the Past</h3>
                <button 
                  onClick={clearHistory}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 transition tracking-widest uppercase px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
                >
                  <i className="fa-solid fa-trash-can mr-2"></i> Clear History
                </button>
              </div>

              {Object.keys(history).length === 0 ? (
                <div className="text-center py-40 space-y-4">
                  <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-200 shadow-inner">
                    <i className="fa-solid fa-clock-rotate-left text-3xl"></i>
                  </div>
                  <p className="text-zinc-500 italic font-medium">Your waves haven't broken yet. Start listening to see your history.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {(Object.values(history) as PlaybackState[]).sort((a,b) => b.lastUpdated - a.lastUpdated).map(item => (
                    <EpisodeItem 
                      key={item.episodeId}
                      isActive={currentEpisode?.id === item.episodeId}
                      episode={{
                        id: item.episodeId,
                        title: item.title || 'Untitled Wave',
                        image: item.image,
                        podcastTitle: item.podcastTitle,
                        description: item.description,
                        pubDate: item.pubDate,
                        podcastId: item.podcastId,
                        audioUrl: item.audioUrl,
                        duration: item.duration ? `${Math.floor(item.duration/60)}m` : 'Shared'
                      }}
                      progress={(item.currentTime / (item.duration || 1)) * 100}
                      onPlay={() => handlePlayFromHistory(item)}
                      onQueue={() => {
                        const ep = {
                          id: item.episodeId,
                          podcastId: item.podcastId,
                          title: item.title || '',
                          description: item.description || '',
                          pubDate: item.pubDate || '',
                          audioUrl: item.audioUrl || '',
                          duration: item.duration ? `${Math.floor(item.duration/60)}m` : '0:00',
                          link: '',
                          image: item.image,
                          podcastTitle: item.podcastTitle
                        };
                        addToQueue(ep);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'queue' && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Upcoming Frequencies</h3>
                <button 
                  onClick={clearQueue}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 transition tracking-widest uppercase px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
                >
                  <i className="fa-solid fa-layer-group mr-2"></i> Clear Queue
                </button>
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-40 space-y-4">
                  <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-200 shadow-inner">
                    <i className="fa-solid fa-list-ul text-3xl"></i>
                  </div>
                  <p className="text-zinc-500 italic font-medium">The queue is silent. Add episodes to keep the waves rolling.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {queue.map((episode, idx) => (
                    <EpisodeItem 
                      key={episode.id + idx}
                      isActive={currentEpisode?.id === episode.id}
                      episode={episode}
                      progress={getProgress(episode.id)}
                      onPlay={() => { setPlayerAutoplay(true); setCurrentEpisode(episode); removeFromQueue(episode.id); }}
                      onRemove={() => removeFromQueue(episode.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'new' && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Fresh Frequencies</h3>
                <button 
                  onClick={loadNewEpisodes} 
                  disabled={loading}
                  className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition uppercase tracking-widest"
                >
                  <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> Sync
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
                    <EpisodeItem 
                      key={episode.id}
                      isActive={currentEpisode?.id === episode.id}
                      episode={episode}
                      progress={getProgress(episode.id)}
                      onPlay={() => { setPlayerAutoplay(true); setCurrentEpisode(episode); }}
                      onQueue={() => addToQueue(episode)}
                    />
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

              <div className="flex flex-col md:flex-row gap-10 mb-20 items-start">
                <img src={activePodcast.image} className="w-56 h-56 md:w-72 md:h-72 rounded-[2.5rem] shadow-2xl object-cover shrink-0" alt="" />
                <div className="space-y-6 flex-1 pt-2 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0">Aura Verified</span>
                    <div className="flex items-center gap-3">
                      {!isSubscribed(activePodcast.feedUrl) ? (
                        <button 
                          onClick={() => subscribePodcast(activePodcast)}
                          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-bold shadow-xl hover:bg-indigo-700 transition transform hover:scale-105"
                        >
                          <i className="fa-solid fa-plus mr-2"></i> SUBSCRIBE
                        </button>
                      ) : (
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-8 py-3 rounded-2xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                          <i className="fa-solid fa-check"></i> LIBRARY
                        </span>
                      )}
                      <button 
                        onClick={() => generateShareData(activePodcast.feedUrl)}
                        className="w-12 h-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 transition"
                      >
                        <i className="fa-solid fa-share-nodes"></i>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-5xl font-extrabold text-zinc-900 dark:text-white leading-tight tracking-tight break-words">{activePodcast.title}</h3>
                  <p className="text-xl text-indigo-600 dark:text-indigo-400 font-bold truncate">{activePodcast.author}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-3xl leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: activePodcast.description }}></p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between pb-8 border-b border-zinc-100 dark:border-zinc-900">
                  <h4 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Episodes</h4>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{episodes.length} AVAILABLE</span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {episodes.map(episode => (
                    <EpisodeItem 
                      key={episode.id}
                      isActive={currentEpisode?.id === episode.id}
                      episode={episode}
                      progress={getProgress(episode.id)}
                      onPlay={() => { setPlayerAutoplay(true); setCurrentEpisode(episode); }}
                      onQueue={() => addToQueue(episode)}
                      onShare={() => generateShareData(activePodcast.feedUrl, episode.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {currentEpisode && (
        <Player 
          episode={currentEpisode} 
          podcast={activePodcast || { id: currentEpisode.podcastId, title: currentEpisode.podcastTitle || 'Unknown Show', image: currentEpisode.podcastImage || '', feedUrl: '', author: '', description: '' }} 
          queue={queue}
          autoPlay={playerAutoplay}
          onNext={playNext}
          onRemoveFromQueue={removeFromQueue}
          onClearQueue={clearQueue}
          onClose={() => setCurrentEpisode(null)}
          onShare={() => generateShareData(activePodcast?.feedUrl || '', currentEpisode.id)}
          onProgress={syncHistory}
        />
      )}

      {loading && !activePodcast && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-8">
            <div className="w-24 h-24 aura-logo rounded-[2.5rem] flex items-center justify-center animate-spin shadow-2xl">
              <i className="fa-solid fa-wand-magic-sparkles text-white text-4xl"></i>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-tight">Tuning Frequency...</h3>
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-[0.2em]">Synthesizing Wave Metadata</p>
            </div>
          </div>
        </div>
      )}

      {shareData && (
        <ShareModal 
          data={shareData} 
          onClose={() => setShareData(null)} 
        />
      )}
    </div>
  );
};

interface ShareModalProps {
  data: SharedData;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ data, onClose }) => {
  const { url, length, isTooLong, payloadLength } = shareService.generateUrl(data);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSummaryTitle = () => {
    if (data.t) return "Universal Track Broadcast";
    if (data.p) return "Podcast Series Broadcast";
    if (data.f) return "Library Collection Broadcast";
    return "Aura Wave Broadcast";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-xl" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-fade-in flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 aura-logo rounded-2xl flex items-center justify-center text-white">
              <i className="fa-solid fa-share-nodes text-lg"></i>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">{getSummaryTitle()}</h3>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Immutable Payload Structure</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Wave Payload Content</h4>
            <div className="space-y-4">
              {data.t && (
                <div className="flex items-start gap-4">
                  <img src={data.i} className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-800" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-zinc-900 dark:text-white mb-1 leading-tight">{data.t}</p>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-tight">{data.st || 'Standalone Broadcast'}</p>
                    {data.d && <p className="text-[10px] text-zinc-500 mt-2 line-clamp-2 leading-relaxed italic">{data.d}</p>}
                  </div>
                </div>
              )}
              
              {!data.t && data.p && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <i className="fa-solid fa-rss text-lg"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">RSS FEED LINK</p>
                    <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">{data.p}</p>
                  </div>
                </div>
              )}

              {data.f && data.f.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <i className="fa-solid fa-layer-group text-lg"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">DISCOVERY COLLECTION</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{data.f.length} Feeds Encoded</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Universal Access Link</h4>
            <div className="flex flex-col gap-3">
              <div className="bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl py-4 px-6 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 break-all leading-relaxed max-h-40 overflow-y-auto">
                {url}
              </div>
              <button 
                onClick={handleCopy}
                className={`w-full py-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-3 ${copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20'}`}
              >
                {copied ? <><i className="fa-solid fa-check"></i> Copied Payload</> : <><i className="fa-solid fa-copy"></i> Copy Broadcast URL</>}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <i className="fa-solid fa-box-open"></i> Payload Size: {payloadLength} bytes
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isTooLong ? 'text-orange-500' : 'text-zinc-400'}`}>
                <i className={`fa-solid ${isTooLong ? 'fa-triangle-exclamation' : 'fa-link'}`}></i>
                Total Wave: {length} bytes
              </div>
            </div>
            {isTooLong && (
              <span className="text-[10px] text-orange-500 font-bold text-center">CRITICAL: Link may be too heavy for some platforms.</span>
            )}
          </div>
        </div>

        <div className="mt-8 shrink-0 bg-indigo-500/5 dark:bg-indigo-900/10 rounded-2xl p-4 flex gap-4 items-center border border-indigo-500/10">
          <i className="fa-solid fa-bolt-lightning text-indigo-500 text-lg"></i>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug font-medium">This wave uses <b>Deflate compression</b> to embed full track metadata. The receiver synthesizes the audio environment instantly with zero handshake required.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
