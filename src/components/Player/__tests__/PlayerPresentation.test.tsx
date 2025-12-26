import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../../../test-utils';
import { PlayerPresentation } from '../PlayerPresentation';
import { createMockEpisode, createMockPodcast } from '../../../test-utils';

describe('PlayerPresentation', () => {
  const mockEpisode = createMockEpisode({
    title: 'Test Episode Title',
  });

  const mockPodcast = createMockPodcast({
    title: 'Test Podcast',
  });

  const defaultProps = {
    episode: mockEpisode,
    podcast: mockPodcast,
    queue: [],
    isPlaying: false,
    isBuffering: false,
    isCasting: false,
    castDeviceName: undefined,
    currentTime: 0,
    duration: 100,
    playbackRate: 1,
    speeds: [0.5, 0.8, 1, 1.2, 1.5, 1.7, 2],
    showQueue: false,
    isCastAvailable: false,
    onTogglePlay: vi.fn(),
    onSkipBackward: vi.fn(),
    onSkipForward: vi.fn(),
    onNext: vi.fn(),
    onSeek: vi.fn(),
    onShare: vi.fn(),
    onToggleQueue: vi.fn(),
    onToggleCast: vi.fn(),
    onChangeSpeed: vi.fn(),
    onClose: vi.fn(),
    onRemoveFromQueue: vi.fn(),
    onClearQueue: vi.fn(),
  };

  it('renders episode title', () => {
    render(<PlayerPresentation {...defaultProps} />, { withProviders: false });
    
    expect(screen.getByText('Test Episode Title')).toBeInTheDocument();
  });

  it('renders podcast title', () => {
    render(<PlayerPresentation {...defaultProps} />, { withProviders: false });
    
    expect(screen.getByText('Test Podcast')).toBeInTheDocument();
  });

  it('calls onTogglePlay when play button clicked', async () => {
    const onTogglePlay = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerPresentation {...defaultProps} onTogglePlay={onTogglePlay} />,
      { withProviders: false }
    );
    
    const playButton = screen.getByTitle('Play');
    await user.click(playButton);
    
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });

  it('shows pause button when playing', () => {
    render(
      <PlayerPresentation {...defaultProps} isPlaying={true} />,
      { withProviders: false }
    );
    
    expect(screen.getByTitle('Pause')).toBeInTheDocument();
  });

  it('calls onSkipBackward when skip back button clicked', async () => {
    const onSkipBackward = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerPresentation {...defaultProps} onSkipBackward={onSkipBackward} />,
      { withProviders: false }
    );
    
    const skipButton = screen.getByTitle('Skip back 10s');
    await user.click(skipButton);
    
    expect(onSkipBackward).toHaveBeenCalledOnce();
  });

  it('calls onSkipForward when skip forward button clicked', async () => {
    const onSkipForward = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerPresentation {...defaultProps} onSkipForward={onSkipForward} />,
      { withProviders: false }
    );
    
    const skipButton = screen.getByTitle('Skip forward 10s');
    await user.click(skipButton);
    
    expect(onSkipForward).toHaveBeenCalledOnce();
  });

  it('calls onNext when next button clicked', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerPresentation {...defaultProps} onNext={onNext} />,
      { withProviders: false }
    );
    
    const nextButton = screen.getByTitle('Next episode');
    await user.click(nextButton);
    
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('displays buffering state', () => {
    const { container } = render(
      <PlayerPresentation {...defaultProps} isBuffering={true} />,
      { withProviders: false }
    );
    
    // PlayerInfo should show buffering spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays casting state with device name', () => {
    render(
      <PlayerPresentation
        {...defaultProps}
        isCasting={true}
        castDeviceName="Living Room TV"
      />,
      { withProviders: false }
    );
    
    expect(screen.getByText(/living room tv/i)).toBeInTheDocument();
  });

  it('calls onShare when share button clicked', async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerPresentation {...defaultProps} onShare={onShare} />,
      { withProviders: false }
    );
    
    const shareButton = screen.getByTitle('Share');
    await user.click(shareButton);
    
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PlayerPresentation {...defaultProps} onClose={onClose} />,
      { withProviders: false }
    );
    
    const closeButton = screen.getByTitle('Close player');
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows queue button when queue has items', () => {
    render(
      <PlayerPresentation
        {...defaultProps}
        queue={[createMockEpisode()]}
      />,
      { withProviders: false }
    );
    
    expect(screen.getByTitle('Queue')).toBeInTheDocument();
  });

  it('does not show cast button when cast is unavailable', () => {
    render(
      <PlayerPresentation {...defaultProps} isCastAvailable={false} />,
      { withProviders: false }
    );
    
    expect(screen.queryByTitle('Cast')).not.toBeInTheDocument();
  });

  it('shows cast button when cast is available', () => {
    render(
      <PlayerPresentation {...defaultProps} isCastAvailable={true} />,
      { withProviders: false }
    );
    
    expect(screen.getByTitle('Cast')).toBeInTheDocument();
  });

  it('displays current playback speed', () => {
    render(
      <PlayerPresentation {...defaultProps} playbackRate={1.5} />,
      { withProviders: false }
    );
    
    expect(screen.getByText(/1\.5x/i)).toBeInTheDocument();
  });
});
