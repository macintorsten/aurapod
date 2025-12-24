
import { Theme } from './types';

export interface AppConfig {
  appName: string;
  defaultTheme: Theme;
  baseUrl?: string; // Override base URL for share links (defaults to auto-detection)
  proxyUrls: string[];
  providers: {
    itunes: {
      searchUrl: string;
      trendingUrl: string;
      lookupUrl: string;
    }
  };
  playback: {
    seekIncrement: number; // For arrow keys
    skipIncrement: number; // For J/L keys
  };
  shortcuts: {
    playPause: string[];
    back: string;
    forward: string;
    next: string;
    seekPrefix: 'digit' | 'arrow';
  };
  cast: {
    enabled: boolean;
  };
}

export const APP_CONFIG: AppConfig = {
  appName: "AuraPod",
  defaultTheme: "dark",
  // baseUrl: "https://example.com/subfolder", // Optional: override auto-detected base URL
  proxyUrls: [
    "https://api.allorigins.win/get?url=",
    "https://corsproxy.io/?url=",
    "https://api.codetabs.com/v1/proxy?quest="
  ],
  providers: {
    itunes: {
      searchUrl: "https://itunes.apple.com/search",
      trendingUrl: "https://itunes.apple.com/us/rss/toppodcasts/limit=20/json",
      lookupUrl: "https://itunes.apple.com/lookup"
    }
  },
  playback: {
    seekIncrement: 5,
    skipIncrement: 10
  },
  shortcuts: {
    playPause: ['k', ' '],
    back: 'j',
    forward: 'l',
    next: 'n',
    seekPrefix: 'digit'
  },
  cast: {
    enabled: true
  }
};
