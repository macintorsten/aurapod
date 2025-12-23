
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
    <div className={`group relative bg-zinc-50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900/60 p-4 md:p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 transition-all duration-300 shadow-sm ${isActive ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="flex gap-4 md:gap-8 items-start">
        {/* Thumbnail & Play Overlay */}
        <div className="relative shrink-0 w-20 h-20 md:w-32 md:h-32">
          <img src={episode.image || episode.podcastImage} className="w-full h-full object-cover rounded-2xl shadow-md" alt="" />
          <div className="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
            <button 
              onClick={onPlay}
              className="w-10 h-10 md:w-12 md:h-12 bg-white text-zinc-950 rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition duration-300"
            >
              <i className="fa-solid fa-play ml-1"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          <div className="flex items-center gap-2 mb-2">
             {episode.podcastTitle && (
               <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate max-w-[150px]">{episode.podcastTitle}</span>
             )}
             {episode.pubDate && (
               <>
                 <span className="text-zinc-300 dark:text-zinc-700">•</span>
                 <span className="text-[10px] text-zinc-500 font-medium">{new Date(episode.pubDate).toLocaleDateString()}</span>
               </>
             )}
          </div>
          
          <h4 
            onClick={onPlay}
            className="text-base md:text-xl font-bold text-zinc-900 dark:text-white truncate mb-2 group-hover:text-indigo-600 transition cursor-pointer leading-tight"
          >
            {episode.title}
          </h4>

          {/* Description Reveal */}
          {episode.description && !isQueue && (
            <div className="relative">
              <p 
                className={`text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium ${showFullDesc ? '' : 'line-clamp-2'}`}
                dangerouslySetInnerHTML={{ __html: episode.description }}
              ></p>
              <button 
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition mt-2 flex items-center gap-1.5"
              >
                {showFullDesc ? 'Show Less' : 'Read More'}
                <i className={`fa-solid fa-chevron-${showFullDesc ? 'up' : 'down'}`}></i>
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center gap-6 text-zinc-400">
            {episode.duration && (
              <span className="text-[10px] font-bold uppercase tracking-tight flex items-center gap-2">
                <i className="fa-regular fa-clock"></i> {episode.duration}
              </span>
            )}
            
            {onQueue && (
              <button onClick={onQueue} className="text-[10px] font-bold uppercase tracking-tight hover:text-indigo-600 transition flex items-center gap-2">
                <i className="fa-solid fa-plus"></i> Queue
              </button>
            )}

            {onShare && (
              <button onClick={onShare} className="text-[10px] font-bold uppercase tracking-tight hover:text-indigo-600 transition flex items-center gap-2">
                <i className="fa-solid fa-share-nodes"></i> Share
              </button>
            )}

            {onRemove && (
              <button onClick={onRemove} className="text-[10px] font-bold uppercase tracking-tight hover:text-red-500 transition flex items-center gap-2 ml-auto">
                <i className="fa-solid fa-trash-can"></i> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar at bottom of card */}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-b-3xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default EpisodeItem;
