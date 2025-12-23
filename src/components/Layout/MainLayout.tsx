import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Podcast, Theme } from "../../types";
import { View } from "../../constants";

interface MainLayoutProps {
  children: ReactNode;
  view: View;
  onViewChange: (view: View) => void;
  podcasts: Podcast[];
  activePodcast: Podcast | null;
  onPodcastSelect: (podcast: Podcast) => void;
  queueCount: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  version: { version: string; codename: string; buildDate: string };
  errorCount: number;
  onShowStatusPanel: () => void;
  onLoadNewEpisodes: () => void;
  onSyncHistory: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  view,
  onViewChange,
  podcasts,
  activePodcast,
  onPodcastSelect,
  queueCount,
  theme,
  onThemeChange,
  version,
  errorCount,
  onShowStatusPanel,
  onLoadNewEpisodes,
  onSyncHistory,
}) => {
  const handleHomeClick = () => {
    onViewChange("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 font-sans">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          view={view}
          onViewChange={onViewChange}
          podcasts={podcasts}
          activePodcast={activePodcast}
          onPodcastSelect={onPodcastSelect}
          queueCount={queueCount}
          theme={theme}
          onThemeChange={onThemeChange}
          version={version}
          onLoadNewEpisodes={onLoadNewEpisodes}
          onSyncHistory={onSyncHistory}
        />

        <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">
          <Header
            view={view}
            activePodcast={activePodcast}
            errorCount={errorCount}
            onShowStatusPanel={onShowStatusPanel}
            onHomeClick={handleHomeClick}
            version={version}
          />

          <div className="flex-1 overflow-y-auto p-8 pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
};
