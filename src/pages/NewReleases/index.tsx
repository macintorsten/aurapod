import React from "react";
import { Episode, Podcast } from "../../types";
import EpisodeItem from "../../components/EpisodeItem";
import { EmptyState } from "../../components/EmptyState";

interface NewReleasesPageProps {
  newEpisodes: (Episode & { podcastTitle: string; podcastImage: string })[];
  currentEpisode: Episode | null;
  podcasts: Podcast[];
  onPlayEpisode: (episode: Episode) => void;
  onAddToQueue: (episode: Episode) => void;
  onShare: (podcastUrl: string, episodeId: string) => void;
  onRefresh: () => void;
  onGoHome: () => void;
}

export const NewReleasesPage: React.FC<NewReleasesPageProps> = ({
  newEpisodes,
  currentEpisode,
  podcasts,
  onPlayEpisode,
  onAddToQueue,
  onShare,
  onRefresh,
  onGoHome,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Fresh Releases
        </h3>
        <button
          onClick={onRefresh}
          className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-2"
        >
          <i className="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
      </div>

      {newEpisodes.length === 0 ? (
        <EmptyState
          icon="fa-wind"
          title="No new transmissions"
          description="No new transmissions detected from your library."
          action={
            <button
              onClick={onGoHome}
              className="mt-8 text-indigo-600 font-bold text-sm"
            >
              Discover New Frequencies
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {newEpisodes.map((ep) => (
            <EpisodeItem
              key={ep.id}
              isActive={currentEpisode?.id === ep.id}
              episode={ep}
              progress={0}
              onPlay={() => onPlayEpisode(ep)}
              onQueue={() => onAddToQueue(ep)}
              onShare={() => {
                const podcast = podcasts.find((p) => p.id === ep.podcastId);
                if (podcast) {
                  onShare(podcast.feedUrl, ep.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
