
import React, { useState } from 'react';
import { Episode } from '../types';

interface EpisodeItemProps {
  episode: Partial<Episode> & { id: string; title: string; image?: string; podcastTitle?: string; duration?: string; pubDate?: string; description?: string };
  progress: number;
  isHistory?: boolean;
  isQueue?: boolean;
  isActive?: boolean;
  onPlay: () => void;
  onQueue?: () => void;
  onRemove?: () => void;
  onShare?: () => void;
}

const EpisodeItem: React.FC<EpisodeItemProps> = ({ 
  episode, 
  progress, 
  isHistory, 
  isQueue, 
  isActive,
  onPlay, 
  onQueue, 
  onRemove, 
  onShare 
}) => {
  const [showFullDesc, setShowFullDesc] = useState(false);

  return (
    <div className={`group relative bg-zinc-50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900/60 p-4 md:p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 transition-all duration-300 shadow-sm hover:shadow-md ${isActive ? 'ring-2 ring-indigo-500 shadow-lg bg-white dark:bg-zinc-900' : ''}`}>
      <div className="flex gap-4 md:gap-8 items-start">
        {/* Thumbnail & Play Overlay */}
        <div className="relative shrink-0 w-20 h-20 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-500">
          <img 
            src={episode.image || episode.podcastImage} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" 
            alt={episode.title} 
          />
          <div className="absolute inset-0 bg-indigo-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              className="w-10 h-10 md:w-14 md:h-14 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition duration-300 hover:bg-white hover:scale-110"
              aria-label="Play Episode"
            >
              <i className="fa-solid fa-play ml-1 text-lg"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          <div className="flex items-center gap-2 mb-2">
             {episode.podcastTitle && (
               <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] truncate max-w-[150px]">{episode.podcastTitle}</span>
             )}
             {episode.pubDate && (
               <>
                 <span className="text-zinc-300 dark:text-zinc-700">•</span>
                 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{new Date(episode.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
               </>
             )}
          </div>
          
          <h4 
            onClick={onPlay}
            className="text-base md:text-xl font-bold text-zinc-900 dark:text-white truncate mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition cursor-pointer leading-tight"
          >
            {episode.title}
          </h4>

          {/* Description Reveal */}
          {episode.description && !isQueue && (
            <div className="relative mb-3">
              <div 
                className={`text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium transition-all duration-300 ${showFullDesc ? '' : 'line-clamp-2'}`}
                dangerouslySetInnerHTML={{ __html: episode.description }}
              ></div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowFullDesc(!showFullDesc); }}
                className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mt-2 flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                aria-expanded={showFullDesc}
              >
                <span>{showFullDesc ? 'Show Less' : 'Read More'}</span>
                <i className={`fa-solid fa-chevron-${showFullDesc ? 'up' : 'down'} transition-transform duration-300 ${showFullDesc ? 'rotate-0' : 'animate-bounce-subtle'}`}></i>
              </button>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-zinc-400">
            {episode.duration && (
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded-md">
                <i className="fa-regular fa-clock text-indigo-500"></i> {episode.duration}
              </span>
            )}
            
            <div className="flex items-center gap-4">
              {onQueue && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onQueue(); }} 
                  className="text-[10px] font-bold uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-2 group/action"
                >
                  <i className="fa-solid fa-plus group-hover/action:rotate-90 transition-transform"></i> Queue
                </button>
              )}

              {onShare && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onShare(); }} 
                  className="text-[10px] font-bold uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-2 group/action"
                >
                  <i className="fa-solid fa-share-nodes group-hover/action:scale-110 transition-transform"></i> Share
                </button>
              )}

              {onRemove && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(); }} 
                  className="text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition flex items-center gap-2 group/action"
                >
                  <i className="fa-solid fa-trash-can group-hover/action:shake transition-transform"></i> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar at bottom of card */}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-b-3xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 transition-all duration-700 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }
        .group:hover .group-hover\\:shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
};

export default EpisodeItem;
