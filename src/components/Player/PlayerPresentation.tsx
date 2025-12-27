import React from 'react';
import { Episode, Podcast } from '../../types';
import {
  PlayerInfo,
  PlayerControls,
  PlayerProgress,
  PlayerActions,
  PlayerQueue,
} from './index';

export interface PlayerPresentationProps {
  // Episode data
  episode: Episode;
  podcast: Podcast;
  queue: Episode[];

  // Playback state
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  speeds: number[];

  // UI state
  showQueue: boolean;

  // Event handlers
  onTogglePlay: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onNext: () => void;
  onSeek: (percent: number) => void;
  onShare: () => void;
  onToggleQueue: () => void;
  onChangeSpeed: () => void;
  onClose: () => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
}

/**
 * PlayerPresentation - Pure presentation component for the audio player
 * 
 * Renders the player UI without any business logic or state management.
 * All state and handlers are received as props.
 * 
 * @example
 * ```tsx
 * <PlayerPresentation
 *   episode={episode}
 *   podcast={podcast}
 *   isPlaying={true}
 *   onTogglePlay={() => console.log('toggle')}
 *   // ... other props
 * />
 * ```
 */
export const PlayerPresentation: React.FC<PlayerPresentationProps> = ({
  episode,
  podcast,
  queue,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  playbackRate,
  speeds,
  showQueue,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
  onNext,
  onSeek,
  onShare,
  onToggleQueue,
  onChangeSpeed,
  onClose,
  onRemoveFromQueue,
  onClearQueue,
}) => {
  return (
    <>
      <div className="shrink-0 w-full z-50">
        <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-200 dark:border-zinc-800/50 p-4 shadow-xl">
          <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center gap-4 lg:gap-8">
            <PlayerInfo
              episode={episode}
              podcast={podcast}
              isBuffering={isBuffering}
            />

            <div className="flex flex-col items-center gap-2 flex-[2] w-full">
              <PlayerControls
                isPlaying={isPlaying}
                onTogglePlay={onTogglePlay}
                onSkipBackward={onSkipBackward}
                onSkipForward={onSkipForward}
                onNext={onNext}
              />

              <PlayerProgress
                currentTime={currentTime}
                duration={duration}
                onSeek={onSeek}
              />
            </div>

            <PlayerActions
              hasQueue={queue.length > 0}
              playbackRate={playbackRate}
              speeds={speeds}
              onShare={onShare}
              onToggleQueue={onToggleQueue}
              onChangeSpeed={onChangeSpeed}
              onClose={onClose}
            />
          </div>
        </div>
      </div>

      <PlayerQueue
        isOpen={showQueue}
        queue={queue}
        onClose={() => onToggleQueue()}
        onRemove={onRemoveFromQueue}
        onClear={onClearQueue}
      />
    </>
  );
};
