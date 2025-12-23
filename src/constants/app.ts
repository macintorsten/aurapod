/**
 * Application-wide constants
 */

export const APP_CONSTANTS = {
  // Error tracking
  MAX_ERRORS: 20,
  
  // Playback
  PLAYBACK_SPEEDS: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const,
  COMPLETION_THRESHOLD: 0.95, // 95% progress = completed
  
  // Episode limits
  MAX_NEW_EPISODES_PER_PODCAST: 5,
  
  // Fetch limits
  TRENDING_PODCASTS_LIMIT: 20,
  
  // Default values
  DEFAULT_VERSION: {
    version: '0.0.1',
    codename: 'Aurora',
    buildDate: '2023-11-20',
  },
  
  // Share data
  STANDALONE_PODCAST_ID_PREFIX: 'standalone',
  DEFAULT_SHARED_PODCAST_TITLE: 'Shared Frequency',
  DEFAULT_SHARED_AUTHOR: 'Independent Broadcast',
  DEFAULT_SHARED_EPISODE_ID: 'shared-track',
} as const;

export type PlaybackSpeed = typeof APP_CONSTANTS.PLAYBACK_SPEEDS[number];
