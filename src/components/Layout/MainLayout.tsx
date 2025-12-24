import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Podcast, Theme } from "../../types";

interface MainLayoutProps {
  children: ReactNode;
  podcasts: Podcast[];
  activePodcast: Podcast | null;
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
  podcasts,
  activePodcast,
  queueCount,
  theme,
  onThemeChange,
  version,
  errorCount,
  onShowStatusPanel,
  onLoadNewEpisodes,
  onSyncHistory,
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 font-sans">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          podcasts={podcasts}
          activePodcast={activePodcast}
          queueCount={queueCount}
          theme={theme}
          onThemeChange={onThemeChange}
          version={version}
          onLoadNewEpisodes={onLoadNewEpisodes}
          onSyncHistory={onSyncHistory}
        />

        <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">
          <Header
            activePodcast={activePodcast}
            errorCount={errorCount}
            onShowStatusPanel={onShowStatusPanel}
            version={version}
          />

          <div className="flex-1 overflow-y-auto p-8 pb-32">{children}</div>
        </main>
      </div>
    </div>
  );
};
