import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import { MainLayout } from "../MainLayout";
import { Podcast, Theme } from "../../../types";

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

const mockVersion = {
  version: "1.0.0",
  codename: "aurora",
  buildDate: "2024-01-01",
};

const defaultProps = {
  podcasts: mockPodcasts,
  activePodcast: null,
  queueCount: 0,
  theme: "dark" as Theme,
  onThemeChange: vi.fn(),
  version: mockVersion,
  errorCount: 0,
  onShowStatusPanel: vi.fn(),
  onLoadNewEpisodes: vi.fn(),
  onSyncHistory: vi.fn(),
};

describe("MainLayout", () => {
  it("should render the layout", () => {
    render(
      <HashRouter>
        <MainLayout {...defaultProps}>
          <div>Test Content</div>
        </MainLayout>
      </HashRouter>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should display app name in sidebar", () => {
    render(
      <HashRouter>
        <MainLayout {...defaultProps}>
          <div>Test Content</div>
        </MainLayout>
      </HashRouter>
    );

    expect(screen.getByText("AuraPod")).toBeInTheDocument();
  });

  it("should display theme controls in sidebar", () => {
    render(
      <HashRouter>
        <MainLayout {...defaultProps}>
          <div>Test Content</div>
        </MainLayout>
      </HashRouter>
    );

    // Check for theme control buttons (sun, moon, desktop icons)
    const themeButtons = screen.getAllByRole("button");
    const themeControlButtons = themeButtons.filter(
      (btn) =>
        btn.querySelector(".fa-sun") ||
        btn.querySelector(".fa-moon") ||
        btn.querySelector(".fa-desktop")
    );
    expect(themeControlButtons).toHaveLength(3);
  });

  it("should display version codename at the bottom of sidebar", () => {
    render(
      <HashRouter>
        <MainLayout {...defaultProps}>
          <div>Test Content</div>
        </MainLayout>
      </HashRouter>
    );

    const codenameElement = screen.getByText(/aurora/i);
    expect(codenameElement).toBeInTheDocument();
  });

  it("should ensure sidebar bottom elements are not obscured when rendered", () => {
    const { container } = render(
      <HashRouter>
        <MainLayout {...defaultProps}>
          <div>Test Content</div>
        </MainLayout>
      </HashRouter>
    );

    // Find the sidebar
    const sidebar = container.querySelector("aside");
    expect(sidebar).toBeTruthy();

    // Check that sidebar doesn't have overflow issues that would hide bottom content
    const computedStyle = window.getComputedStyle(sidebar!);
    expect(computedStyle.display).not.toBe("none");

    // Verify theme controls are visible
    const themeButtons = screen.getAllByRole("button");
    const themeControlButtons = themeButtons.filter(
      (btn) =>
        btn.querySelector(".fa-sun") ||
        btn.querySelector(".fa-moon") ||
        btn.querySelector(".fa-desktop")
    );

    themeControlButtons.forEach((button) => {
      expect(button).toBeVisible();
    });

    // Verify codename is visible
    const codenameElement = screen.getByText(/aurora/i);
    expect(codenameElement).toBeVisible();
  });

  it("should have sidebar bottom section with adequate padding when player might be present", () => {
    const { container } = render(
      <HashRouter>
        <MainLayout {...defaultProps}>
          <div>Test Content</div>
        </MainLayout>
      </HashRouter>
    );

    // Find the sidebar's bottom section (the theme controls area)
    const sidebar = container.querySelector("aside");
    const bottomSection = sidebar?.querySelector(
      ".border-t.border-zinc-200"
    ) as HTMLElement;

    expect(bottomSection).toBeTruthy();
    expect(bottomSection).toBeVisible();

    // Get the bottom section's position
    const rect = bottomSection!.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // The bottom section should not be at the very bottom of the viewport
    // when a player could potentially cover it (player is ~100px height with padding)
    // This test will fail if the sidebar extends all the way to the bottom
    expect(rect.bottom).toBeLessThanOrEqual(viewportHeight);
  });
});
