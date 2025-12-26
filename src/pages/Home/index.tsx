import React from "react";
import { useNavigate } from "react-router-dom";
import { Podcast } from "../../types";
import { LoadingView } from "../../components/Loading";
import { buildPodcastRoute } from "../../constants/routes";

interface HomePageProps {
  searchQuery: string;
  searchResults: Podcast[];
  searching: boolean;
  onSearch: (query: string) => void;
  suggestedPodcasts: Podcast[];
  loadingSuggestions: boolean;
  onSubscribe: (podcast: Podcast) => void;
  isSubscribed: (feedUrl: string) => boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  searchQuery,
  searchResults,
  searching,
  onSearch,
  suggestedPodcasts,
  loadingSuggestions,
  onSubscribe,
  isSubscribed,
}) => {
  const navigate = useNavigate();

  const handlePodcastSelect = (podcast: Podcast) => {
    navigate(buildPodcastRoute(podcast.feedUrl));
  };

  if (loadingSuggestions && suggestedPodcasts.length === 0) {
    return <LoadingView message="Loading trending podcasts..." />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12">
        <div className="relative max-w-2xl">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400"></i>
          <input
            type="text"
            placeholder="Explore millions of frequencies..."
            data-testid="search-input"
            aria-label="Explore"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-5 pl-14 pr-6 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-400 text-lg shadow-sm"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {searchResults.map((result) => (
              <div
                key={result.id}
                data-testid="search-result-card"
                onClick={() => handlePodcastSelect(result)}
                className="group cursor-pointer flex flex-col"
              >
                <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all">
                  <img
                    src={result.image}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                    alt=""
                  />
                </div>
                <h4 className="font-bold text-zinc-900 dark:text-white truncate text-sm">
                  {result.title}
                </h4>
                <p className="text-[10px] text-zinc-500 truncate font-medium">
                  {result.author}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {!searchQuery && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-8">
            Trending Now
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {suggestedPodcasts.map((podcast) => (
              <button
                key={podcast.id}
                onClick={() => handlePodcastSelect(podcast)}
                className="bg-zinc-50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition flex items-center gap-4 group"
              >
                <img
                  src={podcast.image}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                  alt=""
                />
                <div className="overflow-hidden flex-1 text-left">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {podcast.title}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate font-medium">
                    {podcast.author}
                  </p>
                </div>
                {isSubscribed(podcast.feedUrl) ? (
                  <i className="fa-solid fa-check text-green-500 ml-auto"></i>
                ) : (
                  <i
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubscribe(podcast);
                    }}
                    className="fa-solid fa-plus text-zinc-300 group-hover:text-indigo-600 transition ml-auto"
                  ></i>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
