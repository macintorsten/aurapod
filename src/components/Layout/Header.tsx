import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Podcast } from "../../types";
import { APP_CONFIG } from "../../config";

interface HeaderProps {
  activePodcast: Podcast | null;
  errorCount: number;
  onShowStatusPanel: () => void;
  version: { version: string };
}

export const Header: React.FC<HeaderProps> = ({
  activePodcast,
  errorCount,
  onShowStatusPanel,
  version,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTitle = () => {
    if (location.pathname === "/") return "Discover";
    if (location.pathname === "/archive") return "Signal Archive";
    if (location.pathname === "/new") return "New Releases";
    if (location.pathname.startsWith("/podcast")) {
      return activePodcast?.title || "Podcast";
    }
    return "AuraPod";
  };

  const handleHomeClick = () => {
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="h-16 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-8 justify-between shrink-0 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-zinc-900 dark:text-white text-lg">
          {getTitle()}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {errorCount > 0 && (
          <button
            onClick={onShowStatusPanel}
            className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition group"
          >
            <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            <span className="absolute right-12 hidden group-hover:block whitespace-nowrap bg-zinc-900 text-white text-[10px] py-1 px-3 rounded-md">
              System Alerts ({errorCount})
            </span>
          </button>
        )}
        <button
          onClick={handleHomeClick}
          className="w-8 h-8 rounded-full aura-logo shadow-lg opacity-80 hover:opacity-100 transition-opacity transform hover:scale-105"
          title={`${APP_CONFIG.appName} ${version.version}`}
        ></button>
      </div>
    </header>
  );
};
