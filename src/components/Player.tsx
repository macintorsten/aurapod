import React from "react";
import { Episode, Podcast } from "../types";
import { PlayerContainer } from "./Player/PlayerContainer";

interface PlayerProps {
  episode: Episode;
  podcast: Podcast;
  queue: Episode[];
  onNext: () => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
  onClose: () => void;
  onShare: () => void;
  onProgress?: (episodeId: string, currentTime: number, duration: number) => void;
  onReady?: () => void;
  autoPlay?: boolean;
}

/**
 * Player component - now a thin wrapper around PlayerContainer
 * for backward compatibility with existing usage.
 * 
 * @deprecated Consider using PlayerContainer directly for new code.
 */
const Player: React.FC<PlayerProps> = ({
  episode,
  podcast,
  queue,
  onNext,
  onRemoveFromQueue,
  onClearQueue,
  onClose,
  onShare,
  onProgress,
  onReady,
  autoPlay = true,
}) => {
  return (
    <PlayerContainer
      episode={episode}
      podcast={podcast}
      queue={queue}
      onNext={onNext}
      onRemoveFromQueue={onRemoveFromQueue}
      onClearQueue={onClearQueue}
      onClose={onClose}
      onShare={onShare}
      onProgress={onProgress}
      onReady={onReady}
      autoPlay={autoPlay}
    />
  );
};

export default Player;
