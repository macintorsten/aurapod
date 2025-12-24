import React from 'react';

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onNext: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
  onNext,
}) => {
  return (
    <div className="flex items-center gap-2 justify-center">
      <button
        onClick={onSkipBackward}
        className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center"
        title="Skip back 10s"
      >
        <i className="fa-solid fa-rotate-left text-xs"></i>
      </button>

      <button
        onClick={onTogglePlay}
        className="w-12 h-12 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center shadow-lg"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm ${!isPlaying ? 'ml-0.5' : ''}`}></i>
      </button>

      <button
        onClick={onSkipForward}
        className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center"
        title="Skip forward 10s"
      >
        <i className="fa-solid fa-rotate-right text-xs"></i>
      </button>

      <button
        onClick={onNext}
        className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center"
        title="Next episode"
      >
        <i className="fa-solid fa-forward text-xs"></i>
      </button>
    </div>
  );
};
