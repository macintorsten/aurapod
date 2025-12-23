
import { Theme } from './types';

export interface AppConfig {
  appName: string;
  defaultTheme: Theme;
  proxyUrls: string[];
  providers: {
    itunes: {
      searchUrl: string;
      trendingUrl: string;
      lookupUrl: string;
    }
  }
}

export const APP_CONFIG: AppConfig = {
  appName: "AuraPod",
  defaultTheme: "dark",
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
  }
};
