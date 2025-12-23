import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Episode } from "../types";

interface PlayerContextValue {
  // Current playback
  currentEpisode: Episode | null;
  setCurrentEpisode: (episode: Episode | null) => void;

  // Autoplay control
  playerAutoplay: boolean;
  setPlayerAutoplay: (autoplay: boolean) => void;

  // Playback control (managed by Player component)
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  currentTime: number;
  setCurrentTime: (time: number) => void;

  duration: number;
  setDuration: (duration: number) => void;

  // Volume
  volume: number;
  setVolume: (volume: number) => void;

  // Playback speed
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayerContext must be used within PlayerProvider");
  }
  return context;
}

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [playerAutoplay, setPlayerAutoplay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  const value: PlayerContextValue = {
    currentEpisode,
    setCurrentEpisode,
    playerAutoplay,
    setPlayerAutoplay,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    playbackRate,
    setPlaybackRate,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
