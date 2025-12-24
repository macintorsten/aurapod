import React from 'react';
import { formatTime } from '../../utils';

interface PlayerProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (percentage: number) => void;
}

export const PlayerProgress: React.FC<PlayerProgressProps> = ({
  currentTime,
  duration,
  onSeek,
}) => {
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    onSeek(percent);
  };

  return (
    <div className="w-full">
      <div
        onClick={handleProgressClick}
        className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full cursor-pointer hover:h-2 transition-all group relative"
      >
        <div
          className="h-full bg-indigo-600 rounded-full relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"></div>
        </div>
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-zinc-500 font-mono">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
