import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EpisodeList } from '../EpisodeList';
import { Episode, PlaybackState } from '../../types';

// Mock EpisodeItem component
vi.mock('../EpisodeItem', () => ({
  default: ({ episode, progress, isLoading, onPlay, onQueue, onShare }: any) => (
    <div data-testid={`episode-${episode.id}`}>
      <div>{episode.title}</div>
      <div>Progress: {progress}%</div>
      <div>Loading: {isLoading ? 'yes' : 'no'}</div>
      {onPlay && <button onClick={onPlay}>Play</button>}
      {onQueue && <button onClick={onQueue}>Queue</button>}
      {onShare && <button onClick={onShare}>Share</button>}
    </div>
  ),
}));

const mockEpisode1: Episode = {
  id: 'ep1',
  podcastId: 'podcast1',
  title: 'Episode 1',
  audioUrl: 'https://example.com/ep1.mp3',
  duration: '3600',
  pubDate: '2024-01-01',
  description: 'First episode',
  link: 'https://example.com/ep1',
};

const mockEpisode2: Episode = {
  id: 'ep2',
  podcastId: 'podcast1',
  title: 'Episode 2',
  audioUrl: 'https://example.com/ep2.mp3',
  duration: '1800',
  pubDate: '2024-01-02',
  description: 'Second episode',
  link: 'https://example.com/ep2',
};

const mockEpisode3: Episode = {
  id: 'ep3',
  podcastId: 'podcast1',
  title: 'Episode 3',
  audioUrl: 'https://example.com/ep3.mp3',
  duration: '2400',
  pubDate: '2024-01-03',
  description: 'Third episode',
  link: 'https://example.com/ep3',
};

