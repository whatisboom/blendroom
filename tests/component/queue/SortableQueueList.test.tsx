import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../utils/component-test-utils';
import { SortableQueueList } from '@/components/queue/SortableQueueList';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  GripVertical: ({ size }: { size?: number }) => (
    <svg data-testid="grip-icon" width={size} height={size} />
  ),
}));

// Mock @dnd-kit packages
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr, from, to) => {
    const newArr = [...arr];
    const [item] = newArr.splice(from, 1);
    newArr.splice(to, 0, item);
    return newArr;
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

describe('SortableQueueList', () => {
  const mockQueue = [
    {
      track: {
        id: 'track-1',
        name: 'Track One',
        artists: [{ id: 'artist-1', name: 'Artist One' }],
        album: {
          name: 'Album One',
          images: [{ url: 'https://example.com/album1.jpg' }],
        },
        duration_ms: 210000, // 3:30
      },
      position: 0,
      addedBy: 'user-1',
      addedAt: Date.now(),
      isStable: true,
    },
    {
      track: {
        id: 'track-2',
        name: 'Track Two',
        artists: [
          { id: 'artist-2', name: 'Artist Two' },
          { id: 'artist-3', name: 'Artist Three' },
        ],
        album: {
          name: 'Album Two',
          images: [{ url: 'https://example.com/album2.jpg' }],
        },
        duration_ms: 195000, // 3:15
      },
      position: 1,
      addedBy: 'user-2',
      addedAt: Date.now(),
      isStable: false,
    },
    {
      track: {
        id: 'track-3',
        name: 'Track Three',
        artists: [{ id: 'artist-4', name: 'Artist Four' }],
        album: {
          name: 'Album Three',
          images: [],
        },
        duration_ms: 180000, // 3:00
      },
      position: 2,
      addedBy: 'user-3',
      addedAt: Date.now(),
      isStable: false,
    },
  ];

  const defaultProps = {
    queue: mockQueue,
    sessionId: 'test-session',
    isDJ: true,
    isSessionOwner: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders all queue items', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      expect(screen.getByText('Track One')).toBeInTheDocument();
      expect(screen.getByText('Track Two')).toBeInTheDocument();
      expect(screen.getByText('Track Three')).toBeInTheDocument();
    });

    it('renders track artists', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      expect(screen.getByText('Artist One')).toBeInTheDocument();
      expect(screen.getByText('Artist Two, Artist Three')).toBeInTheDocument();
      expect(screen.getByText('Artist Four')).toBeInTheDocument();
    });

    it('renders position numbers', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders album art when available', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', 'https://example.com/album1.jpg');
      expect(images[0]).toHaveAttribute('alt', 'Album One');
      expect(images[1]).toHaveAttribute('src', 'https://example.com/album2.jpg');
    });

    it('handles missing album art gracefully', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      // Should have 2 images (first two tracks), third track has no images
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
    });

    it('formats duration correctly', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      expect(screen.getByText(/3:30/)).toBeInTheDocument();
      expect(screen.getByText(/3:15/)).toBeInTheDocument();
      expect(screen.getByText(/3:00/)).toBeInTheDocument();
    });

    it('shows stable indicator for stable tracks', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      expect(screen.getByText('Stable')).toBeInTheDocument();
    });

    it('applies stable track styling', () => {
      const { container } = renderWithProviders(<SortableQueueList {...defaultProps} />);

      const stableTrack = container.querySelector('.bg-green-900\\/20');
      expect(stableTrack).toBeInTheDocument();
    });
  });

  describe('DJ Permissions', () => {
    it('shows drag handle for DJ users', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} isDJ={true} />);

      // Should have drag handles (grip icons)
      const gripIcons = screen.getAllByTestId('grip-icon');
      expect(gripIcons.length).toBeGreaterThan(0);
    });

    it('does not show drag handle for non-DJ users', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} isDJ={false} />);

      // Should not have any drag handles
      expect(screen.queryByTestId('grip-icon')).not.toBeInTheDocument();
    });

    it('allows session owner to see drag handle on stable tracks', () => {
      renderWithProviders(
        <SortableQueueList {...defaultProps} isDJ={true} isSessionOwner={true} />
      );

      // Session owner should see drag handles even on stable tracks
      const gripIcons = screen.getAllByTestId('grip-icon');
      expect(gripIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty Queue', () => {
    it('renders empty state when queue is empty', () => {
      const { container } = renderWithProviders(
        <SortableQueueList {...defaultProps} queue={[]} />
      );

      const queueContainer = container.querySelector('.space-y-2');
      expect(queueContainer).toBeInTheDocument();
      expect(queueContainer?.children).toHaveLength(0);
    });
  });

  describe('Duration Formatting', () => {
    it('formats short durations correctly', () => {
      const shortQueue = [
        {
          ...mockQueue[0],
          track: {
            ...mockQueue[0].track,
            id: 'short-track',
            duration_ms: 5000, // 0:05
          },
        },
      ];

      renderWithProviders(<SortableQueueList {...defaultProps} queue={shortQueue} />);

      expect(screen.getByText(/0:05/)).toBeInTheDocument();
    });

    it('formats long durations correctly', () => {
      const longQueue = [
        {
          ...mockQueue[0],
          track: {
            ...mockQueue[0].track,
            id: 'long-track',
            duration_ms: 3665000, // 61:05
          },
        },
      ];

      renderWithProviders(<SortableQueueList {...defaultProps} queue={longQueue} />);

      expect(screen.getByText(/61:05/)).toBeInTheDocument();
    });

    it('pads seconds with leading zero', () => {
      const queue = [
        {
          ...mockQueue[0],
          track: {
            ...mockQueue[0].track,
            id: 'padded-track',
            duration_ms: 125000, // 2:05
          },
        },
      ];

      renderWithProviders(<SortableQueueList {...defaultProps} queue={queue} />);

      expect(screen.getByText(/2:05/)).toBeInTheDocument();
    });
  });

  describe('Multiple Artists', () => {
    it('joins multiple artists with commas', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      expect(screen.getByText('Artist Two, Artist Three')).toBeInTheDocument();
    });

    it('handles single artist', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      expect(screen.getByText('Artist One')).toBeInTheDocument();
    });

    it('handles many artists', () => {
      const manyArtistsQueue = [
        {
          ...mockQueue[0],
          track: {
            ...mockQueue[0].track,
            artists: [
              { id: '1', name: 'A1' },
              { id: '2', name: 'A2' },
              { id: '3', name: 'A3' },
              { id: '4', name: 'A4' },
            ],
          },
        },
      ];

      renderWithProviders(<SortableQueueList {...defaultProps} queue={manyArtistsQueue} />);

      expect(screen.getByText('A1, A2, A3, A4')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long track names', () => {
      const longNameQueue = [
        {
          ...mockQueue[0],
          track: {
            ...mockQueue[0].track,
            name: 'A'.repeat(200),
          },
        },
      ];

      renderWithProviders(<SortableQueueList {...defaultProps} queue={longNameQueue} />);

      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('handles tracks with special characters', () => {
      const specialCharsQueue = [
        {
          ...mockQueue[0],
          track: {
            ...mockQueue[0].track,
            name: 'Track & "Name" <Special>',
          },
        },
      ];

      renderWithProviders(
        <SortableQueueList {...defaultProps} queue={specialCharsQueue} />
      );

      expect(screen.getByText('Track & "Name" <Special>')).toBeInTheDocument();
    });

    it('handles queue with single item', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} queue={[mockQueue[0]]} />);

      expect(screen.getByText('Track One')).toBeInTheDocument();
      expect(screen.queryByText('Track Two')).not.toBeInTheDocument();
    });

    it('handles queue with all stable tracks', () => {
      const allStableQueue = mockQueue.map((item) => ({
        ...item,
        isStable: true,
      }));

      renderWithProviders(<SortableQueueList {...defaultProps} queue={allStableQueue} />);

      const stableLabels = screen.getAllByText('Stable');
      expect(stableLabels).toHaveLength(3);
    });

    it('handles queue with no stable tracks', () => {
      const noStableQueue = mockQueue.map((item) => ({
        ...item,
        isStable: false,
      }));

      renderWithProviders(<SortableQueueList {...defaultProps} queue={noStableQueue} />);

      expect(screen.queryByText('Stable')).not.toBeInTheDocument();
    });
  });

  describe('Play From Queue', () => {
    it('calls onPlayFromQueue when track is clicked', () => {
      const onPlayFromQueue = vi.fn();

      renderWithProviders(
        <SortableQueueList {...defaultProps} onPlayFromQueue={onPlayFromQueue} />
      );

      const trackName = screen.getByText('Track One');
      trackName.click();

      expect(onPlayFromQueue).toHaveBeenCalledWith(0);
    });

    it('does not call onPlayFromQueue when prop not provided', () => {
      renderWithProviders(<SortableQueueList {...defaultProps} />);

      const trackName = screen.getByText('Track One');
      trackName.click();

      // Should not throw error
      expect(trackName).toBeInTheDocument();
    });

    it('calls onPlayFromQueue with correct position for each track', () => {
      const onPlayFromQueue = vi.fn();

      renderWithProviders(
        <SortableQueueList {...defaultProps} onPlayFromQueue={onPlayFromQueue} />
      );

      screen.getByText('Track One').click();
      expect(onPlayFromQueue).toHaveBeenCalledWith(0);

      screen.getByText('Track Two').click();
      expect(onPlayFromQueue).toHaveBeenCalledWith(1);

      screen.getByText('Track Three').click();
      expect(onPlayFromQueue).toHaveBeenCalledWith(2);
    });

    it('shows hover effect when onPlayFromQueue is provided and user is DJ', () => {
      const { container } = renderWithProviders(
        <SortableQueueList {...defaultProps} isDJ={true} onPlayFromQueue={vi.fn()} />
      );

      const clickableTrack = container.querySelector('.cursor-pointer');
      expect(clickableTrack).toBeInTheDocument();
    });

    it('does not show hover effect when user is not DJ', () => {
      const { container } = renderWithProviders(
        <SortableQueueList {...defaultProps} isDJ={false} onPlayFromQueue={vi.fn()} />
      );

      const clickableTrack = container.querySelector('.cursor-pointer');
      expect(clickableTrack).not.toBeInTheDocument();
    });
  });
});
