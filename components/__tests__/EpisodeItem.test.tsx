import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EpisodeItem from '../EpisodeItem';

describe('EpisodeItem', () => {
  it('renders basic episode metadata', () => {
    render(
      <EpisodeItem
        episode={{
          id: 'ep-1',
          title: 'Episode One',
          podcastTitle: 'Test Podcast',
          duration: '10m',
          pubDate: '2023-01-02T00:00:00.000Z',
          description: '<p>Hello <b>world</b></p>',
          image: 'https://example.com/ep.jpg',
        }}
        progress={0}
        onPlay={() => {}}
      />
    );

    expect(screen.getByText('Episode One')).toBeInTheDocument();
    expect(screen.getByText('Test Podcast')).toBeInTheDocument();
    expect(screen.getByText(/10m/)).toBeInTheDocument();
    // Locale-safe check: the year should still be present.
    expect(screen.getByText(/2023/)).toBeInTheDocument();
    expect(screen.getByText('Read More')).toBeInTheDocument();
  });

  it('calls onPlay when clicking the title', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();

    render(
      <EpisodeItem
        episode={{ id: 'ep-1', title: 'Episode One', image: 'https://example.com/ep.jpg' }}
        progress={0}
        onPlay={onPlay}
      />
    );

    await user.click(screen.getByText('Episode One'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onPlay when clicking the play button', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();

    render(
      <EpisodeItem
        episode={{ id: 'ep-1', title: 'Episode One', image: 'https://example.com/ep.jpg' }}
        progress={0}
        onPlay={onPlay}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Play Episode' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onQueue/onRemove when buttons are clicked', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const onQueue = vi.fn();
    const onRemove = vi.fn();

    render(
      <EpisodeItem
        episode={{ id: 'ep-1', title: 'Episode One', image: 'https://example.com/ep.jpg' }}
        progress={0}
        onPlay={onPlay}
        onQueue={onQueue}
        onRemove={onRemove}
      />
    );

    await user.click(screen.getByRole('button', { name: /Queue/i }));
    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(onQueue).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('toggles description expansion', async () => {
    const user = userEvent.setup();

    render(
      <EpisodeItem
        episode={{
          id: 'ep-1',
          title: 'Episode One',
          image: 'https://example.com/ep.jpg',
          description: '<p>Hello world</p>',
        }}
        progress={0}
        onPlay={() => {}}
      />
    );

    const toggle = screen.getByRole('button', { name: /Read More/i });
    await user.click(toggle);

    expect(screen.getByRole('button', { name: /Show Less/i })).toBeInTheDocument();
  });

  it('does not show description controls when rendered as queue item', () => {
    render(
      <EpisodeItem
        episode={{
          id: 'ep-1',
          title: 'Episode One',
          image: 'https://example.com/ep.jpg',
          description: '<p>Hello world</p>',
        }}
        progress={0}
        isQueue
        onPlay={() => {}}
      />
    );

    expect(screen.queryByText('Read More')).not.toBeInTheDocument();
    expect(screen.queryByText('Show Less')).not.toBeInTheDocument();
  });
});
