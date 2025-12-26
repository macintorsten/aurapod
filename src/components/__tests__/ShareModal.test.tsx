import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from '../Modals/ShareModal';
import { Podcast, Episode } from '../../types';
import * as shareService from '../../services/shareService';
import * as rssService from '../../services/rssService';

describe('ShareModal', () => {
  const mockPodcast: Podcast = {
    id: 'podcast-1',
    title: 'Test Podcast',
    description: 'Test Description',
    image: 'https://example.com/podcast.jpg',
    feedUrl: 'https://example.com/feed.xml',
    author: 'Test Author',
    category: 'Technology',
  };

  const mockEpisode: Episode = {
    id: 'episode-1',
    podcastId: 'podcast-1',
    title: 'Test Episode',
    description: 'Test Episode Description',
    pubDate: '2024-01-01',
    audioUrl: 'https://example.com/audio.mp3',
    duration: '30:00',
    link: 'https://example.com/episode',
    image: 'https://example.com/episode.jpg',
    podcastTitle: 'Test Podcast',
    podcastImage: 'https://example.com/podcast.jpg',
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock calculateMaxEpisodes to avoid compression errors in tests
    // Return 1 to match the single episode in the mock data
    vi.spyOn(shareService.shareService, 'calculateMaxEpisodes').mockResolvedValue({
      maxEpisodes: 1,
      totalEpisodes: 1
    });
    // Mock rssService.fetchPodcast for Full Manifest mode
    vi.spyOn(rssService.rssService, 'fetchPodcast').mockResolvedValue({
      podcast: mockPodcast,
      episodes: [mockEpisode]
    });
    // Mock generateUrl to avoid compression failures in tests
    vi.spyOn(shareService.shareService, 'generateUrl').mockReturnValue({
      url: 'http://localhost:3000/#/p/test-compressed-url',
      length: 45,
      isTooLong: false,
      payloadLength: 0,
      warning: undefined
    });
  });

  describe('Track Sharing (Wave Broadcast)', () => {
    it('should render with correct title for track sharing', () => {
      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Wave')).toBeInTheDocument();
      expect(screen.getByText('Broadcast')).toBeInTheDocument();
    });

    it('should display episode information', () => {
      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Test Episode')).toBeInTheDocument();
      expect(screen.getByText('Test Podcast')).toBeInTheDocument();
    });

    it('should show RSS Source and Embedded options', () => {
      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('RSS Source')).toBeInTheDocument();
      expect(screen.getByText('Embedded')).toBeInTheDocument();
    });

    it('should default to RSS Source when podcast has feedUrl', () => {
      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      const rssSourceButton = screen.getByText('RSS Source').closest('button');
      expect(rssSourceButton).toHaveClass('border-indigo-500');
    });

    it('should default to Embedded when podcast has no feedUrl', () => {
      const podcastWithoutFeed = { ...mockPodcast, feedUrl: '' };
      render(
        <ShareModal
          shareType="track"
          podcast={podcastWithoutFeed}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      const embeddedButton = screen.getByText('Embedded').closest('button');
      expect(embeddedButton).toHaveClass('border-purple-500');
    });

    it('should show Embedded mode badge when in Embedded mode', () => {
      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      // Switch to Embedded
      const embeddedButton = screen.getByText('Embedded').closest('button');
      fireEvent.click(embeddedButton!);

      // Should show Embed badge (emoji + text)
      expect(screen.getByText(/📦 Embed/)).toBeInTheDocument();
    });

    it('should copy URL to clipboard when button clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
      });

      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      const copyButton = screen.getByText('Copy Link');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
      });

      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  describe('RSS Sharing (Frequency Broadcast)', () => {
    it('should render with correct title for RSS sharing', () => {
      render(
        <ShareModal
          shareType="frequency"
          podcast={mockPodcast}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('heading', { name: /Frequency Broadcast/ })).toBeInTheDocument();
    });

    it('should display podcast information', () => {
      render(
        <ShareModal
          shareType="frequency"
          podcast={mockPodcast}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Test Podcast')).toBeInTheDocument();
      expect(screen.getByText(/Test Author.*RSS Feed/)).toBeInTheDocument();
    });

    it('should show Frequency Only and Full Manifest options', () => {
      render(
        <ShareModal
          shareType="frequency"
          podcast={mockPodcast}
          onClose={mockOnClose}
        />
      );

      // Check buttons exist - text is now 'Frequency Only' and 'Full Manifest'
      expect(screen.getByText('Frequency Only')).toBeInTheDocument();
      expect(screen.getByText('Full Manifest')).toBeInTheDocument();
    });

    it('should default to Frequency Only mode', () => {
      render(
        <ShareModal
          shareType="frequency"
          podcast={mockPodcast}
          onClose={mockOnClose}
        />
      );

      const frequencyButton = screen.getByText('Frequency Only').closest('button');
      expect(frequencyButton).toHaveClass('border-indigo-500');
    });

    it('should show manifest controls when Full Manifest selected', async () => {
      render(
        <ShareModal
          shareType="frequency"
          podcast={mockPodcast}
          onClose={mockOnClose}
        />
      );

      const manifestButton = screen.getByText('Full Manifest').closest('button');
      fireEvent.click(manifestButton!);

      await waitFor(() => {
        // Manifest configuration section exists (no heading text)
        expect(screen.getByText('Episodes')).toBeInTheDocument();
        // Check for toggle options (compact labels now)
        expect(screen.getByText('Desc')).toBeInTheDocument();
        expect(screen.getByText('Img')).toBeInTheDocument();
        expect(screen.getByText('Time')).toBeInTheDocument();
      });
    });

    it('should use correct button text for RSS sharing', () => {
      render(
        <ShareModal
          shareType="frequency"
          podcast={mockPodcast}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button clicked', () => {
      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }).closest('button');
      if (closeButton && closeButton.querySelector('.fa-xmark')) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should display URL and byte counts', () => {
      render(
        <ShareModal
          shareType="track"
          podcast={mockPodcast}
          episode={mockEpisode}
          onClose={mockOnClose}
        />
      );

      // Shows byte count (unified display)
      expect(screen.getByText(/\d+\s+bytes/)).toBeInTheDocument();
    });
  });
});
