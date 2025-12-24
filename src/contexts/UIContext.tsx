import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Theme } from "../types";
import { storageService } from "../services/storageService";
import { APP_CONFIG } from "../config";

interface VersionInfo {
  version: string;
  codename: string;
  buildDate: string;
}

interface UIContextValue {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Modal states
  showStatusPanel: boolean;
  setShowStatusPanel: (show: boolean) => void;

  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;

  // Version info
  version: VersionInfo;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function useUIContext() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUIContext must be used within UIProvider");
  }
  return context;
}

interface UIProviderProps {
  children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    storageService.getTheme() || APP_CONFIG.defaultTheme
  );
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [version, setVersion] = useState<VersionInfo>({
    version: "0.0.1",
    codename: "Aurora",
    buildDate: "2023-11-20",
  });

  // Load version info
  useEffect(() => {
    fetch("./version.json")
      .then((res) => res.json())
      .then(setVersion)
      .catch((err) => console.debug("Version metadata unavailable", err));
  }, []);

  // Apply theme to document
  useEffect(() => {
    let effectiveTheme = theme;
    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.className = effectiveTheme;
  }, [theme]);

  // Set theme and persist
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storageService.saveTheme(newTheme);
  }, []);

  const value: UIContextValue = {
    theme,
    setTheme,
    showStatusPanel,
    setShowStatusPanel,
    showShareModal,
    setShowShareModal,
    version,
    sidebarCollapsed,
    setSidebarCollapsed,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
