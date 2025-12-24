import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Podcast, Episode } from "../../types";
import EpisodeItem from "../../components/EpisodeItem";
import { useAppContext } from "../../contexts/AppContext";
import { usePlayerContext } from "../../contexts/PlayerContext";
import { decodeFeedUrl, decodeEpisodeId } from "../../constants/routes";
import { LoadingView } from "../../components/Loading";

interface PodcastDetailPageProps {
  episodes: Episode[];
  currentEpisode: Episode | null;
  loadingEpisodeId: string | null;
  onPlayEpisode: (episode: Episode) => void;
  onAddToQueue: (episode: Episode) => void;
  onShare: (podcastUrl: string, episodeId?: string) => void;
  onSubscribe: (podcast: Podcast) => void;
  isSubscribed: (feedUrl: string) => boolean;
}

export const PodcastDetailPage: React.FC<PodcastDetailPageProps> = ({
  episodes,
  currentEpisode,
  loadingEpisodeId,
  onPlayEpisode,
  onAddToQueue,
  onShare,
  onSubscribe,
  isSubscribed,
}) => {
  const { feedUrl: encodedFeedUrl, episodeId: encodedEpisodeId } = useParams<{
    feedUrl: string;
    episodeId?: string;
  }>();
  const navigate = useNavigate();
  const { activePodcast, loadPodcast, loading } = useAppContext();
  const { setCurrentEpisode, setPlayerAutoplay } = usePlayerContext();

  // Load podcast when feedUrl changes
  useEffect(() => {
    if (!encodedFeedUrl) return;

    const feedUrl = decodeFeedUrl(encodedFeedUrl);
    
    // Only load if we don't have this podcast loaded or if URL changed
    if (!activePodcast || activePodcast.feedUrl !== feedUrl) {
      // Find podcast from subscriptions or create a minimal one
      const podcast: Podcast = {
        id: btoa(feedUrl).substring(0, 16),
        title: "Loading...",
        feedUrl,
        image: "",
        author: "",
        description: "",
      };
      loadPodcast(podcast);
    }
  }, [encodedFeedUrl, activePodcast, loadPodcast]);

  // Handle episodeId param - select episode without auto-play
  useEffect(() => {
    if (!encodedEpisodeId || !episodes.length) return;

    const episodeId = decodeEpisodeId(encodedEpisodeId);
    const episode = episodes.find((ep) => ep.id === episodeId);

    if (episode && currentEpisode?.id !== episodeId) {
      setCurrentEpisode(episode);
      setPlayerAutoplay(false); // Don't auto-play from direct URL
    }
  }, [encodedEpisodeId, episodes, currentEpisode, setCurrentEpisode, setPlayerAutoplay]);

  if (loading || !activePodcast) {
    return <LoadingView message="Tuning Signal..." />;
  }

  const podcast = activePodcast;

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-10 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-3"
      >
        <i className="fa-solid fa-arrow-left"></i> Back
      </button>

      <div className="flex flex-col md:flex-row gap-10 mb-20 items-start">
        <img
          src={podcast.image}
          className="w-56 h-56 md:w-72 md:h-72 rounded-[2.5rem] shadow-2xl object-cover shrink-0"
          alt=""
        />
        <div className="space-y-6 flex-1 pt-2">
          <div className="flex items-center justify-between">
            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Broadcast Verified
            </span>
            <button
              onClick={() => onShare(podcast.feedUrl)}
              className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 hover:text-indigo-600 transition"
            >
              <i className="fa-solid fa-share-nodes"></i>
            </button>
          </div>
          <h3 className="text-5xl font-extrabold text-zinc-900 dark:text-white leading-tight tracking-tight">
            {podcast.title}
          </h3>
          <p className="text-xl text-indigo-600 font-bold">{podcast.author}</p>
          <p
            className="text-zinc-500 text-sm max-w-3xl leading-relaxed prose dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: podcast.description }}
          ></p>
          {!isSubscribed(podcast.feedUrl) && (
            <button
              onClick={() => onSubscribe(podcast)}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-bold shadow-xl hover:bg-indigo-700 transition"
            >
              SUBSCRIBE
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between pb-8 border-b border-zinc-100 dark:border-zinc-900">
          <h4 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Recent Waves
          </h4>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {episodes.map((episode) => (
            <EpisodeItem
              key={episode.id}
              isActive={currentEpisode?.id === episode.id}
              isLoading={loadingEpisodeId === episode.id}
              episode={episode}
              progress={0}
              onPlay={() => onPlayEpisode(episode)}
              onQueue={() => onAddToQueue(episode)}
              onShare={() => onShare(podcast.feedUrl, episode.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
