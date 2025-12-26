/**
 * Google Cast integration service
 * Provides Chromecast functionality for streaming audio to Cast-enabled devices
 */

import { Episode, Podcast } from '../types';

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: {
      framework: {
        CastContext: {
          getInstance: () => CastContext;
        };
        RemotePlayer: new () => RemotePlayer;
        RemotePlayerController: new (player: RemotePlayer) => RemotePlayerController;
        RemotePlayerEventType: {
          IS_CONNECTED_CHANGED: string;
          IS_PLAYING_CHANGED: string;
          CURRENT_TIME_CHANGED: string;
          DURATION_CHANGED: string;
          IS_MEDIA_LOADED_CHANGED: string;
        };
        SessionState: {
          SESSION_STARTED: string;
          SESSION_ENDED: string;
        };
      };
    };
    chrome?: {
      cast: {
        media: {
          DEFAULT_MEDIA_RECEIVER_APP_ID: string;
          MediaInfo: new (contentUrl: string, contentType: string) => any;
          MusicTrackMediaMetadata: new () => any;
          LoadRequest: new (mediaInfo: any) => any;
        };
        AutoJoinPolicy: {
          ORIGIN_SCOPED: string;
        };
        Image: new (url: string) => any;
      };
    };
  }
}

interface CastContext {
  setOptions(options: any): void;
  getCurrentSession(): CastSession | null;
  requestSession(): Promise<void>;
  endCurrentSession(stopCasting: boolean): void;
  addEventListener(eventType: string, handler: (event: any) => void): void;
  removeEventListener(eventType: string, handler: (event: any) => void): void;
}

interface CastSession {
  getSessionObj(): any;
  loadMedia(loadRequest: any): Promise<void>;
}

interface RemotePlayer {
  isConnected: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMediaLoaded: boolean;
  playerState: string;
  displayName: string;
}

interface RemotePlayerController {
  playOrPause(): void;
  stop(): void;
  seek(): void;
  setVolumeLevel(): void;
  addEventListener(eventType: string, handler: (event: any) => void): void;
  removeEventListener(eventType: string, handler: (event: any) => void): void;
}

type CastStateChangeListener = (isConnected: boolean, deviceName?: string) => void;
type CastMediaStatusListener = (status: {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}) => void;

/**
 * Cast service dependencies (none currently, but structure for future extensibility)
 */
export interface CastServiceDependencies {}

/**
 * Creates a Cast service instance
 * @param deps - Service dependencies
 * @returns Cast service API
 */
