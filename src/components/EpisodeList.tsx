import React from 'react';
import { Episode, PlaybackState } from '../types';
import EpisodeItem from './EpisodeItem';

interface EpisodeListProps {
  episodes: Episode[];
  history: Record<string, PlaybackState>;
  onPlay: (episode: Episode) => void;
  onAddToQueue?: (episode: Episode) => void;
  onShare?: (episode: Episode) => void;
  loadingEpisodeId?: string | null;
  showPodcastInfo?: boolean;
  emptyMessage?: string;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  history,
  onPlay,
  onAddToQueue,
  onShare,
  loadingEpisodeId,
  showPodcastInfo = false,
  emptyMessage = 'No episodes found'
}) => {
  if (episodes.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400 font-medium italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {episodes.map(episode => {
        const playbackState = history[episode.id];
        const progress = playbackState 
          ? (playbackState.currentTime / playbackState.duration) * 100 
          : 0;

        return (
          <EpisodeItem
            key={episode.id}
            episode={episode}
            progress={progress}
            isLoading={loadingEpisodeId === episode.id}
            onPlay={() => onPlay(episode)}
            onQueue={onAddToQueue ? () => onAddToQueue(episode) : undefined}
            onShare={onShare ? () => onShare(episode) : undefined}
          />
        );
      })}
    </div>
  );
};