describe('EpisodeList', () => {
  describe('rendering', () => {
    it('should render list of episodes', () => {
      render(
        <EpisodeList
          episodes={[mockEpisode1, mockEpisode2]}
          history={{}}
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText('Episode 1')).toBeInTheDocument();
      expect(screen.getByText('Episode 2')).toBeInTheDocument();
    });

    it('should render empty message when no episodes', () => {
      render(
        <EpisodeList
          episodes={[]}
          history={{}}
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText('No episodes found')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      render(
        <EpisodeList
          episodes={[]}
          history={{}}
          onPlay={vi.fn()}
          emptyMessage="Your custom message here"
        />
      );

      expect(screen.getByText('Your custom message here')).toBeInTheDocument();
    });

    it('should render all episodes in order', () => {
      const { container } = render(
        <EpisodeList
          episodes={[mockEpisode1, mockEpisode2, mockEpisode3]}
          history={{}}
          onPlay={vi.fn()}
        />
      );

      const episodes = container.querySelectorAll('[data-testid^="episode-"]');
      expect(episodes).toHaveLength(3);
    });
  });

  describe('playback state and progress', () => {
    it('should show 0% progress for episodes not in history', () => {
      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={{}}
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
    });

    it('should calculate progress from history', () => {
      const history: Record<string, PlaybackState> = {
        ep1: {
          episodeId: 'ep1',
          podcastId: 'podcast1',
          currentTime: 1800,
          duration: 3600,
          lastUpdated: Date.now(),
          completed: false,
        },
      };

      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={history}
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText('Progress: 50%')).toBeInTheDocument();
    });

    it('should calculate different progress for different episodes', () => {
      const history: Record<string, PlaybackState> = {
        ep1: {
          episodeId: 'ep1',
          podcastId: 'podcast1',
          currentTime: 900,
          duration: 3600,
          lastUpdated: Date.now(),
          completed: false,
        },
        ep2: {
          episodeId: 'ep2',
          podcastId: 'podcast1',
          currentTime: 1350,
          duration: 1800,
          lastUpdated: Date.now(),
          completed: false,
        },
      };

      render(
        <EpisodeList
          episodes={[mockEpisode1, mockEpisode2]}
          history={history}
          onPlay={vi.fn()}
        />
      );

      const progressElements = screen.getAllByText(/Progress:/);
      expect(progressElements[0]).toHaveTextContent('Progress: 25%');
      expect(progressElements[1]).toHaveTextContent('Progress: 75%');
    });
  });

  describe('loading state', () => {
    it('should show loading for specific episode', () => {
      render(
        <EpisodeList
          episodes={[mockEpisode1, mockEpisode2]}
          history={{}}
          onPlay={vi.fn()}
          loadingEpisodeId="ep1"
        />
      );

      const loadingElements = screen.getAllByText(/Loading:/);
      expect(loadingElements[0]).toHaveTextContent('Loading: yes');
      expect(loadingElements[1]).toHaveTextContent('Loading: no');
    });

    it('should not show loading when loadingEpisodeId is null', () => {
      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={{}}
          onPlay={vi.fn()}
          loadingEpisodeId={null}
        />
      );

      expect(screen.getByText('Loading: no')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onPlay when play button clicked', async () => {
      const user = userEvent.setup();
      const onPlay = vi.fn();

      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={{}}
          onPlay={onPlay}
        />
      );

      await user.click(screen.getByText('Play'));

      expect(onPlay).toHaveBeenCalledTimes(1);
      expect(onPlay).toHaveBeenCalledWith(mockEpisode1);
    });

    it('should call onAddToQueue when queue button clicked', async () => {
      const user = userEvent.setup();
      const onAddToQueue = vi.fn();

      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={{}}
          onPlay={vi.fn()}
          onAddToQueue={onAddToQueue}
        />
      );

      await user.click(screen.getByText('Queue'));

      expect(onAddToQueue).toHaveBeenCalledTimes(1);
      expect(onAddToQueue).toHaveBeenCalledWith(mockEpisode1);
    });

    it('should call onShare when share button clicked', async () => {
      const user = userEvent.setup();
      const onShare = vi.fn();

      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={{}}
          onPlay={vi.fn()}
          onShare={onShare}
        />
      );

      await user.click(screen.getByText('Share'));

      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onShare).toHaveBeenCalledWith(mockEpisode1);
    });

    it('should not render queue button when onAddToQueue not provided', () => {
      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={{}}
          onPlay={vi.fn()}
        />
      );

      expect(screen.queryByText('Queue')).not.toBeInTheDocument();
    });

    it('should not render share button when onShare not provided', () => {
      render(
        <EpisodeList
          episodes={[mockEpisode1]}
          history={{}}
          onPlay={vi.fn()}
        />
      );

      expect(screen.queryByText('Share')).not.toBeInTheDocument();
    });
  });

  describe('integration scenarios', () => {
    it('should handle list with history, loading, and all callbacks', async () => {
      const user = userEvent.setup();
      const onPlay = vi.fn();
      const onAddToQueue = vi.fn();
      const onShare = vi.fn();

      const history: Record<string, PlaybackState> = {
        ep2: {
          episodeId: 'ep2',
          podcastId: 'podcast1',
          currentTime: 900,
          duration: 1800,
          lastUpdated: Date.now(),
          completed: false,
        },
      };

      render(
        <EpisodeList
          episodes={[mockEpisode1, mockEpisode2, mockEpisode3]}
          history={history}
          onPlay={onPlay}
          onAddToQueue={onAddToQueue}
          onShare={onShare}
          loadingEpisodeId="ep2"
        />
      );

      // Check rendering
      expect(screen.getByText('Episode 1')).toBeInTheDocument();
      expect(screen.getByText('Episode 2')).toBeInTheDocument();
      expect(screen.getByText('Episode 3')).toBeInTheDocument();

      // Check progress
      const progressElements = screen.getAllByText(/Progress:/);
      expect(progressElements[1]).toHaveTextContent('Progress: 50%');

      // Check loading
      const loadingElements = screen.getAllByText(/Loading:/);
      expect(loadingElements[1]).toHaveTextContent('Loading: yes');

      // Click play on first episode
      const playButtons = screen.getAllByText('Play');
      await user.click(playButtons[0]);
      expect(onPlay).toHaveBeenCalledWith(mockEpisode1);
    });
  });
});
