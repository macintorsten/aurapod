import React, { useState, useEffect, useMemo } from "react";
import { 
  Feed,
  Track,
  ShareData,
  shareService, 
  ShareType, 
  ShareMode, 
  FilterOptions
} from "../../services/shareService";
import { rssService } from "../../services/rssService";
import { Podcast, Episode } from "../../types";

interface ShareModalProps {
  shareType: ShareType;
  podcast?: Podcast | null;
  episode?: Episode | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
  shareType, 
  podcast, 
  episode, 
  onClose 
}) => {
  // Share mode state
  const [shareMode, setShareMode] = useState<ShareMode>(() => {
    if (shareType === 'track') {
      return podcast?.feedUrl ? 'wave-source' : 'embedded-payload';
    }
    return 'rss-source';
  });

  // RSS manifest options
  const [episodeCount, setEpisodeCount] = useState(10);
  const [maxEpisodes, setMaxEpisodes] = useState(50);
  const [compressionMode, setCompressionMode] = useState<'full' | 'auto' | 'minimal'>('auto');
  const [filters, setFilters] = useState<FilterOptions>({
    includeDescriptions: true,
    includeImages: true,
    includeDatesAndDurations: true,
    compressionMode: 'auto',
  });
  const [isLoadingRss, setIsLoadingRss] = useState(false);
  const [rssTracks, setRssTracks] = useState<Track[]>([]);
  const [rssError, setRssError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  // Load tracks and calculate max episodes when switching to embedded-payload mode FOR FREQUENCY TYPE
  useEffect(() => {
    if (shareType === 'frequency' && shareMode === 'embedded-payload' && podcast?.feedUrl) {
      const abortController = new AbortController();
      setIsLoadingRss(true);
      setRssError(null);
      
      // Calculate max episodes that fit
      shareService
        .calculateMaxEpisodes(
          podcast.feedUrl,
          filters,
          podcast.title,
          podcast.image,
          podcast.description
        )
        .then(async (result: { maxEpisodes: number; totalEpisodes: number }) => {
          if (abortController.signal.aborted) return;
          
          setMaxEpisodes(result.maxEpisodes);
          // Set episode count to max or current, whichever is smaller
          const newCount = Math.min(episodeCount, result.maxEpisodes);
          if (newCount !== episodeCount) {
            setEpisodeCount(newCount);
          }
          
          // Load actual tracks from RSS
          const { podcast: podcastData, episodes } = await rssService.fetchPodcast(podcast.feedUrl);
          if (abortController.signal.aborted) return;
          
          const tracks: Track[] = episodes.slice(0, newCount).map(ep => ({
            title: ep.title || null,
            url: ep.audioUrl || null,
            description: shareService.sanitizeDescription(ep.description) || null,
            date: ep.pubDate ? Math.floor(new Date(ep.pubDate).getTime() / 1000) : null,
            duration: ep.duration ? shareService.parseDuration(ep.duration) : null,
          }));
          
          setRssTracks(tracks);
          setIsLoadingRss(false);
        })
        .catch((err: Error) => {
          if (abortController.signal.aborted) return;
          console.error('Failed to load RSS manifest:', err);
          setRssError('Failed to load podcast feed. Please try again.');
          setIsLoadingRss(false);
        });
      
      return () => {
        abortController.abort();
      };
    }
  }, [shareMode, podcast, shareType]);

  // Reload tracks when episode count changes (ONLY FOR FREQUENCY TYPE) - with debouncing
  useEffect(() => {
    if (shareType === 'frequency' && shareMode === 'embedded-payload' && podcast?.feedUrl && !isLoadingRss && rssTracks.length > 0) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        rssService.fetchPodcast(podcast.feedUrl)
          .then(({ episodes }) => {
            if (abortController.signal.aborted) return;
            
            const tracks: Track[] = episodes.slice(0, episodeCount).map(ep => ({
              title: ep.title || null,
              url: ep.audioUrl || null,
              description: shareService.sanitizeDescription(ep.description) || null,
              date: ep.pubDate ? Math.floor(new Date(ep.pubDate).getTime() / 1000) : null,
              duration: ep.duration ? shareService.parseDuration(ep.duration) : null,
            }));
            setRssTracks(tracks);
          })
          .catch((err) => {
            if (abortController.signal.aborted) return;
            console.error('Failed to reload tracks:', err);
            setRssError('Failed to update episode count.');
          });
      }, 300);
      
      return () => {
        clearTimeout(timeoutId);
        abortController.abort();
      };
    }
  }, [episodeCount]);

  // Generate current share data
  const currentShareData = useMemo((): ShareData | null => {
    if (shareType === 'track') {
      if (shareMode === 'wave-source' && podcast && episode) {
        return {
          feed: {
            title: podcast.title || null,
            description: podcast.description || null,
            url: podcast.feedUrl || null,
            tracks: [],
          },
          shareType: 'track',
          shareMode: 'wave-source',
          episodeId: episode.id,
        };
      } else if (shareMode === 'embedded-payload' && episode) {
        return {
          feed: {
            title: podcast?.title || episode.podcastTitle || null,
            description: null,
            url: null,
            tracks: [{
              title: episode.title || null,
              url: episode.audioUrl || null,
              description: shareService.sanitizeDescription(episode.description) || null,
              date: null,
              duration: null,
            }],
          },
          shareType: 'track',
          shareMode: 'embedded-payload',
        };
      }
    } else if (shareType === 'frequency' && podcast) {
      if (shareMode === 'rss-source') {
        return {
          feed: {
            title: podcast.title || null,
            description: podcast.description || null,
            url: podcast.feedUrl || null,
            tracks: [],
          },
          shareType: 'frequency',
          shareMode: 'rss-source',
        };
      } else if (shareMode === 'embedded-payload') {
        // Return loading state instead of null when tracks are still loading
        if (isLoadingRss || rssTracks.length === 0) {
          // Return minimal valid share data during loading
          return {
            feed: {
              title: podcast.title || null,
              description: podcast.description ? shareService.sanitizeDescription(podcast.description) : null,
              url: podcast.feedUrl || null,
              tracks: [],
            },
            shareType: 'frequency',
            shareMode: 'embedded-payload',
          };
        }
        const filteredTracks = shareService.applyFilters(rssTracks, filters);
        return {
          feed: {
            title: podcast.title || null,
            description: podcast.description ? shareService.sanitizeDescription(podcast.description) : null,
            url: podcast.feedUrl || null,
            tracks: filteredTracks,
          },
          shareType: 'frequency',
          shareMode: 'embedded-payload',
        };
      }
    }
    return null;
  }, [shareType, shareMode, podcast, episode, rssTracks, filters]);

  // Generate URL
  const { url, length, isTooLong, payloadLength, warning } = useMemo(() => {
    if (!currentShareData) {
      return { url: '', length: 0, isTooLong: false, payloadLength: 0 };
    }
    return shareService.generateUrl(currentShareData, {
      compressionMode,
      removeImages: !filters.includeImages,
    });
  }, [currentShareData, filters, compressionMode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFilterChange = (key: keyof FilterOptions) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCompressionModeChange = (mode: 'full' | 'auto' | 'minimal') => {
    setCompressionMode(mode);
    setFilters(prev => ({ ...prev, compressionMode: mode }));
  };

  const displayTitle = episode?.title || podcast?.title || 'Wave';
  const displayImage = episode?.image || podcast?.image || '';
  const displaySubtitle = shareType === 'track' 
    ? (podcast?.title || episode?.podcastTitle || 'Standalone Broadcast')
    : `${podcast?.author || 'Podcast'} • RSS Feed`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 aura-logo rounded-xl flex items-center justify-center text-white">
              <i className="fa-solid fa-share-nodes text-lg"></i>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {shareType === 'track' ? 'Wave' : 'Frequency'} <span className="text-indigo-500">Broadcast</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Episode preview with mode badge */}
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              {displayImage && (
                <img
                  src={displayImage}
                  className="w-16 h-16 rounded-lg object-cover"
                  alt=""
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-base font-bold text-zinc-900 dark:text-white truncate">
                    {displayTitle}
                  </p>
                  {/* Mode badge */}
                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                    shareMode === 'wave-source' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                    shareMode === 'embedded-payload' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                    shareMode === 'rss-source' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                    'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  }`}>
                    {shareMode === 'wave-source' ? '📡 RSS' :
                     shareMode === 'embedded-payload' ? '📦 Embed' :
                     shareMode === 'rss-source' ? '📻 Freq' :
                     '📋 Full'}
                  </span>
                </div>
                <p className="text-xs text-indigo-500 font-semibold">
                  {displaySubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Transmission mode buttons */}
          {shareType === 'track' ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShareMode('wave-source')}
                disabled={!podcast?.feedUrl}
                className={`flex-1 p-4 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'wave-source'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                } ${!podcast?.feedUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fa-solid fa-rss text-sm"></i>
                <span className="text-sm font-semibold">RSS Source</span>
              </button>
              
              <button
                onClick={() => setShareMode('embedded-payload')}
                className={`flex-1 p-4 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'embedded-payload'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-purple-300'
                }`}
              >
                <i className="fa-solid fa-cube text-sm"></i>
                <span className="text-sm font-semibold">Embedded</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShareMode('rss-source')}
                className={`flex-1 p-4 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'rss-source'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                }`}
              >
                <i className="fa-solid fa-signal text-sm"></i>
                <span className="text-sm font-semibold">Frequency Only</span>
              </button>
              
              <button
                onClick={() => setShareMode('embedded-payload')}
                className={`flex-1 p-4 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'embedded-payload'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-purple-300'
                }`}
              >
                <i className="fa-solid fa-list-check text-sm"></i>
                <span className="text-sm font-semibold">Full Manifest</span>
              </button>
            </div>
          )}

          {/* Error message */}
          {rssError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation text-red-500 mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">{rssError}</p>
                <button
                  onClick={() => {
                    setRssError(null);
                    // Trigger reload by toggling loading state
                    if (shareType === 'frequency' && shareMode === 'embedded-payload' && podcast?.feedUrl) {
                      setShareMode('rss-source');
                      setTimeout(() => setShareMode('embedded-payload'), 0);
                    }
                  }}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* RSS Manifest Options */}
          {shareType === 'frequency' && shareMode === 'embedded-payload' && (
            <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-6 border border-zinc-100 dark:border-zinc-800">
              {/* Episode Count & Loading in one row */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      Episodes
                    </label>
                    <span className="text-sm font-mono text-indigo-500 font-bold">
                      {episodeCount} / {maxEpisodes}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={maxEpisodes}
                    value={episodeCount}
                    onChange={(e) => setEpisodeCount(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                {isLoadingRss && (
                  <i className="fa-solid fa-spinner fa-spin text-indigo-500"></i>
                )}
              </div>

              {/* Field Toggles - Horizontal with icons */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mr-1">Include:</span>
                  <label 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                      filters.includeDescriptions 
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                    title="Episode descriptions"
                  >
                    <input
                      type="checkbox"
                      checked={filters.includeDescriptions}
                      onChange={() => handleFilterChange('includeDescriptions')}
                      className="hidden"
                    />
                    <i className="fa-solid fa-align-left text-xs"></i>
                    <span className="text-xs font-medium">Desc</span>
                  </label>
                  
                  <label 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                      filters.includeImages 
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                    title="Episode images"
                  >
                    <input
                      type="checkbox"
                      checked={filters.includeImages}
                      onChange={() => handleFilterChange('includeImages')}
                      className="hidden"
                    />
                    <i className="fa-solid fa-image text-xs"></i>
                    <span className="text-xs font-medium">Img</span>
                  </label>
                  
                  <label 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                      filters.includeDatesAndDurations 
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                    title="Publication dates and durations"
                  >
                    <input
                      type="checkbox"
                      checked={filters.includeDatesAndDurations}
                      onChange={() => handleFilterChange('includeDatesAndDurations')}
                      className="hidden"
                    />
                    <i className="fa-solid fa-clock text-xs"></i>
                    <span className="text-xs font-medium">Time</span>
                  </label>
                </div>
                
                {/* Compression mode options */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Compression:</span>
                  <button
                    onClick={() => handleCompressionModeChange('full')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      compressionMode === 'full' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title="Full size, best quality"
                  >
                    Full
                  </button>
                  <button
                    onClick={() => handleCompressionModeChange('auto')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      compressionMode === 'auto' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title="Adaptive compression for most platforms"
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => handleCompressionModeChange('minimal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      compressionMode === 'minimal' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title="Minimal size for short URLs"
                  >
                    Minimal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* URL Preview */}
          <div className="space-y-3">
            <div className="bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-xl py-4 px-5 text-xs font-mono text-zinc-500 dark:text-zinc-400 break-all leading-relaxed max-h-32 overflow-y-auto">
              {url}
            </div>
            
            {/* Unified size display with warning */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-zinc-500 dark:text-zinc-400">
                {length.toLocaleString()} bytes
                {payloadLength > 0 && payloadLength !== length && (
                  <span className="text-zinc-400 dark:text-zinc-500"> ({payloadLength.toLocaleString()} compressed)</span>
                )}
              </span>
              {warning && (
                <span className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                  <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                  <span className="text-xs">{warning.split('.')[0]}</span>
                </span>
              )}
              {isTooLong && !warning && (
                <span className="text-orange-500 text-xs">URL may be too long</span>
              )}
            </div>
            
            <button
              onClick={handleCopy}
              disabled={isLoadingRss || !url}
              className={`w-full py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                copied
                  ? "bg-green-500 text-white"
                  : isLoadingRss || !url
                  ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
              }`}
            >
              {copied ? (
                <>
                  <i className="fa-solid fa-check"></i> Copied
                </>
              ) : (
                <>
                  <i className="fa-solid fa-copy"></i> Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
