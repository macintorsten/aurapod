
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Episode, Podcast } from '../types';
import { storageService } from '../services/storageService';
import { castService } from '../services/castService';
import { APP_CONFIG } from '../config';

interface PlayerProps {
  episode: Episode;
  podcast: Podcast;
  queue: Episode[];
  onNext: () => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
  onClose: () => void;
  onShare: () => void;
  onProgress?: () => void; 
  onReady?: () => void;
  autoPlay?: boolean;
}

const SPEEDS = [0.5, 0.8, 1, 1.2, 1.5, 1.7, 2];

const Player: React.FC<PlayerProps> = ({ 
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
  autoPlay = true
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [castDeviceName, setCastDeviceName] = useState<string | undefined>();

  const saveProgress = useCallback(() => {
    if (isCasting) {
      const castTime = castService.getCurrentTime();
      const castDuration = castService.getDuration();
      if (castTime > 0.1) {
        storageService.updatePlayback(episode, podcast, castTime, castDuration);
        if (onProgress) onProgress();
      }
    } else if (audioRef.current && !error && audioRef.current.currentTime > 0.1) {
      storageService.updatePlayback(
        episode, 
        podcast, 
        audioRef.current.currentTime, 
        audioRef.current.duration
      );
      if (onProgress) onProgress();
    }
  }, [episode, podcast, error, onProgress, isCasting]);

  const togglePlay = useCallback(() => {
    if (isCasting) {
      if (castService.isPlaying()) {
        castService.pause();
        setIsPlaying(false);
      } else {
        castService.play();
        setIsPlaying(true);
      }
      saveProgress();
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        saveProgress(); 
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [isPlaying, saveProgress, isCasting]);

  const skipSeconds = useCallback((seconds: number) => {
    if (isCasting) {
      const newTime = Math.max(0, Math.min(castService.getDuration(), castService.getCurrentTime() + seconds));
      castService.seek(newTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
    }
  }, [isCasting]);

  const seekToPercentage = useCallback((percent: number) => {
    if (isCasting) {
      const duration = castService.getDuration();
      if (isFinite(duration)) {
        castService.seek((percent / 100) * duration);
      }
    } else if (audioRef.current && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = (percent / 100) * audioRef.current.duration;
    }
  }, [isCasting]);

  // Initialize Cast Service
  useEffect(() => {
    if (!APP_CONFIG.cast.enabled) return;
    
    castService.setEnabled(APP_CONFIG.cast.enabled);
    castService.initialize().catch(err => console.warn('Cast init failed:', err));

    const unsubscribeState = castService.onStateChange((isConnected, deviceName) => {
      setIsCasting(isConnected);
      setCastDeviceName(deviceName);
      
      if (isConnected && audioRef.current) {
        // Transfer playback to Cast
        const currentTime = audioRef.current.currentTime;
        audioRef.current.pause();
        setIsPlaying(false);
        
        castService.loadMedia(episode, podcast, currentTime)
          .then(() => {
            setIsPlaying(true);
          })
          .catch(err => console.error('Failed to load media on Cast:', err));
      } else if (!isConnected && audioRef.current) {
        // Transfer back to local playback
        const currentTime = castService.getCurrentTime();
        audioRef.current.currentTime = currentTime;
        if (isPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
    });

    const unsubscribeMedia = castService.onMediaStatus((status) => {
      setIsPlaying(status.isPlaying);
      setCurrentTime(status.currentTime);
      setDuration(status.duration);
    });

    return () => {
      unsubscribeState();
      unsubscribeMedia();
    };
  }, [episode, podcast, isPlaying]);

  const handleCastToggle = async () => {
    if (isCasting) {
      castService.endSession();
    } else {
      try {
        await castService.requestSession();
      } catch (error) {
        console.warn('Cast session request cancelled or failed:', error);
      }
    }
  };

  // Keyboard Shortcuts via Config
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      const code = e.code; 
      const shortcuts = APP_CONFIG.shortcuts;
      const playback = APP_CONFIG.playback;

      if (shortcuts.playPause.includes(key)) {
        e.preventDefault();
        togglePlay();
      } else if (key === shortcuts.back) {
        skipSeconds(-playback.skipIncrement);
      } else if (key === shortcuts.forward) {
        skipSeconds(playback.skipIncrement);
      } else if (key === shortcuts.next && e.shiftKey) {
        onNext();
      } else if (key === 'arrowleft') {
        skipSeconds(-playback.seekIncrement);
      } else if (key === 'arrowright') {
        skipSeconds(playback.seekIncrement);
      }

      // 0-9 Seeking (YouTube Style)
      if (code.startsWith('Digit') && shortcuts.seekPrefix === 'digit') {
        const digit = parseInt(code.replace('Digit', ''));
        if (!isNaN(digit)) {
          seekToPercentage(digit * 10);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [togglePlay, skipSeconds, onNext, seekToPercentage]);

  useEffect(() => {
    setError(null);
    if (!episode.audioUrl) { setError("No source found."); setIsPlaying(false); return; }
    
    if (isCasting) {
      // Load media on Cast device
      const historyData = storageService.getHistory();
      const state = historyData[episode.id];
      const startTime = state && !state.completed ? state.currentTime : 0;
      
      castService.loadMedia(episode, podcast, startTime)
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
        });
    } else if (audioRef.current) {
      const isNewEpisode = audioRef.current.src !== episode.audioUrl;
      if (isNewEpisode) {
        audioRef.current.pause();
        setIsBuffering(true);
        const historyData = storageService.getHistory();
        const state = historyData[episode.id];
        audioRef.current.currentTime = state && !state.completed ? state.currentTime : 0;
        audioRef.current.src = episode.audioUrl;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.load();
        if (autoPlay) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
        } else {
          setIsPlaying(false);
          setIsBuffering(false);
        }
      }
    }
  }, [episode.id, episode.audioUrl, autoPlay, playbackRate, isCasting, podcast]);

  useEffect(() => {
    const interval = setInterval(() => { if (isPlaying) saveProgress(); }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  const handleTimeUpdate = () => {
    if (isCasting) {
      // Time updates come through the Cast media status listener
      return;
    }
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(cur); setDuration(dur);
      if ('mediaSession' in navigator && isFinite(dur)) {
        navigator.mediaSession.setPositionState({ duration: dur, playbackRate, position: cur });
      }
    }
  };

  const handleWaiting = () => setIsBuffering(true);
  const handleCanPlay = () => {
    setIsBuffering(false);
    if (onReady) onReady();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="shrink-0 w-full z-50">
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-200 dark:border-zinc-800/50 p-4 shadow-xl">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center gap-4 lg:gap-8">
          
          <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
            <div className="relative shrink-0">
              <img src={episode.image || podcast.image} alt="" className="w-14 h-14 rounded-xl shadow-lg object-cover border border-zinc-100 dark:border-zinc-700/50" />
              {isBuffering && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100 leading-tight mb-0.5">{episode.title}</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-medium">
                {isCasting ? (
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-tv text-indigo-600"></i>
                    <span>Casting to {castDeviceName}</span>
                  </span>
                ) : (
                  podcast.title
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-[2] w-full">
            <div className="flex items-center gap-8 mb-1">
              <button onClick={() => skipSeconds(-15)} className="text-zinc-400 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-rotate-left text-xl"></i></button>
              <button 
                onClick={togglePlay} 
                className={`w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center transition shadow-xl hover:scale-105 ${isBuffering && !isPlaying ? 'opacity-50' : ''}`}
                disabled={isBuffering && !isPlaying}
              >
                {isBuffering && !isPlaying ? (
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                ) : (
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-lg`}></i>
                )}
              </button>
              <button onClick={() => skipSeconds(30)} className="text-zinc-400 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-rotate-right text-xl"></i></button>
              <button onClick={onNext} disabled={queue.length === 0} className="text-zinc-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><i className="fa-solid fa-forward-step text-xl"></i></button>
            </div>
            <div className="flex items-center gap-4 w-full group/progress">
              <span className="text-[10px] text-zinc-400 w-10 text-right font-mono">{formatTime(currentTime)}</span>
              <div className="relative flex-1 h-1 flex items-center">
                <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                <div className="absolute inset-y-0 left-0 bg-indigo-600 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(e) => { const v = parseFloat(e.target.value); if(isCasting) { castService.seek(v); } else if(audioRef.current) { audioRef.current.currentTime = v; } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              </div>
              <span className="text-[10px] text-zinc-400 w-10 font-mono">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 flex-1 justify-end">
            {APP_CONFIG.cast.enabled && (
              <button 
                onClick={handleCastToggle}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition ${
                  isCasting 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400'
                }`}
                title={isCasting ? `Casting to ${castDeviceName}` : 'Cast'}
              >
                <i className="fa-solid fa-tv"></i>
              </button>
            )}
            <button onClick={onShare} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition"><i className="fa-solid fa-share-nodes"></i></button>
            <button onClick={() => setPlaybackRate(prev => { const n = SPEEDS[(SPEEDS.indexOf(prev) + 1) % SPEEDS.length]; if(audioRef.current) audioRef.current.playbackRate = n; return n; })} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition min-w-[50px]">{playbackRate}x</button>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
          </div>
        </div>
      </div>
      <audio 
        ref={audioRef} 
        onEnded={onNext} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleTimeUpdate} 
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onError={() => setError("Frequency interruption.")} 
      />
    </div>
  );
};

export default Player;
