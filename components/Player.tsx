
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Episode, Podcast } from '../types';
import { storageService } from '../services/storageService';
import EpisodeItem from './EpisodeItem';

interface PlayerProps {
  episode: Episode;
  podcast: Podcast;
  queue: Episode[];
  onNext: () => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
  onClose: () => void;
  onShare: () => void;
  onProgress?: () => void; // Added for state sync
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
  onProgress
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showQueue, setShowQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProgress = useCallback(() => {
    if (audioRef.current && !error && audioRef.current.currentTime > 0.1) {
      storageService.updatePlayback(
        episode, 
        podcast, 
        audioRef.current.currentTime, 
        audioRef.current.duration
      );
      if (onProgress) onProgress();
    }
  }, [episode, podcast, error, onProgress]);

  useEffect(() => {
    setError(null);
    if (!episode.audioUrl) {
      setError("No audio source found for this wave.");
      setIsPlaying(false);
      return;
    }

    const history = storageService.getHistory();
    const state = history[episode.id];
    
    if (audioRef.current) {
      audioRef.current.pause(); 
      if (state && !state.completed) {
        audioRef.current.currentTime = state.currentTime;
      } else {
        audioRef.current.currentTime = 0;
      }
      
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            // Initial save to register in history immediately
            setTimeout(saveProgress, 1000);
          })
          .catch((err) => {
            console.warn("Playback prevented or failed:", err);
            setIsPlaying(false);
          });
      }
    }
  }, [episode.id, episode.audioUrl, saveProgress]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        saveProgress();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(cur);
      setDuration(dur);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        saveProgress(); 
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  };

  const cycleSpeed = () => {
    const currentIndex = SPEEDS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIndex];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
      saveProgress(); 
    }
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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Queue Drawer */}
      {showQueue && (
        <div className="absolute bottom-full right-4 w-[calc(100%-2rem)] md:w-[400px] max-h-[70vh] overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-[2.5rem] shadow-2xl animate-fade-in flex flex-col">
          <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
            <div>
              <h5 className="font-extrabold text-xl text-zinc-900 dark:text-white tracking-tight">Up Next</h5>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{queue.length} Episodes in Waves</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={onClearQueue} className="text-[10px] font-bold text-red-500 hover:text-red-600 transition tracking-widest">CLEAR ALL</button>
              <button onClick={() => setShowQueue(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {queue.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-200">
                  <i className="fa-solid fa-layer-group text-2xl"></i>
                </div>
                <p className="text-xs text-zinc-500 italic">Your queue is currently empty.</p>
              </div>
            ) : (
              queue.map((item, idx) => (
                <EpisodeItem 
                  key={item.id + idx}
                  episode={item}
                  progress={0}
                  isQueue
                  onPlay={() => {}} 
                  onRemove={() => onRemoveFromQueue(item.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Player Bar */}
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-200 dark:border-zinc-800/50 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center gap-4 lg:gap-8">
          
          <div className="flex items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
            <div className="relative group shrink-0">
              <img src={episode.image || podcast.image} alt="" className="w-14 h-14 rounded-xl shadow-lg object-cover border border-zinc-100 dark:border-zinc-700/50" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100 leading-tight mb-0.5">{episode.title}</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-medium">{podcast.title}</p>
              {error && <p className="text-[10px] text-red-500 font-bold animate-pulse">{error}</p>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-[2] w-full max-w-2xl">
            <div className="flex items-center gap-8 mb-1">
              <button 
                onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 15; }} 
                className="text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Skip back 15s"
              >
                <i className="fa-solid fa-rotate-left text-xl"></i>
              </button>
              <button 
                onClick={togglePlay} 
                className={`w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 dark:hover:bg-white text-white dark:text-zinc-950 flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 ${error ? 'opacity-20 cursor-not-allowed' : ''}`}
                disabled={!!error}
              >
                <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-lg ${!isPlaying && 'ml-1'}`}></i>
              </button>
              <button 
                onClick={() => { if(audioRef.current) audioRef.current.currentTime += 30; }} 
                className="text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Skip forward 30s"
              >
                <i className="fa-solid fa-rotate-right text-xl"></i>
              </button>
              <button 
                onClick={onNext}
                disabled={queue.length === 0}
                className="text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-20"
                title="Next in Queue"
              >
                <i className="fa-solid fa-forward-step text-xl"></i>
              </button>
            </div>
            
            <div className="flex items-center gap-4 w-full group/progress">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 w-12 text-right font-mono font-medium tracking-tight">
                {formatTime(currentTime)}
              </span>
              
              <div className="relative flex-1 h-1.5 flex items-center">
                <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-zinc-100 rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform duration-200"></div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 0} 
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={!!error}
                />
              </div>

              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 w-12 font-mono font-medium tracking-tight">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 flex-1 justify-end">
            <button 
              onClick={() => setShowQueue(!showQueue)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showQueue ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500'}`}
              title="Queue"
            >
              <i className="fa-solid fa-list-ul"></i>
            </button>

            <button 
              onClick={onShare}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              title="Share Current Track"
            >
              <i className="fa-solid fa-share-nodes"></i>
            </button>

            <button 
              onClick={cycleSpeed}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all border border-zinc-200 dark:border-zinc-700/50 flex items-center gap-1.5 min-w-[56px] justify-center"
              title="Playback Speed"
            >
              {playbackRate}x
            </button>

            <div className="flex items-center gap-3 group/volume">
              <button 
                onClick={() => {
                  const newVol = volume === 0 ? 1 : 0;
                  setVolume(newVol);
                  if (audioRef.current) audioRef.current.volume = newVol;
                }}
                className="text-zinc-400 dark:text-zinc-500 group-hover/volume:text-indigo-600 dark:group-hover/volume:text-indigo-400 transition-colors"
              >
                <i className={`fa-solid w-4 ${volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high'} text-sm`}></i>
              </button>
              <div className="relative w-20 h-1 flex items-center">
                <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                <div className="absolute inset-y-0 left-0 bg-zinc-400 dark:bg-zinc-500 rounded-full group-hover/volume:bg-indigo-600 dark:group-hover/volume:bg-indigo-500 transition-colors" style={{ width: `${volume * 100}%` }}></div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>
            
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
              title="Close Player"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div className="flex lg:hidden items-center justify-between w-full mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
            <div className="flex gap-4">
              <button 
                onClick={cycleSpeed}
                className="px-4 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-300"
              >
                {playbackRate}x
              </button>
              <button onClick={() => setShowQueue(!showQueue)} className={`p-2 ${showQueue ? 'text-indigo-600' : 'text-zinc-400'}`}>
                <i className="fa-solid fa-list-ul"></i>
              </button>
              <button onClick={onShare} className="p-2 text-zinc-400">
                <i className="fa-solid fa-share-nodes"></i>
              </button>
            </div>
            <button onClick={onClose} className="text-zinc-400 p-2">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        src={episode.audioUrl || ''} 
        onEnded={() => {
          saveProgress(); 
          onNext();
        }} 
        onPlay={() => { if(audioRef.current) audioRef.current.playbackRate = playbackRate; }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onError={() => setError("Frequency interruption: Source not suitable.")}
      />
    </div>
  );
};

export default Player;
