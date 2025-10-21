import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/component-test-utils';
import { AddTrackModal } from '@/components/queue/AddTrackModal';
import { createMockSpotifyTrack } from '../../factories/spotify.factory';
import { useFetchMock, useConsoleErrorSpy, createMockResponse } from '../../utils/mock-helpers';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => <svg className={className} data-testid="search-icon" />,
  Music: ({ className }: { className?: string }) => <svg className={className} data-testid="music-icon" />,
  Plus: ({ className }: { className?: string }) => <svg className={className} data-testid="plus-icon" />,
  Loader2: ({ className }: { className?: string }) => <svg className={className} data-testid="loader-icon" />,
  X: ({ className }: { className?: string }) => <svg className={className} data-testid="x-icon" />,
}));

describe('AddTrackModal', () => {
  const mockFetch = useFetchMock();
  const mockSessionId = 'test-session-123';
  const mockOnClose = vi.fn();
  const mockOnTrackAdded = vi.fn();

  const mockSearchResults = [
    createMockSpotifyTrack({
      id: 'track-1',
      name: 'Test Track 1',
      artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      duration_ms: 180000,
      album: {
        id: 'album-1',
        name: 'Album 1',
        images: [{ url: 'https://example.com/album1.jpg', height: 640, width: 640 }],
        external_urls: { spotify: '' },
      },
    }),
    createMockSpotifyTrack({
      id: 'track-2',
      name: 'Test Track 2',
      artists: [{ id: 'artist-2', name: 'Artist 2', external_urls: { spotify: '' } }],
      duration_ms: 240000,
      album: {
        id: 'album-2',
        name: 'Album 2',
        images: [{ url: 'https://example.com/album2.jpg', height: 640, width: 640 }],
        external_urls: { spotify: '' },
      },
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal Visibility', () => {
    it('renders when isOpen is true', () => {
      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      expect(screen.getByText('Add Track to Queue')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(
        <AddTrackModal
          isOpen={false}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      expect(screen.queryByText('Add Track to Queue')).not.toBeInTheDocument();
    });

    it('calls onClose when modal is closed', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      // Find and click close button (X button in modal)
      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Initial State', () => {
    it('shows empty state when modal opens', () => {
      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      expect(screen.getByText('Start typing to search for tracks')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search for a track...')).toBeInTheDocument();
    });

    it('focuses search input on mount', () => {
      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      expect(searchInput).toHaveFocus();
    });

    it('does not show error initially', () => {
      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    useConsoleErrorSpy(); // Suppress console.error for error handling tests

    it('updates search input value when typing', async () => {
      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('Test');
      });
    });

    it('debounces search by 500ms', async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: mockSearchResults }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      // Should not call API immediately
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance timer by 500ms and flush promises
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      // Should call API after debounce
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/tracks?q=Test&limit=10'
      );

      vi.useRealTimers();
    });

    it('does not search for queries less than 2 characters', async () => {
      vi.useFakeTimers();

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'T' } });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.getByText('Start typing to search for tracks')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows loading state while searching', async () => {
      vi.useFakeTimers();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test Track' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Searching...')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('displays search results', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: mockSearchResults }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();
      expect(screen.getByText('Test Track 2')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 2')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows no results message when search returns empty', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: [] }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'NonexistentTrack' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('No tracks found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('handles search API error', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Search failed' }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Failed to search tracks. Please try again.')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('handles network error during search', async () => {
      vi.useFakeTimers();
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Failed to search tracks. Please try again.')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('cancels previous search when typing new query', async () => {
      vi.useFakeTimers();
      let searchCount = 0;
      mockFetch.mockImplementation(async () => {
        searchCount++;
        return {
          ok: true,
          json: async () => ({ tracks: mockSearchResults }),
        } as Response;
      });

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');

      // Type first query
      fireEvent.change(searchInput, { target: { value: 'First' } });
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Type second query before first debounce completes
      fireEvent.change(searchInput, { target: { value: 'Second' } });
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      // Only the second search should execute
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/search/tracks?q=Second&limit=10');

      vi.useRealTimers();
    });
  });

  describe('Track Display', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: mockSearchResults }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('displays track names', () => {
      expect(screen.getByText('Test Track 1')).toBeInTheDocument();
      expect(screen.getByText('Test Track 2')).toBeInTheDocument();
    });

    it('displays artist names', () => {
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 2')).toBeInTheDocument();
    });

    it('displays track durations', () => {
      expect(screen.getByText('3:00')).toBeInTheDocument();
      expect(screen.getByText('4:00')).toBeInTheDocument();
    });

    it('displays album artwork', () => {
      const albumImages = screen.getAllByRole('img', { name: /album/i });
      expect(albumImages).toHaveLength(2);
      expect(albumImages[0]).toHaveAttribute('src', 'https://example.com/album1.jpg');
      expect(albumImages[1]).toHaveAttribute('src', 'https://example.com/album2.jpg');
    });

    it('displays Add buttons for each track', () => {
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Adding Tracks', () => {
    useConsoleErrorSpy(); // Suppress console.error for error handling tests

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('adds track to queue when Add button is clicked', async () => {
      // Mock search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tracks: mockSearchResults }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      // Mock add track API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/queue/${mockSessionId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: 'track-1' }),
      });
    });

    it('shows loading state while adding track', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tracks: mockSearchResults }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
        await Promise.resolve();
      });

      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });

    it('calls onTrackAdded callback after successful add', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tracks: mockSearchResults }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
      });

      expect(mockOnTrackAdded).toHaveBeenCalledTimes(1);
    });

    it('closes modal after successful add', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tracks: mockSearchResults }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('clears search results after successful add', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tracks: mockSearchResults }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response);

      const { rerender } = renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
      });

      // Modal should close
      expect(mockOnClose).toHaveBeenCalled();

      // Reopen modal
      rerender(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      // Search should be cleared
      const clearedInput = screen.getByPlaceholderText('Search for a track...');
      expect(clearedInput).toHaveValue('');
    });

    it('handles add track API error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tracks: mockSearchResults }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Track already in queue' }),
        } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
      });

      expect(screen.getByText('Track already in queue')).toBeInTheDocument();

      // Modal should not close on error
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnTrackAdded).not.toHaveBeenCalled();
    });

    it('handles network error during add', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tracks: mockSearchResults }),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('disables add button while adding', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tracks: mockSearchResults }),
        } as Response)
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Test Track 1')).toBeInTheDocument();

      const addButtons = screen.getAllByRole('button', { name: /add/i });

      await act(async () => {
        fireEvent.click(addButtons[0]);
        await Promise.resolve();
      });

      const addingButton = screen.getByRole('button', { name: /adding/i });
      expect(addingButton).toBeDisabled();
    });
  });

  describe('Duration Formatting', () => {
    it('formats durations correctly', async () => {
      vi.useFakeTimers();
      const tracksWithVariedDurations = [
        createMockSpotifyTrack({
          id: 'track-short',
          name: 'Short Track',
          duration_ms: 30000, // 0:30
        }),
        createMockSpotifyTrack({
          id: 'track-long',
          name: 'Long Track',
          duration_ms: 600000, // 10:00
        }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: tracksWithVariedDurations }),
      } as Response);

      renderWithProviders(
        <AddTrackModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          onTrackAdded={mockOnTrackAdded}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a track...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('0:30')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});
