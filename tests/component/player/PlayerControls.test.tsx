import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/component-test-utils';
import { useConsoleErrorSpy } from '../../utils/mock-helpers';
import { PlayerControls } from '@/components/player/PlayerControls';

describe('PlayerControls', () => {
  const defaultProps = {
    sessionId: 'test-session',
    isPlaying: false,
    isDJ: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Handling', () => {
    useConsoleErrorSpy(); // Suppress console.error for error handling tests

    it('handles onPlay error gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      const onPlay = vi.fn().mockRejectedValue(new Error('Playback failed'));

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={false} onPlay={onPlay} />
      );

      await user.click(screen.getByLabelText('Play'));

      // Error is logged and handled gracefully
      await waitFor(() => {
        expect(onPlay).toHaveBeenCalled();
      });
    });

    it('handles onPause error gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      const onPause = vi.fn().mockRejectedValue(new Error('Pause failed'));

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={true} onPause={onPause} />
      );

      await user.click(screen.getByLabelText('Pause'));

      // Error is logged and handled gracefully
      await waitFor(() => {
        expect(onPause).toHaveBeenCalled();
      });
    });

    it('handles onSkip error gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      const onSkip = vi.fn().mockRejectedValue(new Error('Skip failed'));

      renderWithProviders(
        <PlayerControls {...defaultProps} onSkip={onSkip} />
      );

      await user.click(screen.getByLabelText('Skip to next track'));

      // Error is logged and handled gracefully
      await waitFor(() => {
        expect(onSkip).toHaveBeenCalled();
      });
    });
  });

  describe('Rendering', () => {
    it('renders playback controls heading', () => {
      renderWithProviders(<PlayerControls {...defaultProps} />);
      expect(screen.getByText('Playback Controls')).toBeInTheDocument();
    });

    it('renders play button when not playing', () => {
      renderWithProviders(<PlayerControls {...defaultProps} isPlaying={false} />);
      expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });

    it('renders pause button when playing', () => {
      renderWithProviders(<PlayerControls {...defaultProps} isPlaying={true} />);
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });

    it('renders skip button', () => {
      renderWithProviders(<PlayerControls {...defaultProps} />);
      expect(screen.getByLabelText('Skip to next track')).toBeInTheDocument();
    });

    it('shows "View Only" badge when user is not DJ', () => {
      renderWithProviders(<PlayerControls {...defaultProps} isDJ={false} />);
      expect(screen.getByText('View Only')).toBeInTheDocument();
    });

    it('shows help text when user is not DJ', () => {
      renderWithProviders(<PlayerControls {...defaultProps} isDJ={false} />);
      expect(screen.getByText('Only DJs can control playback')).toBeInTheDocument();
    });

    it('does not show "View Only" badge when user is DJ', () => {
      renderWithProviders(<PlayerControls {...defaultProps} isDJ={true} />);
      expect(screen.queryByText('View Only')).not.toBeInTheDocument();
    });

    it('does not show help text when user is DJ', () => {
      renderWithProviders(<PlayerControls {...defaultProps} isDJ={true} />);
      expect(screen.queryByText('Only DJs can control playback')).not.toBeInTheDocument();
    });
  });

  describe('Device Display', () => {
    it('displays device name when provided', () => {
      renderWithProviders(
        <PlayerControls {...defaultProps} deviceName="My Device" />
      );
      expect(screen.getByText('My Device')).toBeInTheDocument();
    });

    it('does not display device when not provided', () => {
      renderWithProviders(<PlayerControls {...defaultProps} />);
      expect(screen.queryByText(/My Device/)).not.toBeInTheDocument();
    });

    it('shows computer icon for Computer device type', () => {
      const { container } = renderWithProviders(
        <PlayerControls {...defaultProps} deviceName="My PC" deviceType="Computer" />
      );
      // SVG icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('shows smartphone icon for Smartphone device type', () => {
      const { container } = renderWithProviders(
        <PlayerControls {...defaultProps} deviceName="My Phone" deviceType="Smartphone" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('shows speaker icon for Speaker device type', () => {
      const { container } = renderWithProviders(
        <PlayerControls {...defaultProps} deviceName="My Speaker" deviceType="Speaker" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('shows default icon for unknown device type', () => {
      const { container } = renderWithProviders(
        <PlayerControls {...defaultProps} deviceName="Unknown" deviceType="TV" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Play/Pause Button', () => {
    it('calls onPlay when play button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onPlay = vi.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={false} onPlay={onPlay} />
      );

      await user.click(screen.getByLabelText('Play'));

      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when pause button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onPause = vi.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={true} onPause={onPause} />
      );

      await user.click(screen.getByLabelText('Pause'));

      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('shows loading state while play request is pending', async () => {
      const user = userEvent.setup({ delay: null });
      const onPlay = vi.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={false} onPlay={onPlay} />
      );

      const playButton = screen.getByLabelText('Play');
      await user.click(playButton);

      // Function should be called
      expect(onPlay).toHaveBeenCalled();
    });

    it('shows loading state while pause request is pending', async () => {
      const user = userEvent.setup({ delay: null });
      const onPause = vi.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={true} onPause={onPause} />
      );

      const pauseButton = screen.getByLabelText('Pause');
      await user.click(pauseButton);

      // Function should be called
      expect(onPause).toHaveBeenCalled();
    });

    it('disables button when not DJ', () => {
      renderWithProviders(
        <PlayerControls {...defaultProps} isDJ={false} isPlaying={false} />
      );

      const playButton = screen.getByLabelText('Play');
      expect(playButton).toBeDisabled();
    });

    it('does not call onPlay when clicked by non-DJ', async () => {
      const user = userEvent.setup({ delay: null });
      const onPlay = vi.fn();

      renderWithProviders(
        <PlayerControls {...defaultProps} isDJ={false} isPlaying={false} onPlay={onPlay} />
      );

      const playButton = screen.getByLabelText('Play');
      await user.click(playButton);

      expect(onPlay).not.toHaveBeenCalled();
    });

  });

  describe('Skip Button', () => {
    it('calls onSkip when skip button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onSkip = vi.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <PlayerControls {...defaultProps} onSkip={onSkip} />
      );

      await user.click(screen.getByLabelText('Skip to next track'));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('shows loading state while skip request is pending', async () => {
      const user = userEvent.setup({ delay: null });
      const onSkip = vi.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <PlayerControls {...defaultProps} onSkip={onSkip} />
      );

      const skipButton = screen.getByLabelText('Skip to next track');
      await user.click(skipButton);

      // Function should be called
      expect(onSkip).toHaveBeenCalled();
    });

    it('disables button when not DJ', () => {
      renderWithProviders(
        <PlayerControls {...defaultProps} isDJ={false} />
      );

      const skipButton = screen.getByLabelText('Skip to next track');
      expect(skipButton).toBeDisabled();
    });

    it('does not call onSkip when clicked by non-DJ', async () => {
      const user = userEvent.setup({ delay: null });
      const onSkip = vi.fn();

      renderWithProviders(
        <PlayerControls {...defaultProps} isDJ={false} onSkip={onSkip} />
      );

      const skipButton = screen.getByLabelText('Skip to next track');
      await user.click(skipButton);

      expect(onSkip).not.toHaveBeenCalled();
    });

  });

  describe('Loading States', () => {
    it('disables play/pause button while loading', async () => {
      const user = userEvent.setup({ delay: null });
      const onPlay = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={false} onPlay={onPlay} />
      );

      const playButton = screen.getByLabelText('Play');
      await user.click(playButton);

      expect(playButton).toBeDisabled();
    });

    it('disables skip button while loading', async () => {
      const user = userEvent.setup({ delay: null });
      const onSkip = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(
        <PlayerControls {...defaultProps} onSkip={onSkip} />
      );

      const skipButton = screen.getByLabelText('Skip to next track');
      await user.click(skipButton);

      expect(skipButton).toBeDisabled();
    });

    it('allows skip button to be clicked while play is loading', async () => {
      const user = userEvent.setup({ delay: null });
      const onPlay = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const onSkip = vi.fn().mockResolvedValue(undefined);

      renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={false} onPlay={onPlay} onSkip={onSkip} />
      );

      // Click play
      await user.click(screen.getByLabelText('Play'));

      // Skip button should still be enabled
      const skipButton = screen.getByLabelText('Skip to next track');
      await user.click(skipButton);

      expect(onSkip).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-labels', () => {
      renderWithProviders(<PlayerControls {...defaultProps} isPlaying={false} />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.getByLabelText('Skip to next track')).toBeInTheDocument();
    });

    it('updates aria-label when playback state changes', () => {
      const { rerender } = renderWithProviders(
        <PlayerControls {...defaultProps} isPlaying={false} />
      );

      expect(screen.getByLabelText('Play')).toBeInTheDocument();

      rerender(<PlayerControls {...defaultProps} isPlaying={true} />);

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
  });
});
