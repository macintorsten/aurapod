import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import { MainLayout } from "../Layout/MainLayout";
import { PlayerContainer } from "../Player/PlayerContainer";
import { Podcast, Episode, Theme } from "../../types";

// Mock services
vi.mock("../../services/storageService", () => ({
  storageService: {
    updatePlayback: vi.fn(),
    getHistory: vi.fn(() => ({})),
  },
}));

vi.mock("../../services/castService", () => ({
  castService: {
    setEnabled: vi.fn(),
    initialize: vi.fn(() => Promise.resolve()),
    onStateChange: vi.fn(() => vi.fn()),
    onMediaStatus: vi.fn(() => vi.fn()),
    isPlaying: vi.fn(() => false),
    pause: vi.fn(),
    play: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
    getDuration: vi.fn(() => 0),
    seek: vi.fn(),
    loadMedia: vi.fn(() => Promise.resolve()),
    endSession: vi.fn(),
    requestSession: vi.fn(() => Promise.resolve()),
  },
}));

const mockPodcasts: Podcast[] = [
  {
    id: "pod1",
    title: "Test Podcast",
    author: "Test Author",
    image: "https://example.com/image.jpg",
    feedUrl: "https://example.com/feed.xml",
    description: "Test description",
  },
];

const mockEpisode: Episode = {
  id: "ep1",
  podcastId: "pod1",
  title: "Test Episode",
  description: "Test description",
  audioUrl: "https://example.com/audio.mp3",
  duration: "30:00",
  pubDate: "2024-01-01",
  link: "https://example.com",
  image: "https://example.com/image.jpg",
};

const mockVersion = {
  version: "1.0.0",
  codename: "aurora",
  buildDate: "2024-01-01",
};

describe("Layout with Player Integration", () => {
  it("should keep sidebar theme controls visible when player is rendered", () => {
    const { container } = render(
      <HashRouter>
        <div className="h-screen flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MainLayout
              podcasts={mockPodcasts}
              activePodcast={mockPodcasts[0]}
              queueCount={0}
              theme={"dark" as Theme}
              onThemeChange={vi.fn()}
              version={mockVersion}
              errorCount={0}
              onShowStatusPanel={vi.fn()}
              onLoadNewEpisodes={vi.fn()}
              onSyncHistory={vi.fn()}
            >
              <div>Test Content</div>
            </MainLayout>
          </div>
          <PlayerContainer
            episode={mockEpisode}
            podcast={mockPodcasts[0]}
            queue={[]}
            onNext={vi.fn()}
            onRemoveFromQueue={vi.fn()}
            onClearQueue={vi.fn()}
            onClose={vi.fn()}
            onShare={vi.fn()}
            autoPlay={false}
          />
        </div>
      </HashRouter>
    );

    // Find the player
    const player = container.querySelector(".shrink-0.z-50");
    expect(player).toBeTruthy();

    // Find the sidebar
    const sidebar = container.querySelector("aside");
    expect(sidebar).toBeTruthy();

    // Find theme controls
    const sunButton = screen.getByRole("button", {
      name: (name, element) => {
        return element?.querySelector(".fa-sun") !== null;
      },
    });
    const moonButton = screen.getByRole("button", {
      name: (name, element) => {
        return element?.querySelector(".fa-moon") !== null;
      },
    });

    expect(sunButton).toBeVisible();
    expect(moonButton).toBeVisible();

    // Find the codename text
    const codenameElement = screen.getByText(/aurora/i);
    expect(codenameElement).toBeVisible();

    // Check if sidebar and player overlap
    const sidebarRect = sidebar!.getBoundingClientRect();
    const playerRect = player!.getBoundingClientRect();

    // The sidebar should not extend into the player's area
    // Player is at the bottom, so sidebar should end above it
    if (playerRect.top < sidebarRect.bottom) {
      // If they overlap, sidebar content at the bottom should still be accessible
      // by having proper padding or the sidebar should be shorter
      const themeControlsSection = sidebar!.querySelector(
        ".border-t.border-zinc-200"
      );
      const themeRect = themeControlsSection!.getBoundingClientRect();

      // Theme controls should be above the player
      expect(themeRect.bottom).toBeLessThanOrEqual(playerRect.top);
    }
  });

  it("should have proper layout structure with player below main content", () => {
    const { container } = render(
      <HashRouter>
        <div className="h-screen flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MainLayout
              podcasts={mockPodcasts}
              activePodcast={mockPodcasts[0]}
              queueCount={0}
              theme={"dark" as Theme}
              onThemeChange={vi.fn()}
              version={mockVersion}
              errorCount={0}
              onShowStatusPanel={vi.fn()}
              onLoadNewEpisodes={vi.fn()}
              onSyncHistory={vi.fn()}
            >
              <div>Test Content</div>
            </MainLayout>
          </div>
          <PlayerContainer
            episode={mockEpisode}
            podcast={mockPodcasts[0]}
            queue={[]}
            onNext={vi.fn()}
            onRemoveFromQueue={vi.fn()}
            onClearQueue={vi.fn()}
            onClose={vi.fn()}
            onShare={vi.fn()}
            autoPlay={false}
          />
        </div>
      </HashRouter>
    );

    const sidebar = container.querySelector("aside");
    const player = container.querySelector(".shrink-0.z-50");

    expect(sidebar).toBeTruthy();
    expect(player).toBeTruthy();

    // With the new architecture, the player is part of the flex layout
    // so it naturally takes up space below the main content area
    // The sidebar and player should be in separate containers
    const layoutContainer = sidebar?.closest(".overflow-hidden");
    expect(layoutContainer).toBeTruthy();
  });

  it("should position player and layout in a flex column container", () => {
    const { container } = render(
      <HashRouter>
        <div className="h-screen flex flex-col overflow-hidden" data-testid="app-container">
          <div className="flex-1 overflow-hidden" data-testid="layout-wrapper">
            <MainLayout
              podcasts={mockPodcasts}
              activePodcast={mockPodcasts[0]}
              queueCount={0}
              theme={"dark" as Theme}
              onThemeChange={vi.fn()}
              version={mockVersion}
              errorCount={0}
              onShowStatusPanel={vi.fn()}
              onLoadNewEpisodes={vi.fn()}
              onSyncHistory={vi.fn()}
            >
              <div>Test Content</div>
            </MainLayout>
          </div>
          <PlayerContainer
            episode={mockEpisode}
            podcast={mockPodcasts[0]}
            queue={[]}
            onNext={vi.fn()}
            onRemoveFromQueue={vi.fn()}
            onClearQueue={vi.fn()}
            onClose={vi.fn()}
            onShare={vi.fn()}
            autoPlay={false}
          />
        </div>
      </HashRouter>
    );

    // Verify the container structure
    const appContainer = container.querySelector('[data-testid="app-container"]');
    expect(appContainer).toBeTruthy();
    expect(appContainer?.classList.contains("flex")).toBe(true);
    expect(appContainer?.classList.contains("flex-col")).toBe(true);

    // Verify layout wrapper takes flex-1
    const layoutWrapper = container.querySelector('[data-testid="layout-wrapper"]');
    expect(layoutWrapper).toBeTruthy();
    expect(layoutWrapper?.classList.contains("flex-1")).toBe(true);

    // Verify player is a sibling of the layout wrapper (not fixed)
    const player = container.querySelector(".shrink-0.z-50");
    expect(player).toBeTruthy();
    expect(player?.classList.contains("fixed")).toBe(false);
  });
});