export const createCastService = (deps: CastServiceDependencies = {}) => {
  let isInitialized = false;
  let isEnabled = true;
  let castContext: CastContext | null = null;
  let remotePlayer: RemotePlayer | null = null;
  let remotePlayerController: RemotePlayerController | null = null;
  let stateChangeListeners: CastStateChangeListener[] = [];
  let mediaStatusListeners: CastMediaStatusListener[] = [];

  /**
   * Enable or disable Cast functionality
   * @param enabled - Whether Cast should be enabled
   */
  const setEnabled = (enabled: boolean): void => {
    isEnabled = enabled;
  };

  /**
   * Initialize the Cast SDK
   * @returns Promise resolving to true if initialized successfully
   */
  const initialize = async (): Promise<boolean> => {
    if (!isEnabled) {
      return false;
    }

    if (isInitialized) return true;

    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.chrome?.cast) {
        resolve(false);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;

      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (!isAvailable || !window.cast) {
          resolve(false);
          return;
        }

        try {
          castContext = window.cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: window.chrome!.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome!.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });

          remotePlayer = new window.cast.framework.RemotePlayer();
          remotePlayerController = new window.cast.framework.RemotePlayerController(remotePlayer);

          remotePlayerController.addEventListener(
            window.cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
            () => {
              if (remotePlayer) {
                const deviceName = remotePlayer.isConnected
                  ? remotePlayer.displayName
                  : undefined;
                stateChangeListeners.forEach((listener) =>
                  listener(remotePlayer!.isConnected, deviceName)
                );
              }
            }
          );

          remotePlayerController.addEventListener(
            window.cast.framework.RemotePlayerEventType.IS_PLAYING_CHANGED,
            () => {
              if (remotePlayer && remotePlayer.isMediaLoaded) {
                mediaStatusListeners.forEach((listener) =>
                  listener({
                    isPlaying: remotePlayer!.isPlaying,
                    currentTime: remotePlayer!.currentTime,
                    duration: remotePlayer!.duration,
                  })
                );
              }
            }
          );

          remotePlayerController.addEventListener(
            window.cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
            () => {
              if (remotePlayer && remotePlayer.isMediaLoaded) {
                mediaStatusListeners.forEach((listener) =>
                  listener({
                    isPlaying: remotePlayer!.isPlaying,
                    currentTime: remotePlayer!.currentTime,
                    duration: remotePlayer!.duration,
                  })
                );
              }
            }
          );

          isInitialized = true;
          resolve(true);
        } catch (error) {
          console.error('Failed to initialize Cast:', error);
          resolve(false);
        }
      };

      document.head.appendChild(script);
    });
  };

  /**
   * Check if currently connected to a Cast device
   * @returns true if connected to Cast device
   */
  const isConnected = (): boolean => {
    return remotePlayer?.isConnected ?? false;
  };

  /**
   * Check if media is currently playing on Cast device
   * @returns true if playing
   */
  const isPlaying = (): boolean => {
    return remotePlayer?.isPlaying ?? false;
  };

  /**
   * Get current playback time from Cast device
   * @returns Current time in seconds
   */
  const getCurrentTime = (): number => {
    return remotePlayer?.currentTime ?? 0;
  };

  /**
   * Get media duration from Cast device
   * @returns Duration in seconds
   */
  const getDuration = (): number => {
    return remotePlayer?.duration ?? 0;
  };

  /**
   * Pause playback on Cast device
   */
  const pause = (): void => {
    if (remotePlayer?.isPlaying && remotePlayerController) {
      remotePlayerController.playOrPause();
    }
  };

  /**
   * Resume playback on Cast device
   */
  const play = (): void => {
    if (!remotePlayer?.isPlaying && remotePlayerController) {
      remotePlayerController.playOrPause();
    }
  };

  /**
   * Seek to a specific time on Cast device
   * @param time - Time in seconds
   */
  const seek = (time: number): void => {
    if (remotePlayer && remotePlayerController) {
      remotePlayer.currentTime = time;
      remotePlayerController.seek();
    }
  };

  /**
   * Load and play media on Cast device
   * @param episode - Episode to play
   * @param podcast - Podcast metadata
   * @returns Promise that resolves when media is loaded
   */
  const loadMedia = async (episode: Episode, podcast: Podcast): Promise<void> => {
    if (!castContext || !window.chrome?.cast) {
      throw new Error('Cast not initialized');
    }

    const session = castContext.getCurrentSession();
    if (!session) {
      throw new Error('No active Cast session');
    }

    const mediaInfo = new window.chrome.cast.media.MediaInfo(
      episode.audioUrl,
      'audio/mpeg'
    );

    const metadata = new window.chrome.cast.media.MusicTrackMediaMetadata();
    metadata.title = episode.title;
    metadata.albumName = podcast.title;
    metadata.artist = podcast.author;

    if (episode.image) {
      metadata.images = [new window.chrome.cast.Image(episode.image)];
    }

    mediaInfo.metadata = metadata;

    const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
    request.autoplay = true;

    await session.loadMedia(request);
  };

  /**
   * Request a new Cast session (show device picker)
   * @returns Promise that resolves when session is established
   */
  const requestSession = async (): Promise<void> => {
    if (!castContext) {
      throw new Error('Cast not initialized');
    }
    await castContext.requestSession();
  };

  /**
   * End the current Cast session
   */
  const endSession = (): void => {
    if (castContext) {
      castContext.endCurrentSession(true);
    }
  };

  /**
   * Subscribe to Cast connection state changes
   * @param listener - Callback for state changes
   * @returns Unsubscribe function
   */
  const onStateChange = (listener: CastStateChangeListener): (() => void) => {
    stateChangeListeners.push(listener);
    return () => {
      stateChangeListeners = stateChangeListeners.filter((l) => l !== listener);
    };
  };

  /**
   * Subscribe to Cast media status changes
   * @param listener - Callback for media status updates
   * @returns Unsubscribe function
   */
  const onMediaStatus = (listener: CastMediaStatusListener): (() => void) => {
    mediaStatusListeners.push(listener);
    return () => {
      mediaStatusListeners = mediaStatusListeners.filter((l) => l !== listener);
    };
  };

  return {
    setEnabled,
    initialize,
    isConnected,
    isPlaying,
    getCurrentTime,
    getDuration,
    pause,
    play,
    seek,
    loadMedia,
    requestSession,
    endSession,
    onStateChange,
    onMediaStatus,
  };
};

/**
 * Default Cast service instance
 */
export const castService = createCastService();
