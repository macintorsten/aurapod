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

class CastService {
  private isInitialized = false;
  private castContext: CastContext | null = null;
  private remotePlayer: RemotePlayer | null = null;
  private remotePlayerController: RemotePlayerController | null = null;
  private stateChangeListeners: CastStateChangeListener[] = [];
  private mediaStatusListeners: CastMediaStatusListener[] = [];
  
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    return new Promise((resolve) => {
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (!isAvailable) {
          console.warn('Google Cast API not available');
          resolve(false);
          return;
        }

        try {
          const cast = window.cast;
          const chrome = window.chrome;
          if (!cast || !chrome) {
            resolve(false);
            return;
          }

          this.castContext = cast.framework.CastContext.getInstance();
          this.castContext.setOptions({
            receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });

          // Initialize remote player
          this.remotePlayer = new cast.framework.RemotePlayer();
          this.remotePlayerController = new cast.framework.RemotePlayerController(this.remotePlayer);

          // Listen for connection changes
          this.remotePlayerController.addEventListener(
            cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
            () => this.handleConnectionChange()
          );

          // Listen for playback state changes
          this.remotePlayerController.addEventListener(
            cast.framework.RemotePlayerEventType.IS_PLAYING_CHANGED,
            () => this.handlePlaybackChange()
          );

          // Listen for time updates
          this.remotePlayerController.addEventListener(
            cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
            () => this.handlePlaybackChange()
          );

          this.isInitialized = true;
          console.log('Cast service initialized');
          resolve(true);
        } catch (error) {
          console.error('Failed to initialize Cast service:', error);
          resolve(false);
        }
      };
    });
  }

  private handleConnectionChange() {
    const isConnected = this.remotePlayer?.isConnected || false;
    const deviceName = this.getDeviceName();
    this.stateChangeListeners.forEach(listener => listener(isConnected, deviceName));
  }

  private handlePlaybackChange() {
    if (!this.remotePlayer || !this.isConnected()) return;
    
    const status = {
      isPlaying: this.remotePlayer.isPlaying,
      currentTime: this.remotePlayer.currentTime,
      duration: this.remotePlayer.duration,
    };
    
    this.mediaStatusListeners.forEach(listener => listener(status));
  }

  isConnected(): boolean {
    return this.remotePlayer?.isConnected || false;
  }

  getDeviceName(): string | undefined {
    if (!this.isConnected() || !this.castContext) return undefined;
    const session = this.castContext.getCurrentSession();
    return session?.getSessionObj()?.receiver?.friendlyName;
  }

  async requestSession(): Promise<void> {
    if (!this.castContext) {
      throw new Error('Cast service not initialized');
    }
    await this.castContext.requestSession();
  }

  async loadMedia(episode: Episode, podcast: Podcast, startTime?: number): Promise<void> {
    if (!this.castContext) {
      throw new Error('Cast service not initialized');
    }

    const chrome = window.chrome;
    if (!chrome) {
      throw new Error('Chrome Cast API not available');
    }

    const session = this.castContext.getCurrentSession();
    if (!session) {
      throw new Error('No active cast session');
    }

    const mediaInfo = new chrome.cast.media.MediaInfo(episode.audioUrl, 'audio/mpeg');
    mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
    mediaInfo.metadata.title = episode.title;
    mediaInfo.metadata.artist = podcast.title;
    mediaInfo.metadata.albumName = podcast.title;
    
    if (episode.image || podcast.image) {
      mediaInfo.metadata.images = [
        new chrome.cast.Image(episode.image || podcast.image)
      ];
    }

    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    if (startTime) {
      request.currentTime = startTime;
    }
    request.autoplay = true;

    await session.loadMedia(request);
  }

  play(): void {
    if (this.remotePlayerController && this.remotePlayer && !this.remotePlayer.isPlaying) {
      this.remotePlayerController.playOrPause();
    }
  }

  pause(): void {
    if (this.remotePlayerController && this.remotePlayer && this.remotePlayer.isPlaying) {
      this.remotePlayerController.playOrPause();
    }
  }

  stop(): void {
    if (this.remotePlayerController) {
      this.remotePlayerController.stop();
    }
  }

  seek(time: number): void {
    if (this.remotePlayer && this.remotePlayerController) {
      this.remotePlayer.currentTime = time;
      this.remotePlayerController.seek();
    }
  }

  getCurrentTime(): number {
    return this.remotePlayer?.currentTime || 0;
  }

  getDuration(): number {
    return this.remotePlayer?.duration || 0;
  }

  isPlaying(): boolean {
    return this.remotePlayer?.isPlaying || false;
  }

  endSession(): void {
    if (this.castContext) {
      this.castContext.endCurrentSession(true);
    }
  }

  onStateChange(listener: CastStateChangeListener): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  onMediaStatus(listener: CastMediaStatusListener): () => void {
    this.mediaStatusListeners.push(listener);
    return () => {
      this.mediaStatusListeners = this.mediaStatusListeners.filter(l => l !== listener);
    };
  }
}

export const castService = new CastService();
