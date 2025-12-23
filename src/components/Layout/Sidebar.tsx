import React from 'react';
import { Podcast, Theme } from '../../types';
import { APP_CONFIG } from '../../config';
import { View } from '../../constants';

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  podcasts: Podcast[];
  activePodcast: Podcast | null;
  onPodcastSelect: (podcast: Podcast) => void;
  queueCount: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  version: { version: string; codename: string; buildDate: string };
  onLoadNewEpisodes: () => void;
  onSyncHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  view,
  onViewChange,
  podcasts,
  activePodcast,
  onPodcastSelect,
  queueCount,
  theme,
  onThemeChange,
  version,
  onLoadNewEpisodes,
  onSyncHistory,
}) => {
  const handleNewReleasesClick = () => {
    onLoadNewEpisodes();
  };

  const handleArchiveClick = () => {
    onViewChange('archive');
    onSyncHistory();
  };

  return (
    <aside className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex shrink-0">
      <div className="p-6">
        <div 
          className="flex items-center gap-3 mb-8 text-zinc-900 dark:text-white group cursor-pointer" 
          onClick={() => onViewChange('home')}
        >
          <div className="w-9 h-9 aura-logo rounded-xl flex items-center justify-center text-white animate-pulse-slow">
            <i className="fa-solid fa-microphone-lines text-sm relative z-10"></i>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight leading-none">{APP_CONFIG.appName}</h1>
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
              V{version.version}
            </span>
          </div>
        </div>
        
        <nav className="space-y-1">
          <button 
            onClick={() => onViewChange('home')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              view === 'home' 
                ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' 
                : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <i className="fa-solid fa-compass text-sm"></i> Discover
          </button>
          
          <button 
            onClick={handleNewReleasesClick} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              view === 'new' 
                ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' 
                : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <i className="fa-solid fa-bolt-lightning text-sm"></i> New Releases
          </button>
          
          <button 
            onClick={handleArchiveClick} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              view === 'archive' 
                ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white font-medium' 
                : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <i className="fa-solid fa-box-archive text-sm"></i> Signal Archive 
            {queueCount > 0 && (
              <span className="ml-auto text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                {queueCount}
              </span>
            )}
          </button>
        </nav>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Library</h2>
        </div>
        <div className="space-y-1">
          {podcasts.map(p => (
            <div 
              key={p.id} 
              onClick={() => onPodcastSelect(p)} 
              className={`group flex items-center gap-3 cursor-pointer p-2 rounded-xl transition ${
                activePodcast?.feedUrl === p.feedUrl && view === 'podcast' 
                  ? 'bg-indigo-500/10 dark:bg-indigo-900/20' 
                  : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <img src={p.image} className="w-8 h-8 rounded-lg object-cover shadow-sm" alt="" />
              <span className={`text-xs truncate flex-1 ${
                activePodcast?.feedUrl === p.feedUrl && view === 'podcast' 
                  ? 'text-indigo-600 dark:text-indigo-400 font-medium' 
                  : ''
              }`}>
                {p.title}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
          <button 
            onClick={() => onThemeChange('light')} 
            className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${
              theme === 'light' 
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-500'
            }`}
          >
            <i className="fa-solid fa-sun text-xs"></i>
          </button>
          <button 
            onClick={() => onThemeChange('dark')} 
            className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${
              theme === 'dark' 
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-500'
            }`}
          >
            <i className="fa-solid fa-moon text-xs"></i>
          </button>
          <button 
            onClick={() => onThemeChange('system')} 
            className={`flex-1 flex items-center justify-center py-2 rounded-lg transition ${
              theme === 'system' 
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                : 'text-zinc-500'
            }`}
          >
            <i className="fa-solid fa-desktop text-xs"></i>
          </button>
        </div>
        <div className="text-center">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
            {version.codename} • {version.buildDate}
          </span>
        </div>
      </div>
    </aside>
  );
};
