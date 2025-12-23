
import React, { useState } from 'react';
import { Episode } from '../types';

interface EpisodeItemProps {
  episode: Partial<Episode> & { id: string; title: string; image?: string; podcastTitle?: string; duration?: string; pubDate?: string; description?: string };
  progress: number;
  isHistory?: boolean;
  isQueue?: boolean;
  isActive?: boolean;
  isLoading?: boolean;
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
  isLoading,
  onPlay, 
  onQueue, 
  onRemove, 
  onShare 
}) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const isCompleted = progress >= 95;

  return (
    <div className={`group relative bg-zinc-50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900/60 p-4 md:p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800/50 transition-all duration-300 shadow-sm hover:shadow-md ${isActive ? 'ring-2 ring-indigo-500 shadow-lg bg-white dark:bg-zinc-900' : ''}`}>
      <div className={`flex gap-4 md:gap-8 items-start ${progress > 0 ? 'pb-4' : ''}`}>
        <div className="relative shrink-0 w-20 h-20 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-500">
          <img 
            src={episode.image || episode.podcastImage} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" 
            alt={episode.title} 
          />
          <div className={`absolute inset-0 bg-indigo-600/30 flex items-center justify-center transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              disabled={isLoading}
              className={`w-10 h-10 md:w-14 md:h-14 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-full flex items-center justify-center shadow-2xl transform transition duration-300 ${isLoading ? 'scale-100' : 'scale-75 group-hover:scale-100 hover:scale-110'}`}
              aria-label="Play Episode"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
              ) : (
                <i className="fa-solid fa-play ml-1 text-lg"></i>
              )}
            </button>
          </div>
          {isCompleted && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-900 z-10 animate-fade-in">
              <i className="fa-solid fa-check text-[10px]"></i>
            </div>
          )}
        </div>

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
          <h4 onClick={onPlay} className={`text-base md:text-xl font-bold truncate mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition cursor-pointer leading-tight ${isCompleted ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>{episode.title}</h4>
          {episode.description && !isQueue && (
            <div className="relative mb-3">
              <div className={`text-xs md:text-sm leading-relaxed font-medium transition-all duration-300 ${showFullDesc ? '' : 'line-clamp-2'} text-zinc-500 dark:text-zinc-400`} dangerouslySetInnerHTML={{ __html: episode.description }}></div>
              <button onClick={(e) => { e.stopPropagation(); setShowFullDesc(!showFullDesc); }} className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 transition-colors mt-2 flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                <span>{showFullDesc ? 'Show Less' : 'Read More'}</span><i className={`fa-solid fa-chevron-${showFullDesc ? 'up' : 'down'}`}></i>
              </button>
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-zinc-400">
            {episode.duration && <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 px-2 py-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-md"><i className="fa-regular fa-clock text-indigo-500"></i> {episode.duration}</span>}
            <div className="flex items-center gap-4">
              {onQueue && <button onClick={(e) => { e.stopPropagation(); onQueue(); }} className="text-[10px] font-bold uppercase tracking-widest hover:text-indigo-600 transition flex items-center gap-2 group/action"><i className="fa-solid fa-plus group-hover/action:rotate-90 transition-transform"></i> Queue</button>}
              {onShare && <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="text-[10px] font-bold uppercase tracking-widest hover:text-indigo-600 transition flex items-center gap-2 group/action"><i className="fa-solid fa-share-nodes"></i> Share</button>}
              {onRemove && <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition flex items-center gap-2 group/action"><i className="fa-solid fa-trash-can"></i> Remove</button>}
            </div>
          </div>
        </div>
      </div>
      {progress > 0 && <div className="absolute bottom-3 left-6 right-6 h-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full overflow-hidden"><div className={`h-full transition-all duration-700 ease-in-out rounded-full ${isCompleted ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${progress}%` }}></div></div>}
    </div>
  );
};

export default EpisodeItem;
