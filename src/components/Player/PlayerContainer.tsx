import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Episode, Podcast } from '../../types';
import { storageService } from '../../services/storageService';
import { castService } from '../../services/castService';
import { APP_CONFIG } from '../../config';
import { PlayerPresentation } from './PlayerPresentation';

export interface PlayerContainerProps {
  episode: Episode;
  podcast: Podcast;
  queue: Episode[];
  onNext: () => void;
  onRemoveFromQueue: (episodeId: string) => void;
  onClearQueue: () => void;
  onClose: () => void;
  onShare: () => void;
  onProgress?: (episodeId: string, currentTime: number, duration: number) => void;
  onReady?: () => void;
  autoPlay?: boolean;
}

export const PlayerContainer: React.FC<PlayerContainerProps> = ({
  episode,
  podcast,
  queue,
  onNext,
  onRemoveFromQueue,
  onClearQueue,
  onClose,
  onShare,
  onProgress,
  onReady,
  autoPlay = false,
}) => {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Cast state
  const [isCasting, setIsCasting] = useState(false);
  const [castDeviceName, setCastDeviceName] = useState<string | undefined>(undefined);

  // UI state
  const [showQueue, setShowQueue] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!episode.audioUrl) {
      setErrorMessage('No audio URL available');
      setIsBuffering(false);
      return;
    }

    const audio = new Audio(episode.audioUrl);
    audioRef.current = audio;

    // Restore playback position from history
    const history = storageService.getHistory();
    const savedPlayback = history[episode.id];
    if (savedPlayback && !savedPlayback.completed) {
      audio.currentTime = savedPlayback.currentTime;
      setCurrentTime(savedPlayback.currentTime);
    }

    // Audio event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsBuffering(false);
      onReady?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      saveProgress(audio.currentTime, audio.duration);
      onNext();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleError = () => {
      setErrorMessage('Failed to load audio');
      setIsBuffering(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Auto-play if requested
    if (autoPlay) {
      audio.play().catch(() => {
        setErrorMessage('Auto-play prevented by browser');
        setIsPlaying(false);
      });
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      
      audio.pause();
      audio.src = '';
    };
  }, [episode.id, episode.audioUrl, autoPlay, onNext, onReady]);

  // Initialize cast service
  useEffect(() => {
    castService.setEnabled(APP_CONFIG.cast.enabled);
    castService.initialize();

    const unsubscribeState = castService.onStateChange((connected, deviceName) => {
      setIsCasting(connected);
      setCastDeviceName(deviceName);
    });

    const unsubscribeMedia = castService.onMediaStatus((status) => {
      if (status) {
        setIsPlaying(status.isPlaying);
        setCurrentTime(status.currentTime);
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeMedia();
    };
  }, []);

  // Start progress save interval when playing
  useEffect(() => {
    if (isPlaying && !isCasting) {
      saveIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          saveProgress(audioRef.current.currentTime, audioRef.current.duration);
        }
      }, 5000); // Save every 5 seconds
    } else {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isPlaying, isCasting]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipSeconds(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipSeconds(10);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]); // Re-bind when isPlaying changes

  // Save progress helper
  const saveProgress = useCallback((currentTime: number, duration: number) => {
    storageService.updatePlayback(episode, podcast, currentTime, duration);
    onProgress?.(episode.id, currentTime, duration);
  }, [episode, podcast, onProgress]);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isCasting) {
      if (isPlaying) {
        castService.pause();
      } else {
        castService.play();
      }
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        saveProgress(audioRef.current.currentTime, audioRef.current.duration);
      } else {
        audioRef.current.play().catch((error) => {
          setErrorMessage('Playback failed: ' + error.message);
        });
      }
    }
  }, [isCasting, isPlaying, saveProgress]);

  // Skip forward/backward
  const skipSeconds = useCallback((seconds: number) => {
    if (!audioRef.current) return;

    if (isCasting) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      castService.seek(newTime);
    } else {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  }, [isCasting, currentTime, duration]);

  // Seek to percentage
  const seekToPercentage = useCallback((percentage: number) => {
    if (!audioRef.current) return;

    const newTime = (percentage / 100) * duration;
    
    if (isCasting) {
      castService.seek(newTime);
    } else {
      audioRef.current.currentTime = newTime;
    }
  }, [duration, isCasting]);

  // Change playback speed
  const changePlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return;

    setPlaybackRate(rate);
    audioRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
  }, []);

  // Cast episode
  const handleCast = useCallback(() => {
    // Cast functionality - would need to be implemented in castService
    // For now, this is a placeholder
    console.log('Cast functionality not yet implemented');
  }, []);

  return (
    <PlayerPresentation
      episode={episode}
      podcast={podcast}
      queue={queue}
      isPlaying={isPlaying}
      isBuffering={isBuffering}
      isCasting={isCasting}
      isCastAvailable={false}
      castDeviceName={castDeviceName}
      currentTime={currentTime}
      duration={duration}
      playbackRate={playbackRate}
      speeds={[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]}
      showQueue={showQueue}
      onTogglePlay={togglePlay}
      onSkipBackward={() => skipSeconds(-10)}
      onSkipForward={() => skipSeconds(10)}
      onNext={onNext}
      onSeek={seekToPercentage}
      onChangeSpeed={() => setShowSpeedMenu(!showSpeedMenu)}
      onToggleQueue={() => setShowQueue(!showQueue)}
      onToggleCast={handleCast}
      onShare={onShare}
      onClose={onClose}
      onRemoveFromQueue={onRemoveFromQueue}
      onClearQueue={onClearQueue}
    />
  );
};
