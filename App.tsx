
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Podcast, Episode, PlaybackState, Theme, AppError, ErrorCategory } from './types';
import { storageService } from './services/storageService';
import { rssService } from './services/rssService';
import { shareService, SharedData } from './services/shareService';
import { APP_CONFIG } from './config';
import Player from './components/Player';
import EpisodeItem from './components/EpisodeItem';
import confetti from 'canvas-confetti';

interface VersionInfo {
  version: string;
  codename: string;
  buildDate: string;
}

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
  const [loadingEpisodeId, setLoadingEpisodeId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const [suggestedPodcasts, setSuggestedPodcasts] = useState<Podcast[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [view, setView] = useState<'home' | 'podcast' | 'archive' | 'new'>('home');
  const [theme, setTheme] = useState<Theme>(storageService.getTheme() || APP_CONFIG.defaultTheme);
  const [version, setVersion] = useState<VersionInfo>({ version: '0.0.1', codename: 'Aurora', buildDate: '2023-11-20' });
  const [shareData, setShareData] = useState<SharedData | null>(null);

  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('./version.json')
      .then(res => res.json())
      .then(setVersion)
      .catch(err => console.debug("Version metadata unavailable", err));
  }, []);

  const logError = useCallback((category: ErrorCategory, message: string, error?: any, context?: any) => {
    const diagnostics = (error as any)?.diagnostics || {};
    const errorObj: AppError = {
      category,
      message,
      details: error?.stack || error?.message || String(error),
      timestamp: Date.now(),
      context: { ...context, diagnostics, userAgent: navigator.userAgent, href: window.location.href }
    };
    setErrors(prev => [errorObj, ...prev].slice(0, 20));
    console.error(`[AuraPod:${category}]`, message, errorObj);
  }, []);

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
            logError('network', "Background feed sync failed", e, { url: data.p });
          }
        }
      } else if (data.p) {
        const { podcast, episodes: fetchedEpisodes } = await rssService.fetchPodcast(data.p);
        setActivePodcast(podcast);
        setEpisodes(fetchedEpisodes);
        setView('podcast');
        if (data.e) {
          const ep = fetchedEpisodes.find(it => it.id === data.e);
          if (ep) { setPlayerAutoplay(false); setCurrentEpisode(ep); }
        }
      }
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 }, colors: ['#6366f1', '#a855f7', '#ec4899'] });
    } catch (err) {
      logError('system', "Failed to synchronize shared data", err);
    } finally {
      setLoading(false);
    }
  }, [logError]);

  useEffect(() => {
    setPodcasts(storageService.getPodcasts());
    setHistory(storageService.getHistory());
    setQueue(storageService.getQueue());
    const fetchTrending = async () => {
      setLoadingSuggestions(true);
      try {
        const trending = await rssService.getTrendingPodcasts();
        setSuggestedPodcasts(trending);
      } catch (err) {
        logError('network', "Trending feed failed", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchTrending();
    const params = new URLSearchParams(window.location.search);
    const shareCode = params.get('s');
    if (shareCode) {
      const decoded = shareService.decode(shareCode);
      if (decoded) {
        handleImportDirect(decoded);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [handleImportDirect, logError]);

  const syncHistory = useCallback(() => setHistory(storageService.getHistory()), []);

  useEffect(() => {
    const root = window.document.documentElement;
    const actualTheme = theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);
    storageService.saveTheme(theme);
  }, [theme]);

  const addToQueue = (episode: Episode) => {
    if (queue.find(e => e.id === episode.id)) return;
    const updated = [...queue, episode];
    setQueue(updated);
    storageService.saveQueue(updated);
    confetti({ particleCount: 15, spread: 30, origin: { y: 0.9 } });
  };

  const removeFromQueue = (episodeId: string) => {
    const updated = queue.filter(e => e.id !== episodeId);
    setQueue(updated);
    storageService.saveQueue(updated);
  };

  const playNext = () => {
    let tempQueue = [...queue];
    if (tempQueue.length > 0) {
      const nextEpisode = tempQueue.shift()!;
      const pod = podcasts.find(p => p.id === nextEpisode.podcastId);
      if (pod) {
        setActivePodcast(pod);
        setPlayerAutoplay(true);
        setCurrentEpisode(nextEpisode);
        setQueue(tempQueue);
        storageService.saveQueue(tempQueue);
      }
    } else {
      setCurrentEpisode(null);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    searchTimeoutRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await rssService.searchPodcasts(query);
        setSearchResults(results);
      } catch (err) {
        logError('network', "Search failed", err, { query });
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const loadNewEpisodes = async () => {
    const currentPodcasts = storageService.getPodcasts();
    if (currentPodcasts.length === 0) { 
      setNewEpisodes([]);
      setView('new'); 
      return; 
    }
    setLoading(true); 
    setView('new');
    try {
      const allRequests = currentPodcasts.map(p => rssService.fetchPodcast(p.feedUrl).catch(e => {
        logError('network', `Refresh failed for ${p.title}`, e, { url: p.feedUrl });
        return null;
      }));
      const results = await Promise.all(allRequests);
      const aggregated: (Episode & { podcastTitle: string; podcastImage: string })[] = [];
      results.forEach((res, index) => {
        if (res) {
          res.episodes.slice(0, 10).forEach(ep => {
            aggregated.push({ 
              ...ep, 
              podcastTitle: currentPodcasts[index].title, 
              podcastImage: currentPodcasts[index].image 
            });
          });
        }
      });
      // Sort by date - descending
      aggregated.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setNewEpisodes(aggregated.slice(0, 50));
    } catch (err) {
      logError('system', "Failed to aggregate updates", err);
    } finally {
      setLoading(false);
    }
  };

  const subscribePodcast = (podcast: Podcast) => {
    if (!podcasts.find(p => p.feedUrl === podcast.feedUrl)) {
      const updated = [...podcasts, podcast];
      setPodcasts(updated);
      storageService.savePodcasts(updated);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    }
  };

  const handleSelectPodcast = async (podcast: Podcast) => {
    setActivePodcast(podcast); setView('podcast'); setLoading(true);
    try {
      const { episodes: podcastEpisodes, podcast: updatedDetails } = await rssService.fetchPodcast(podcast.feedUrl);
      setEpisodes(podcastEpisodes);
      setActivePodcast(prev => prev ? { ...prev, ...updatedDetails } : updatedDetails);
    } catch (err: any) {
      logError('parsing', `Failed to load ${podcast.title}`, err, { url: podcast.feedUrl });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayEpisode = (episode: Episode) => {
    setLoadingEpisodeId(episode.id);
    setPlayerAutoplay(true);
    setCurrentEpisode(episode);
  };

  const isSubscribed = (feedUrl: string) => podcasts.some(p => p.feedUrl === feedUrl);

  const handlePlayFromHistory = async (item: PlaybackState) => {
    setLoading(true);
    try {
      const feedUrl = podcasts.find(p => p.id === item.podcastId)?.feedUrl;
      if (feedUrl) {
        const { episodes: podcastEpisodes, podcast: p } = await rssService.fetchPodcast(feedUrl);
        const ep = podcastEpisodes.find(e => e.id === item.episodeId);
        if (ep) { setActivePodcast(p); handlePlayEpisode(ep); return; }
      } 
      if (item.audioUrl && item.title) {
        setActivePodcast({ id: item.podcastId, title: item.podcastTitle || 'Archive Show', image: item.image || '', feedUrl: '', author: '', description: '' });
        handlePlayEpisode({ id: item.episodeId, podcastId: item.podcastId, title: item.title, image: item.image, podcastTitle: item.podcastTitle, description: item.description || '', audioUrl: item.audioUrl, duration: item.duration ? `${Math.floor(item.duration/60)}m` : '0:00', pubDate: item.pubDate || '', link: '' });
      }
    } catch (e) {
      logError('network', "Failed to re-fetch archived episode", e, { item });
    } finally {
      setLoading(false);
    }
  };

  const generateShareData = (pUrl: string, epId?: string) => {
    const pod = podcasts.find(p => p.feedUrl === pUrl) || activePodcast;
    const ep = episodes.find(e => e.id === epId) || (currentEpisode?.id === epId ? currentEpisode : null);
    
    const data: SharedData = { p: pUrl, e: epId };
    if (ep) {
      data.t = ep.title; data.u = ep.audioUrl; data.i = ep.image;
      data.d = shareService.sanitizeDescription(ep.description);
      data.st = pod?.title; data.si = pod?.image;
    }
    setShareData(data);
  };

  const playerPodcast = useMemo(() => {
    if (!currentEpisode) return null;
    return podcasts.find(p => p.id === currentEpisode.podcastId) || activePodcast || { id: currentEpisode.podcastId, title: currentEpisode.podcastTitle || 'Show', image: currentEpisode.podcastImage || '', feedUrl: '', author: '', description: '' };
  }, [currentEpisode, podcasts, activePodcast]);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 font-sans">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex shrink-0">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8 text-zinc-900 dark:text-white group cursor-pointer" onClick={() => setView('home')}>
              <div className="w-9 h-9 aura-logo rounded-xl flex items-center justify-center text-white animate-pulse-slow">
                <i className="fa-solid fa-microphone-lines text-sm relative z-10"></i>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight leading-none">{APP_CONFIG.appName}</h1>
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">V{version.version}</span>
              </div>
            </div>
            <nav className="space-y-1">
              <button onClick={() => setView('home')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${view === 'home' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}><i className="fa-solid fa-compass text-sm"></i> Discover</button>
              <button onClick={loadNewEpisodes} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${view === 'new' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}><i className="fa-solid fa-bolt-lightning text-sm"></i> New Releases</button>
              <button onClick={() => { setView('archive'); syncHistory(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${view === 'archive' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}><i className="fa-solid fa-box-archive text-sm"></i> Signal Archive {(queue.length > 0) && <span className="ml-auto text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">{queue.length}</span>}</button>
            </nav>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Library</h2></div>
            <div className="space-y-1">
              {podcasts.map(p => (
                <div key={p.id} onClick={() => handleSelectPodcast(p)} className={`group flex items-center gap-3 cursor-pointer p-2 rounded-xl transition ${activePodcast?.feedUrl === p.feedUrl && view === 'podcast' ? 'bg-indigo-500/10 dark:bg-indigo-900/20' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                  <img src={p.image} className="w-8 h-8 rounded-lg object-cover shadow-sm" alt="" />
                  <span className={`text-xs truncate flex-1 ${activePodcast?.feedUrl === p.feedUrl && view === 'podcast' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : ''}`}>{p.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
             <div className="flex items-center justify-between p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
                <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${theme === 'light' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}><i className="fa-solid fa-sun text-xs"></i></button>
                <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${theme === 'dark' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}><i className="fa-solid fa-moon text-xs"></i></button>
                <button onClick={() => setTheme('system')} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${theme === 'system' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}><i className="fa-solid fa-desktop text-xs"></i></button>
             </div>
             <div className="text-center"><span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{version.codename} • {version.buildDate}</span></div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">
          <header className="h-16 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-8 justify-between shrink-0 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-zinc-900 dark:text-white text-lg">
                {view === 'home' ? 'Discover' : view === 'archive' ? 'Signal Archive' : view === 'new' ? 'New Releases' : activePodcast?.title}
              </h2>
            </div>
            <div className="flex items-center gap-3">
               {errors.length > 0 && (
                 <button onClick={() => setShowStatusPanel(true)} className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition group">
                   <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                   <span className="absolute right-12 hidden group-hover:block whitespace-nowrap bg-zinc-900 text-white text-[10px] py-1 px-3 rounded-md">System Alerts ({errors.length})</span>
                 </button>
               )}
               <button onClick={() => { setView('home'); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="w-8 h-8 rounded-full aura-logo shadow-lg opacity-80 hover:opacity-100 transition-opacity transform hover:scale-105" title={`${APP_CONFIG.appName} ${version.version}`}></button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 pb-12">
            {loading && (
              <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Harmonizing Signal...</p>
              </div>
            )}

            {!loading && view === 'home' && (
              <div className="max-w-6xl mx-auto">
                <div className="mb-12">
                  <div className="relative max-w-2xl">
                    <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400"></i>
                    <input type="text" placeholder="Explore millions of frequencies..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-5 pl-14 pr-6 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-400 text-lg shadow-sm" />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                      {searchResults.map(result => (
                        <div key={result.id} onClick={() => handleSelectPodcast(result)} className="group cursor-pointer flex flex-col">
                          <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all"><img src={result.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="" /></div>
                          <h4 className="font-bold text-zinc-900 dark:text-white truncate text-sm">{result.title}</h4>
                          <p className="text-[10px] text-zinc-500 truncate font-medium">{result.author}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!searchQuery && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-8">Trending Now</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {suggestedPodcasts.map(podcast => (
                        <button key={podcast.id} onClick={() => handleSelectPodcast(podcast)} className="bg-zinc-50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition flex items-center gap-4 group">
                          <img src={podcast.image} className="w-16 h-16 rounded-xl object-cover shrink-0" alt="" />
                          <div className="overflow-hidden flex-1 text-left"><p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{podcast.title}</p><p className="text-[10px] text-zinc-500 truncate font-medium">{podcast.author}</p></div>
                          {isSubscribed(podcast.feedUrl) ? <i className="fa-solid fa-check text-green-500 ml-auto"></i> : <i onClick={(e) => { e.stopPropagation(); subscribePodcast(podcast); }} className="fa-solid fa-plus text-zinc-300 group-hover:text-indigo-600 transition ml-auto"></i>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!loading && view === 'podcast' && activePodcast && (
              <div className="max-w-5xl mx-auto">
                <button onClick={() => setView('home')} className="mb-10 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-3"><i className="fa-solid fa-arrow-left"></i> Back</button>
                <div className="flex flex-col md:flex-row gap-10 mb-20 items-start">
                  <img src={activePodcast.image} className="w-56 h-56 md:w-72 md:h-72 rounded-[2.5rem] shadow-2xl object-cover shrink-0" alt="" />
                  <div className="space-y-6 flex-1 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">Broadcast Verified</span>
                      <button onClick={() => generateShareData(activePodcast.feedUrl)} className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 hover:text-indigo-600 transition"><i className="fa-solid fa-share-nodes"></i></button>
                    </div>
                    <h3 className="text-5xl font-extrabold text-zinc-900 dark:text-white leading-tight tracking-tight">{activePodcast.title}</h3>
                    <p className="text-xl text-indigo-600 font-bold">{activePodcast.author}</p>
                    <p className="text-zinc-500 text-sm max-w-3xl leading-relaxed prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: activePodcast.description }}></p>
                    {!isSubscribed(activePodcast.feedUrl) && <button onClick={() => subscribePodcast(activePodcast)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-bold shadow-xl hover:bg-indigo-700 transition">SUBSCRIBE</button>}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-8 border-b border-zinc-100 dark:border-zinc-900"><h4 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Recent Waves</h4></div>
                  <div className="grid grid-cols-1 gap-4">
                    {episodes.map(episode => (
                      <EpisodeItem 
                        key={episode.id} 
                        isActive={currentEpisode?.id === episode.id} 
                        isLoading={loadingEpisodeId === episode.id}
                        episode={episode} 
                        progress={0} 
                        onPlay={() => handlePlayEpisode(episode)} 
                        onQueue={() => addToQueue(episode)} 
                        onShare={() => generateShareData(activePodcast.feedUrl, episode.id)} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!loading && view === 'new' && (
              <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">
                <div className="flex items-center justify-between">
                   <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Fresh Releases</h3>
                   <button onClick={loadNewEpisodes} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-2"><i className="fa-solid fa-arrows-rotate"></i> Refresh</button>
                </div>
                {newEpisodes.length === 0 ? (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-[2.5rem] p-16 text-center border border-zinc-200 dark:border-zinc-800 border-dashed">
                    <i className="fa-solid fa-wind text-4xl text-zinc-300 mb-6 block"></i>
                    <p className="text-zinc-500 font-medium italic">No new transmissions detected from your library.</p>
                    <button onClick={() => setView('home')} className="mt-8 text-indigo-600 font-bold text-sm">Discover New Frequencies</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {newEpisodes.map(ep => (
                      <EpisodeItem 
                        key={ep.id} 
                        isActive={currentEpisode?.id === ep.id} 
                        episode={ep} 
                        progress={0} 
                        onPlay={() => handlePlayEpisode(ep)} 
                        onQueue={() => addToQueue(ep)} 
                        onShare={() => generateShareData(podcasts.find(p => p.id === ep.podcastId)?.feedUrl || '', ep.id)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loading && view === 'archive' && (
              <div className="max-w-5xl mx-auto space-y-16 animate-fade-in">
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Incoming Waves <span className="text-indigo-500 text-lg ml-2">{queue.length}</span></h3>
                    {queue.length > 0 && <button onClick={() => { setQueue([]); storageService.saveQueue([]); }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400">Clear Queue</button>}
                  </div>
                  {queue.length === 0 ? (
                    <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-[2.5rem] p-12 text-center border border-zinc-200 dark:border-zinc-800 border-dashed">
                      <p className="text-zinc-500 font-medium italic">Your transmission queue is empty.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {queue.map(item => (
                        <EpisodeItem 
                          key={item.id} 
                          isActive={currentEpisode?.id === item.id} 
                          episode={item} 
                          progress={0} 
                          onPlay={() => { removeFromQueue(item.id); handlePlayEpisode(item); }} 
                          onRemove={() => removeFromQueue(item.id)} 
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Wave Archive</h3>
                    {Object.keys(history).length > 0 && <button onClick={() => { setHistory({}); storageService.saveHistory({}); }} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Clear History</button>}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.values(history).sort((a,b) => b.lastUpdated - a.lastUpdated).map(item => (
                      <EpisodeItem 
                        key={item.episodeId} 
                        isActive={currentEpisode?.id === item.episodeId} 
                        isLoading={loadingEpisodeId === item.episodeId} 
                        episode={{ id: item.episodeId, title: item.title || 'Wave', image: item.image, podcastTitle: item.podcastTitle, description: item.description, pubDate: item.pubDate, podcastId: item.podcastId, audioUrl: item.audioUrl, duration: item.duration ? `${Math.floor(item.duration/60)}m` : 'Archive' }} 
                        progress={(item.currentTime / (item.duration || 1)) * 100} 
                        onPlay={() => handlePlayFromHistory(item)} 
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>

      {currentEpisode && playerPodcast && (
        <Player 
          episode={currentEpisode} 
          podcast={playerPodcast} 
          queue={queue} 
          autoPlay={playerAutoplay} 
          onNext={playNext} 
          onRemoveFromQueue={removeFromQueue} 
          onClearQueue={() => { setQueue([]); storageService.saveQueue([]); }} 
          onClose={() => { setCurrentEpisode(null); setLoadingEpisodeId(null); }} 
          onShare={() => generateShareData(activePodcast?.feedUrl || '', currentEpisode.id)} 
          onProgress={syncHistory} 
          onReady={() => setLoadingEpisodeId(null)} 
        />
      )}

      {showStatusPanel && (
        <SystemStatusPanel errors={errors} onClose={() => setShowStatusPanel(false)} onClear={() => setErrors([])} />
      )}

      {shareData && <ShareModal data={shareData} onClose={() => setShareData(null)} />}
    </div>
  );
};

// Sub-component for System Diagnostics
const SystemStatusPanel: React.FC<{ errors: AppError[], onClose: () => void, onClear: () => void }> = ({ errors, onClose, onClear }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyTrace = (index: number, error: AppError) => {
    const payload = {
      message: error.message,
      technicalTrace: error.details,
      category: error.category,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950/60 backdrop-blur-xl flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-3xl animate-fade-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-microchip text-xl"></i></div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Diagnostics</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {errors.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 font-medium italic">No signal interruptions detected.</div>
          ) : errors.map((err, i) => (
            <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${err.category === 'playback' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>{err.category}</span>
                <span className="text-[9px] text-zinc-400">{new Date(err.timestamp).toLocaleTimeString()}</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">{err.message}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Technical Trace</p>
                   <button 
                    onClick={() => copyTrace(i, err)} 
                    className={`text-[9px] font-bold transition flex items-center gap-1.5 ${copiedIndex === i ? 'text-green-500' : 'text-indigo-500 hover:text-indigo-400'}`}
                   >
                     <i className={`fa-solid ${copiedIndex === i ? 'fa-check' : 'fa-copy'}`}></i>
                     {copiedIndex === i ? 'Copied to buffer!' : 'Copy for Developer'}
                   </button>
                </div>
                <div className="p-4 bg-black/5 dark:bg-black/40 rounded-xl text-[10px] font-mono text-zinc-500 dark:text-zinc-400 overflow-x-auto whitespace-pre leading-relaxed border border-zinc-200 dark:border-zinc-800/50">
                  {err.details || err.message}
                  {err.context?.diagnostics?.attempts && `\n\nAttempts:\n- ${err.context.diagnostics.attempts.join('\n- ')}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { onClear(); onClose(); }} className="mt-8 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">Clear Activity Log</button>
      </div>
    </div>
  );
};

interface ShareModalProps { data: SharedData; onClose: () => void; }
const ShareModal: React.FC<ShareModalProps> = ({ data, onClose }) => {
  const { url, length, isTooLong, payloadLength } = shareService.generateUrl(data);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-xl" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 aura-logo rounded-2xl flex items-center justify-center text-white"><i className="fa-solid fa-share-nodes text-lg"></i></div>
            <div><h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Universal Wave Broadcast</h3><p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Immutable Payload Structure</p></div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-8 pr-2">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Wave Contents</h4>
            {data.t && <div className="flex items-start gap-4"><img src={data.i} className="w-16 h-16 rounded-xl object-cover" alt="" /><div className="flex-1 min-w-0"><p className="text-sm font-extrabold text-zinc-900 dark:text-white mb-1 truncate">{data.t}</p><p className="text-[10px] text-indigo-500 font-bold">{data.st || 'Standalone Broadcast'}</p></div></div>}
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Access Frequency</h4>
            <div className="bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl py-4 px-6 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 break-all leading-relaxed max-h-40 overflow-y-auto">{url}</div>
            <button onClick={handleCopy} className={`w-full py-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-3 ${copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl'}`}>
              {copied ? <><i className="fa-solid fa-check"></i> Link Copied</> : <><i className="fa-solid fa-copy"></i> Generate Broadcast URL</>}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <span>Payload: {payloadLength} bytes</span>
            <span className={isTooLong ? 'text-orange-500' : ''}>Wave: {length} bytes</span>
          </div>
        </div>
        <div className="mt-8 bg-indigo-500/5 dark:bg-indigo-900/10 rounded-2xl p-4 flex gap-4 items-center">
          <i className="fa-solid fa-bolt-lightning text-indigo-500 text-lg"></i>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">This wave uses <b>Deflate compression</b> to embed full track metadata instantly with zero handshake required.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
