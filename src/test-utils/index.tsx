/**
 * Test Utilities
 *
 * Centralized testing helpers to eliminate repetitive test setup.
 * Provides custom render function with context providers and mock factories.
 *
 * Usage:
 *   import { render, screen } from '../../test-utils';
 *
 *   test('component behavior', () => {
 *     render(<MyComponent />, {
 *       playerValue: { isPlaying: true }
 *     });
 *     expect(screen.getByText('Expected')).toBeInTheDocument();
 *   });
 */

import { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PlayerProvider, UIProvider, AppProvider } from '../contexts';
import type { Episode, Podcast, PlaybackState, Theme } from '../types';

/**
 * Custom render options extending RTL's RenderOptions
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Partial mock values for PlayerContext */
  playerValue?: Partial<{
    currentEpisode: Episode | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    playbackRate: number;
  }>;
  
  /** Partial mock values for UIContext */
  uiValue?: Partial<{
    theme: Theme;
    showStatusPanel: boolean;
    showShareModal: boolean;
    sidebarCollapsed: boolean;
  }>;
  
  /** Partial mock values for AppContext */
  appValue?: Partial<{
    podcasts: Podcast[];
    activePodcast: Podcast | null;
    episodes: Episode[];
    history: Record<string, PlaybackState>;
    loading: boolean;
  }>;

  /** Whether to wrap in all providers (default: true) */
  withProviders?: boolean;
}

/**
 * Custom render function that wraps components with necessary providers
 * 
 * @param ui - Component to render
 * @param options - Render options including context mock values
 * @returns RTL render result with user event utility
 * 
 * @example
 * ```tsx
 * const { user } = render(<Player />, {
 *   playerValue: { currentEpisode: mockEpisode, isPlaying: true }
 * });
 * await user.click(screen.getByRole('button', { name: /pause/i }));
 * ```
 */
export function render(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    playerValue,
    uiValue,
    appValue,
    withProviders = true,
    ...renderOptions
  } = options;

  // If no providers needed, render directly
  if (!withProviders) {
    return {
      ...rtlRender(ui, renderOptions),
      user: userEvent.setup(),
    };
  }

  // Wrapper with all providers
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <UIProvider>
        <AppProvider>
          <PlayerProvider>
            {children}
          </PlayerProvider>
        </AppProvider>
      </UIProvider>
    );
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    user: userEvent.setup(),
  };
}

/**
 * Create a mock Episode for testing
 */
export function createMockEpisode(overrides?: Partial<Episode>): Episode {
  return {
    id: 'ep-test-1',
    podcastId: 'pod-test-1',
    title: 'Test Episode',
    description: 'Test episode description',
    audioUrl: 'https://example.com/audio.mp3',
    duration: '30:00',
    pubDate: '2024-01-01T00:00:00Z',
    link: 'https://example.com/episode',
    image: 'https://example.com/episode.jpg',
    ...overrides,
  };
}

/**
 * Create a mock Podcast for testing
 */
export function createMockPodcast(overrides?: Partial<Podcast>): Podcast {
  return {
    id: 'pod-test-1',
    title: 'Test Podcast',
    author: 'Test Author',
    image: 'https://example.com/podcast.jpg',
    feedUrl: 'https://example.com/feed.xml',
    description: 'Test podcast description',
    ...overrides,
  };
}

/**
 * Create a mock PlaybackState for testing
 */
export function createMockPlaybackState(
  overrides?: Partial<PlaybackState>
): PlaybackState {
  return {
    episodeId: 'ep-test-1',
    podcastId: 'pod-test-1',
    currentTime: 0,
    duration: 1800,
    lastUpdated: Date.now(),
    completed: false,
    ...overrides,
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { userEvent };
