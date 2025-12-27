import React from "react";
import { Episode, Podcast } from "../../types";

interface PlayerInfoProps {
  episode: Episode;
  podcast: Podcast;
  isBuffering: boolean;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
  episode,
  podcast,
  isBuffering,
}) => {
  return (
    <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
      <div className="relative shrink-0">
        <img
          src={episode.image || podcast.image}
          alt=""
          className="w-14 h-14 rounded-xl shadow-lg object-cover border border-zinc-100 dark:border-zinc-700/50"
        />
        {isBuffering && (
          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100 leading-tight mb-0.5">
          {episode.title}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-medium">
          {podcast.title}
        </p>
      </div>
    </div>
  );
};
