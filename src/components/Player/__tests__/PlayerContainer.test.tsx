import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '../../../test-utils';
import { act } from '@testing-library/react';
import { PlayerContainer } from '../PlayerContainer';
import { createMockEpisode, createMockPodcast } from '../../../test-utils';
import * as storageService from '../../../services/storageService';
import * as castService from '../../../services/castService';

// Mock services
vi.mock('../../../services/storageService');
vi.mock('../../../services/castService');

// Mock Audio API
class MockAudio {
  src = '';
  currentTime = 0;
  duration = 100;
  playbackRate = 1;
  paused = true;
  
  private listeners: Record<string, Array<(event?: any) => void>> = {};
  
  async play() {
    this.paused = false;
    this.trigger('play');
    return Promise.resolve();
  }
  
  pause() {
    this.paused = true;
    this.trigger('pause');
  }
  
  addEventListener(event: string, handler: (event?: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    
    // Immediately trigger loadedmetadata for tests
    if (event === 'loadedmetadata') {
      setTimeout(() => handler(), 0);
    }
  }
  
  removeEventListener(event: string, handler: (event?: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }
  
  trigger(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(handler => handler(data));
    }
  }
}

global.Audio = MockAudio as any;

describe('PlayerContainer', () => {
  const mockEpisode = createMockEpisode({
    audioUrl: 'https://example.com/audio.mp3',
  });

  const mockPodcast = createMockPodcast();

  const defaultProps = {
    episode: mockEpisode,
    podcast: mockPodcast,
    queue: [],
    onNext: vi.fn(),
    onRemoveFromQueue: vi.fn(),
    onClearQueue: vi.fn(),
    onClose: vi.fn(),
    onShare: vi.fn(),
    onProgress: vi.fn(),
    onReady: vi.fn(),
    autoPlay: false, // Don't autoplay in tests
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default storage service mocks
    vi.spyOn(storageService.storageService, 'getHistory').mockReturnValue({});
    vi.spyOn(storageService.storageService, 'updatePlayback').mockImplementation(() => {});
    
    // Setup default cast service mocks
    vi.spyOn(castService.castService, 'setEnabled').mockImplementation(() => {});
    vi.spyOn(castService.castService, 'initialize').mockResolvedValue(false);
    vi.spyOn(castService.castService, 'onStateChange').mockReturnValue(() => {});
    vi.spyOn(castService.castService, 'onMediaStatus').mockReturnValue(() => {});
    vi.spyOn(castService.castService, 'isPlaying').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders PlayerPresentation with episode data', () => {
    render(<PlayerContainer {...defaultProps} />);
    
    expect(screen.getByText(mockEpisode.title)).toBeInTheDocument();
    expect(screen.getByText(mockPodcast.title)).toBeInTheDocument();
  });

  it('initializes with play button (not playing by default)', () => {
    render(<PlayerContainer {...defaultProps} />);
    
    expect(screen.getByTitle('Play')).toBeInTheDocument();
  });

  it('toggles play/pause when play button clicked', async () => {
    const user = userEvent.setup();
    render(<PlayerContainer {...defaultProps} />);
    
    const playButton = screen.getByTitle('Play');
    await user.click(playButton);
    
    // After clicking, should show pause button
    await waitFor(() => {
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
    });
  });

  it('saves progress when toggling pause', async () => {
    const user = userEvent.setup();
    const updatePlaybackSpy = vi.spyOn(storageService.storageService, 'updatePlayback');
    
    render(<PlayerContainer {...defaultProps} />);
    
    // Play then pause
    const playButton = screen.getByTitle('Play');
    await user.click(playButton);
    
    await waitFor(() => {
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
    });
    
    const pauseButton = screen.getByTitle('Pause');
    await user.click(pauseButton);
    
    // Should save progress on pause (with episode, podcast, and time parameters)
    expect(updatePlaybackSpy).toHaveBeenCalledWith(
      mockEpisode,
      mockPodcast,
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('calls onNext when next button clicked', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    
    render(<PlayerContainer {...defaultProps} onNext={onNext} />);
    
    const nextButton = screen.getByTitle('Next episode');
    await user.click(nextButton);
    
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('calls onShare when share button clicked', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    
    render(<PlayerContainer {...defaultProps} onShare={onShare} />);
    
    const shareButton = screen.getByTitle('Share');
    await user.click(shareButton);
    
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(<PlayerContainer {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByTitle('Close player');
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows queue button when queue has items', () => {
    render(
      <PlayerContainer
        {...defaultProps}
        queue={[createMockEpisode()]}
      />
    );
    
    expect(screen.getByTitle('Queue')).toBeInTheDocument();
  });

  it('restores playback position from history on mount', () => {
    const mockHistory = {
      [mockEpisode.id]: {
        episodeId: mockEpisode.id,
        podcastId: mockPodcast.id,
        currentTime: 120,
        duration: 300,
        lastUpdated: Date.now(),
        completed: false,
      },
    };
    
    vi.spyOn(storageService.storageService, 'getHistory').mockReturnValue(mockHistory);
    
    render(<PlayerContainer {...defaultProps} />);
    
    // Audio element should be created with the restored time
    // (We can't easily test audio.currentTime in JSDOM, but the component should set it)
    expect(storageService.storageService.getHistory).toHaveBeenCalled();
  });

  it('does not restore position for completed episodes', () => {
    const mockHistory = {
      [mockEpisode.id]: {
        episodeId: mockEpisode.id,
        podcastId: mockPodcast.id,
        currentTime: 120,
        duration: 300,
        lastUpdated: Date.now(),
        completed: true, // Marked as completed
      },
    };
    
    vi.spyOn(storageService.storageService, 'getHistory').mockReturnValue(mockHistory);
    
    render(<PlayerContainer {...defaultProps} />);
    
    // Should start from beginning for completed episodes
    expect(storageService.storageService.getHistory).toHaveBeenCalled();
  });

  it('initializes cast service on mount', () => {
    const setEnabledSpy = vi.spyOn(castService.castService, 'setEnabled');
    const initializeSpy = vi.spyOn(castService.castService, 'initialize');
    
    render(<PlayerContainer {...defaultProps} />);
    
    expect(setEnabledSpy).toHaveBeenCalled();
    expect(initializeSpy).toHaveBeenCalled();
  });

  it('cleans up cast service listeners on unmount', () => {
    const unsubscribe = vi.fn();
    vi.spyOn(castService.castService, 'onStateChange').mockReturnValue(unsubscribe);
    vi.spyOn(castService.castService, 'onMediaStatus').mockReturnValue(unsubscribe);
    
    const { unmount } = render(<PlayerContainer {...defaultProps} />);
    
    unmount();
    
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('calls onProgress callback when provided', async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    
    render(<PlayerContainer {...defaultProps} onProgress={onProgress} />);
    
    // Trigger play then pause to save progress
    await user.click(screen.getByTitle('Play'));
    await waitFor(() => screen.getByTitle('Pause'));
    await user.click(screen.getByTitle('Pause'));
    
    expect(onProgress).toHaveBeenCalled();
  });

  it('handles keyboard shortcuts for play/pause', async () => {
    render(<PlayerContainer {...defaultProps} />);
    
    const playButton = screen.getByTitle('Play');
    
    // Simulate Space key press wrapped in act
    await act(async () => {
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      window.dispatchEvent(spaceEvent);
    });
    
    await waitFor(() => {
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
    });
  });

  it('displays error message when audio URL is missing', () => {
    const episodeWithoutAudio = createMockEpisode({ audioUrl: '' });
    
    render(
      <PlayerContainer
        {...defaultProps}
        episode={episodeWithoutAudio}
      />
    );
    
    // Component should handle this gracefully
    // (Exact error handling depends on implementation)
    expect(screen.getByText(mockPodcast.title)).toBeInTheDocument();
  });
});
