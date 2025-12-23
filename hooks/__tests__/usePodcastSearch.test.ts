import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { usePodcastSearch } from '../usePodcastSearch';

vi.mock('../../services/rssService', () => ({
  rssService: {
    searchPodcasts: vi.fn(),
  },
}));

import { rssService } from '../../services/rssService';

describe('usePodcastSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces calls to rssService.searchPodcasts by 500ms', async () => {
    const searchPodcastsMock = rssService.searchPodcasts as unknown as ReturnType<typeof vi.fn>;
    searchPodcastsMock.mockResolvedValue([]);

    const { result } = renderHook(() => usePodcastSearch());

    await act(async () => {
      await result.current.search('rea');
      await result.current.search('react');
    });

    expect(searchPodcastsMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(searchPodcastsMock).toHaveBeenCalledTimes(1);
    expect(searchPodcastsMock).toHaveBeenCalledWith('react');
  });

  it('clears results and does not search when query is empty/whitespace', async () => {
    const { result } = renderHook(() => usePodcastSearch());

    await act(async () => {
      await result.current.search('   ');
    });

    expect(result.current.searchResults).toEqual([]);
    expect(rssService.searchPodcasts).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(rssService.searchPodcasts).not.toHaveBeenCalled();
  });

  it('calls onError when rssService.searchPodcasts rejects', async () => {
    const err = new Error('network down');
    const searchPodcastsMock = rssService.searchPodcasts as unknown as ReturnType<typeof vi.fn>;
    searchPodcastsMock.mockRejectedValueOnce(err);

    const onError = vi.fn();
    const { result } = renderHook(() => usePodcastSearch(onError));

    await act(async () => {
      await result.current.search('broken');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(err, 'broken');
  });

  it('sets searching true while request is in-flight and false afterwards', async () => {
    const searchPodcastsMock = rssService.searchPodcasts as unknown as ReturnType<typeof vi.fn>;

    let resolveSearch!: (value: unknown) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });

    searchPodcastsMock.mockReturnValueOnce(searchPromise);

    const { result } = renderHook(() => usePodcastSearch());

    await act(async () => {
      await result.current.search('pending');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.searching).toBe(true);

    await act(async () => {
      resolveSearch([]);
      await Promise.resolve();
    });

    expect(result.current.searching).toBe(false);
  });
});
