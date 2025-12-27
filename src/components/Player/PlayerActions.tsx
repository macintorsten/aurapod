import React from "react";
import { Episode } from "../../types";

interface PlayerActionsProps {
  hasQueue: boolean;
  playbackRate: number;
  speeds: number[];
  onShare: () => void;
  onToggleQueue: () => void;
  onChangeSpeed: () => void;
  onClose: () => void;
}

export const PlayerActions: React.FC<PlayerActionsProps> = ({
  hasQueue,
  playbackRate,
  speeds,
  onShare,
  onToggleQueue,
  onChangeSpeed,
  onClose,
}) => {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <button
        onClick={onShare}
        className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center"
        title="Share"
      >
        <i className="fa-solid fa-share-nodes text-xs"></i>
      </button>

      {hasQueue && (
        <button
          onClick={onToggleQueue}
          className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center"
          title="Queue"
        >
          <i className="fa-solid fa-list text-xs"></i>
        </button>
      )}

      <button
        onClick={onChangeSpeed}
        className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center text-[10px] font-black"
        title="Playback speed"
      >
        {playbackRate}x
      </button>

      <button
        onClick={onClose}
        className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center"
        title="Close player"
      >
        <i className="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>
  );
};
