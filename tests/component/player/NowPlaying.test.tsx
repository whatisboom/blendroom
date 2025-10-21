import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../utils/component-test-utils';
import { NowPlaying } from '@/components/player/NowPlaying';
import { createMockSpotifyTrack } from '../../factories/spotify.factory';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

describe('NowPlaying', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no track', () => {
      renderWithProviders(<NowPlaying track={null} />);
      expect(screen.getByText('No track playing')).toBeInTheDocument();
    });

    it('shows music icon when no track', () => {
      const { container } = renderWithProviders(<NowPlaying track={null} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('does not show track info when no track', () => {
      renderWithProviders(<NowPlaying track={null} />);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('Track Display', () => {
    it('renders track name', () => {
      const track = createMockSpotifyTrack({ name: 'Test Track' });
      renderWithProviders(<NowPlaying track={track} />);
      expect(screen.getByText('Test Track')).toBeInTheDocument();
    });

    it('renders artist names', () => {
      const track = createMockSpotifyTrack({
        artists: [
          { id: '1', name: 'Artist One', external_urls: { spotify: '' } },
          { id: '2', name: 'Artist Two', external_urls: { spotify: '' } },
        ],
      });
      renderWithProviders(<NowPlaying track={track} />);
      expect(screen.getByText('Artist One, Artist Two')).toBeInTheDocument();
    });

    it('renders single artist name', () => {
      const track = createMockSpotifyTrack({
        artists: [
          { id: '1', name: 'Solo Artist', external_urls: { spotify: '' } },
        ],
      });
      renderWithProviders(<NowPlaying track={track} />);
      expect(screen.getByText('Solo Artist')).toBeInTheDocument();
    });

    it('renders album name', () => {
      const track = createMockSpotifyTrack({
        album: {
          id: 'album-1',
          name: 'Test Album',
          images: [],
          external_urls: { spotify: '' },
        },
      });
      renderWithProviders(<NowPlaying track={track} />);
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('renders Spotify link', () => {
      const track = createMockSpotifyTrack({
        external_urls: { spotify: 'https://open.spotify.com/track/123' },
      });
      renderWithProviders(<NowPlaying track={track} />);

      const link = screen.getByRole('link', { name: /open in spotify/i });
      expect(link).toHaveAttribute('href', 'https://open.spotify.com/track/123');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Album Art', () => {
    it('renders album art when available', () => {
      const track = createMockSpotifyTrack({
        name: 'Test Track',
        album: {
          id: 'album-1',
          name: 'Test Album',
          images: [{ url: 'https://example.com/album.jpg', height: 640, width: 640 }],
          external_urls: { spotify: '' },
        },
      });
      renderWithProviders(<NowPlaying track={track} />);

      const image = screen.getByAltText('Test Track album art');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/album.jpg');
    });

    it('shows fallback icon when no album art', () => {
      const track = createMockSpotifyTrack({
        album: {
          id: 'album-1',
          name: 'Test Album',
          images: [],
          external_urls: { spotify: '' },
        },
      });
      const { container } = renderWithProviders(<NowPlaying track={track} />);

      // Should have multiple SVGs (fallback + spotify icon)
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(1);
    });

    it('uses first image from images array', () => {
      const track = createMockSpotifyTrack({
        name: 'Test Track',
        album: {
          id: 'album-1',
          name: 'Test Album',
          images: [
            { url: 'https://example.com/large.jpg', height: 640, width: 640 },
            { url: 'https://example.com/small.jpg', height: 64, width: 64 },
          ],
          external_urls: { spotify: '' },
        },
      });
      renderWithProviders(<NowPlaying track={track} />);

      const image = screen.getByAltText('Test Track album art');
      expect(image).toHaveAttribute('src', 'https://example.com/large.jpg');
    });
  });

  describe('Playing Indicator', () => {
    it('shows playing indicator when isPlaying is true', () => {
      const track = createMockSpotifyTrack();
      const { container } = renderWithProviders(
        <NowPlaying track={track} isPlaying={true} />
      );

      // Green badge should be visible
      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('does not show playing indicator when isPlaying is false', () => {
      const track = createMockSpotifyTrack();
      const { container } = renderWithProviders(
        <NowPlaying track={track} isPlaying={false} />
      );

      // Green badge should not be visible
      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).not.toBeInTheDocument();
    });

    it('does not show playing indicator by default', () => {
      const track = createMockSpotifyTrack();
      const { container } = renderWithProviders(
        <NowPlaying track={track} />
      );

      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).not.toBeInTheDocument();
    });

    it('does not show playing indicator when no track', () => {
      const { container } = renderWithProviders(
        <NowPlaying track={null} isPlaying={true} />
      );

      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('Multiple Artists', () => {
    it('joins multiple artists with commas', () => {
      const track = createMockSpotifyTrack({
        artists: [
          { id: '1', name: 'Artist 1', external_urls: { spotify: '' } },
          { id: '2', name: 'Artist 2', external_urls: { spotify: '' } },
          { id: '3', name: 'Artist 3', external_urls: { spotify: '' } },
        ],
      });
      renderWithProviders(<NowPlaying track={track} />);
      expect(screen.getByText('Artist 1, Artist 2, Artist 3')).toBeInTheDocument();
    });

    it('handles empty artists array', () => {
      const track = createMockSpotifyTrack({
        artists: [],
      });
      renderWithProviders(<NowPlaying track={track} />);

      // Should still render without crashing
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible link label', () => {
      const track = createMockSpotifyTrack();
      renderWithProviders(<NowPlaying track={track} />);

      const link = screen.getByLabelText('Open in Spotify');
      expect(link).toBeInTheDocument();
    });

    it('has proper alt text for album art', () => {
      const track = createMockSpotifyTrack({
        name: 'My Song',
        album: {
          id: 'album-1',
          name: 'My Album',
          images: [{ url: 'https://example.com/art.jpg', height: 640, width: 640 }],
          external_urls: { spotify: '' },
        },
      });
      renderWithProviders(<NowPlaying track={track} />);

      expect(screen.getByAltText('My Song album art')).toBeInTheDocument();
    });

    it('uses heading for track name', () => {
      const track = createMockSpotifyTrack({ name: 'Test Track' });
      renderWithProviders(<NowPlaying track={track} />);

      const heading = screen.getByRole('heading', { name: 'Test Track' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles track with very long name', () => {
      const longName = 'A'.repeat(200);
      const track = createMockSpotifyTrack({ name: longName });
      renderWithProviders(<NowPlaying track={track} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles track with very long artist names', () => {
      const track = createMockSpotifyTrack({
        artists: [
          { id: '1', name: 'A'.repeat(100), external_urls: { spotify: '' } },
          { id: '2', name: 'B'.repeat(100), external_urls: { spotify: '' } },
        ],
      });
      renderWithProviders(<NowPlaying track={track} />);

      // Should render without crashing
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('handles track with special characters in name', () => {
      const track = createMockSpotifyTrack({
        name: 'Track & "Quotes" <Special>',
      });
      renderWithProviders(<NowPlaying track={track} />);

      expect(screen.getByText('Track & "Quotes" <Special>')).toBeInTheDocument();
    });

    it('handles missing external URLs gracefully', () => {
      const track = createMockSpotifyTrack({
        external_urls: { spotify: '' },
      });
      const { container } = renderWithProviders(<NowPlaying track={track} />);

      // Component should render without crashing
      expect(screen.getByRole('heading')).toBeInTheDocument();

      // Link is rendered but with empty href
      const link = container.querySelector('a[aria-label="Open in Spotify"]');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '');
    });
  });

  describe('Layout', () => {
    it('renders all sections when track is present', () => {
      const track = createMockSpotifyTrack({
        name: 'Test Track',
        artists: [{ id: '1', name: 'Test Artist', external_urls: { spotify: '' } }],
        album: {
          id: 'album-1',
          name: 'Test Album',
          images: [{ url: 'https://example.com/art.jpg', height: 640, width: 640 }],
          external_urls: { spotify: '' },
        },
      });
      renderWithProviders(<NowPlaying track={track} />);

      // All three sections should be present
      expect(screen.getByRole('heading')).toBeInTheDocument(); // Track info
      expect(screen.getByRole('img')).toBeInTheDocument(); // Album art
      expect(screen.getByRole('link')).toBeInTheDocument(); // Spotify link
    });
  });
});
