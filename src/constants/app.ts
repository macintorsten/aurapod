/**
 * Application-wide constants
 */

export const APP_CONSTANTS = {
  // Error tracking
  MAX_ERRORS: 20,

  // Playback
  PLAYBACK_SPEEDS: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const,
  COMPLETION_THRESHOLD: 0.95, // 95% progress = completed

  // Default values
  DEFAULT_VERSION: {
    version: "0.0.1",
    codename: "Aurora",
    buildDate: "2023-11-20",
  },

  // Episodes
  MAX_NEW_EPISODES_PER_PODCAST: 10,

  // Share data
  STANDALONE_PODCAST_ID_PREFIX: "standalone",
  DEFAULT_SHARED_PODCAST_TITLE: "Shared Frequency",
  DEFAULT_SHARED_AUTHOR: "Independent Broadcast",
  DEFAULT_SHARED_EPISODE_ID: "shared-track",
} as const;
