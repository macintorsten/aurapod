import React from "react";
import { Episode, PlaybackState } from "../../types";
import EpisodeItem from "../../components/EpisodeItem";
import { EmptyState } from "../../components/EmptyState";

interface ArchivePageProps {
  queue: Episode[];
  history: Record<string, PlaybackState>;
  currentEpisode: Episode | null;
  loadingEpisodeId: string | null;
  onPlayEpisode: (episode: Episode) => void;
  onPlayFromHistory: (item: PlaybackState) => void;
  onRemoveFromQueue: (episodeId: string) => void;
  onClearQueue: () => void;
  onClearHistory: () => void;
}

export const ArchivePage: React.FC<ArchivePageProps> = ({
  queue,
  history,
  currentEpisode,
  loadingEpisodeId,
  onPlayEpisode,
  onPlayFromHistory,
  onRemoveFromQueue,
  onClearQueue,
  onClearHistory,
}) => {
  const sortedHistory = Object.values(history).sort(
    (a, b) => b.lastUpdated - a.lastUpdated
  );

  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-fade-in">
      {/* Queue Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Incoming Waves{" "}
            <span className="text-indigo-500 text-lg ml-2">{queue.length}</span>
          </h3>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
            >
              Clear Queue
            </button>
          )}
        </div>
        {queue.length === 0 ? (
          <EmptyState
            icon="fa-list-ul"
            title="Queue is empty"
            description="Your transmission queue is empty."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {queue.map((item) => (
              <EpisodeItem
                key={item.id}
                isActive={currentEpisode?.id === item.id}
                episode={item}
                progress={0}
                onPlay={() => {
                  onRemoveFromQueue(item.id);
                  onPlayEpisode(item);
                }}
                onRemove={() => onRemoveFromQueue(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* History Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Wave Archive
          </h3>
          {sortedHistory.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Clear History
            </button>
          )}
        </div>
        {sortedHistory.length === 0 ? (
          <EmptyState
            icon="fa-clock-rotate-left"
            title="No history yet"
            description="Your listening history will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sortedHistory.map((item) => (
              <EpisodeItem
                key={item.episodeId}
                isActive={currentEpisode?.id === item.episodeId}
                isLoading={loadingEpisodeId === item.episodeId}
                episode={{
                  id: item.episodeId,
                  title: item.title || "Wave",
                  image: item.image,
                  podcastTitle: item.podcastTitle,
                  description: item.description,
                  pubDate: item.pubDate,
                  podcastId: item.podcastId,
                  audioUrl: item.audioUrl || "",
                  duration: item.duration
                    ? `${Math.floor(item.duration / 60)}m`
                    : "Archive",
                  link: "",
                }}
                progress={(item.currentTime / (item.duration || 1)) * 100}
                onPlay={() => onPlayFromHistory(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
