import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerContainer } from "../Player/PlayerContainer";
import { Episode, Podcast } from "../../types";

// Mock services
vi.mock("../../services/storageService", () => ({
  storageService: {
    updatePlayback: vi.fn(),
    getHistory: vi.fn(() => ({})),
  },
}));

describe("PlayerContainer", () => {
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

  const mockPodcast: Podcast = {
    id: "pod1",
    title: "Test Podcast",
    author: "Test Author",
    image: "https://example.com/podcast.jpg",
    feedUrl: "https://example.com/feed.xml",
    description: "Test podcast description",
  };

  const defaultProps = {
    episode: mockEpisode,
    podcast: mockPodcast,
    queue: [],
    onNext: vi.fn(),
    onRemoveFromQueue: vi.fn(),
    onClearQueue: vi.fn(),
    onClose: vi.fn(),
    onShare: vi.fn(),
    onProgress: vi.fn(),
    onReady: vi.fn(),
    autoPlay: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the player component", () => {
    const { container } = render(<PlayerContainer {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it("should render as part of the layout flow (not fixed)", () => {
    const { container } = render(<PlayerContainer {...defaultProps} />);
    const playerWrapper = container.querySelector(".shrink-0.z-50");

    expect(playerWrapper).toBeTruthy();
    expect(playerWrapper?.classList.contains("shrink-0")).toBe(true);
    expect(playerWrapper?.classList.contains("fixed")).toBe(false);
    expect(playerWrapper?.classList.contains("z-50")).toBe(true);
  });

  it("should display episode title", () => {
    render(<PlayerContainer {...defaultProps} />);
    expect(screen.getByText("Test Episode")).toBeInTheDocument();
  });

  it("should display podcast title", () => {
    render(<PlayerContainer {...defaultProps} />);
    expect(screen.getByText("Test Podcast")).toBeInTheDocument();
  });

  it("should have play/pause controls", () => {
    render(<PlayerContainer {...defaultProps} />);
    const playButton = screen.getByRole("button", { name: "Play" });
    expect(playButton).toBeInTheDocument();
  });

  it("should have skip forward button", () => {
    render(<PlayerContainer {...defaultProps} />);
    const skipButton = screen.getByRole("button", { name: /skip forward/i });
    expect(skipButton).toBeInTheDocument();
  });

  it("should have skip backward button", () => {
    render(<PlayerContainer {...defaultProps} />);
    const skipButton = screen.getByRole("button", { name: /skip back/i });
    expect(skipButton).toBeInTheDocument();
  });

  it("should display close button", () => {
    render(<PlayerContainer {...defaultProps} />);
    const closeButton = screen.getByRole("button", { name: /close|×/i });
    expect(closeButton).toBeInTheDocument();
  });

  it("should show queue button when queue has items", () => {
    const propsWithQueue = {
      ...defaultProps,
      queue: [mockEpisode],
    };
    render(<PlayerContainer {...propsWithQueue} />);
    const queueButton = screen.getByRole("button", { name: /queue|list/i });
    expect(queueButton).toBeInTheDocument();
  });
});
