import React, { useState, useEffect, useMemo } from "react";
import { 
  SharedData, 
  shareService, 
  ShareType, 
  ShareMode, 
  FilterOptions 
} from "../../services/shareService";
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
    return 'frequency';
  });

  // RSS manifest options
  const [episodeCount, setEpisodeCount] = useState(10);
  const [filters, setFilters] = useState<FilterOptions>({
    includeDescriptions: true,
    includeImages: true,
    includeDatesAndDurations: true,
  });
  const [isLoadingRss, setIsLoadingRss] = useState(false);
  const [rssEpisodes, setRssEpisodes] = useState<any[]>([]);

  const [copied, setCopied] = useState(false);

  // Load optimal filters when switching to full-manifest mode
  useEffect(() => {
    if (shareMode === 'full-manifest' && podcast?.feedUrl) {
      setIsLoadingRss(true);
      shareService
        .calculateOptimalFilters(
          podcast.feedUrl,
          episodeCount,
          podcast.title,
          podcast.image,
          podcast.description
        )
        .then((result) => {
          setFilters(result.filters);
          setRssEpisodes(result.episodes);
          setIsLoadingRss(false);
        })
        .catch((err) => {
          console.error('Failed to load RSS manifest:', err);
          setIsLoadingRss(false);
        });
    }
  }, [shareMode, episodeCount, podcast]);

  // Generate current share data
  const currentShareData = useMemo((): SharedData => {
    if (shareType === 'track') {
      if (shareMode === 'wave-source' && podcast && episode) {
        return {
          shareType: 'track',
          shareMode: 'wave-source',
          p: podcast.feedUrl,
          e: episode.id,
        };
      } else if (shareMode === 'embedded-payload' && episode) {
        return {
          shareType: 'track',
          shareMode: 'embedded-payload',
          t: episode.title,
          u: episode.audioUrl,
          i: episode.image || podcast?.image,
          d: shareService.sanitizeDescription(episode.description),
          st: podcast?.title || episode.podcastTitle,
          si: podcast?.image || episode.podcastImage,
        };
      }
    } else if (shareType === 'rss' && podcast) {
      if (shareMode === 'frequency') {
        return {
          shareType: 'rss',
          shareMode: 'frequency',
          p: podcast.feedUrl,
        };
      } else if (shareMode === 'full-manifest') {
        const filteredEpisodes = shareService.applyFilters(rssEpisodes, filters);
        return {
          shareType: 'rss',
          shareMode: 'full-manifest',
          p: podcast.feedUrl,
          pt: podcast.title,
          pi: podcast.image,
          pd: shareService.sanitizeDescription(podcast.description),
          episodes: filteredEpisodes,
        };
      }
    }
    return {};
  }, [shareType, shareMode, podcast, episode, rssEpisodes, filters]);

  // Generate URL
  const { url, length, isTooLong, payloadLength, warning } = useMemo(() => {
    return shareService.generateUrl(currentShareData);
  }, [currentShareData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFilterChange = (key: keyof FilterOptions) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
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
        {/* Header with close button - more compact */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 aura-logo rounded-xl flex items-center justify-center text-white">
              <i className="fa-solid fa-share-nodes text-sm"></i>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {shareType === 'track' ? 'Wave' : 'Frequency'} <span className="text-indigo-500">Broadcast</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Episode preview with mode badge */}
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              {displayImage && (
                <img
                  src={displayImage}
                  className="w-12 h-12 rounded-lg object-cover"
                  alt=""
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {displayTitle}
                  </p>
                  {/* Mode badge */}
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${
                    shareMode === 'wave-source' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                    shareMode === 'embedded-payload' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                    shareMode === 'frequency' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                    'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  }`}>
                    {shareMode === 'wave-source' ? '📡 RSS' :
                     shareMode === 'embedded-payload' ? '📦 Embed' :
                     shareMode === 'frequency' ? '📻 Freq' :
                     '📋 Full'}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-500 font-semibold">
                  {displaySubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Transmission mode buttons - separate and compact */}
          {shareType === 'track' ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShareMode('wave-source')}
                disabled={!podcast?.feedUrl}
                className={`flex-1 p-2.5 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'wave-source'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                } ${!podcast?.feedUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fa-solid fa-rss text-xs"></i>
                <span className="text-[11px] font-semibold">RSS Source</span>
              </button>
              
              <button
                onClick={() => setShareMode('embedded-payload')}
                className={`flex-1 p-2.5 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'embedded-payload'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-purple-300'
                }`}
              >
                <i className="fa-solid fa-cube text-xs"></i>
                <span className="text-[11px] font-semibold">Embedded</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShareMode('frequency')}
                className={`flex-1 p-2.5 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'frequency'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                }`}
              >
                <i className="fa-solid fa-signal text-xs"></i>
                <span className="text-[11px] font-semibold">Frequency</span>
              </button>
              
              <button
                onClick={() => setShareMode('full-manifest')}
                className={`flex-1 p-2.5 rounded-xl border transition flex items-center justify-center gap-2 ${
                  shareMode === 'full-manifest'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-purple-300'
                }`}
              >
                <i className="fa-solid fa-list-check text-xs"></i>
                <span className="text-[11px] font-semibold">Full Manifest</span>
              </button>
            </div>
          )}

          {/* RSS Manifest Options */}
          {shareType === 'rss' && shareMode === 'full-manifest' && (
            <div className="space-y-2.5 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
              {/* Episode Count & Loading in one row */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Episodes
                    </label>
                    <span className="text-xs font-mono text-indigo-500 font-bold">
                      {episodeCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={episodeCount}
                    onChange={(e) => setEpisodeCount(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                {isLoadingRss && (
                  <i className="fa-solid fa-spinner fa-spin text-indigo-500 text-sm"></i>
                )}
              </div>

              {/* Field Toggles - Horizontal with icons */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mr-1">Include:</span>
                <label 
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
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
                  <i className="fa-solid fa-align-left text-[10px]"></i>
                  <span className="text-[10px] font-medium">Desc</span>
                </label>
                
                <label 
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
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
                  <i className="fa-solid fa-image text-[10px]"></i>
                  <span className="text-[10px] font-medium">Img</span>
                </label>
                
                <label 
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
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
                  <i className="fa-solid fa-clock text-[10px]"></i>
                  <span className="text-[10px] font-medium">Time</span>
                </label>
              </div>
            </div>
          )}

          {/* URL Preview */}
          <div className="space-y-2">
            <div className="bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 break-all leading-relaxed max-h-32 overflow-y-auto">
              {url}
            </div>
            
            {/* Unified size display with warning */}
            <div className="flex items-center justify-between text-[10px] px-1">
              <span className="text-zinc-500 dark:text-zinc-400">
                {length.toLocaleString()} bytes
                {payloadLength > 0 && payloadLength !== length && (
                  <span className="text-zinc-400 dark:text-zinc-500"> ({payloadLength.toLocaleString()} compressed)</span>
                )}
              </span>
              {warning && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                  <i className="fa-solid fa-triangle-exclamation text-[9px]"></i>
                  <span className="text-[9px]">{warning.split('.')[0]}</span>
                </span>
              )}
              {isTooLong && !warning && (
                <span className="text-orange-500 text-[9px]">URL may be too long</span>
              )}
            </div>
            
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                copied
                  ? "bg-green-500 text-white"
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
