import { describe, it, expect, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../utils/component-test-utils';
import { useTimerTestLifecycle } from '../../utils/test-lifecycle';
import { ProgressBar } from '@/components/player/ProgressBar';

describe('ProgressBar', () => {
  useTimerTestLifecycle();

  describe('Time Formatting', () => {
    it('formats seconds correctly', () => {
      renderWithProviders(
        <ProgressBar progressMs={5000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('0:05')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('formats minutes and seconds with padding', () => {
      renderWithProviders(
        <ProgressBar progressMs={65000} durationMs={245000} isPlaying={false} />
      );

      expect(screen.getByText('1:05')).toBeInTheDocument();
      expect(screen.getByText('4:05')).toBeInTheDocument();
    });

    it('handles zero time', () => {
      renderWithProviders(
        <ProgressBar progressMs={0} durationMs={0} isPlaying={false} />
      );

      const timeDisplays = screen.getAllByText('0:00');
      expect(timeDisplays).toHaveLength(2);
    });

    it('formats long durations correctly', () => {
      renderWithProviders(
        <ProgressBar progressMs={600000} durationMs={3600000} isPlaying={false} />
      );

      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('60:00')).toBeInTheDocument();
    });

    it('pads single-digit seconds with zero', () => {
      renderWithProviders(
        <ProgressBar progressMs={3000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('0:03')).toBeInTheDocument();
    });

    it('does not pad double-digit seconds', () => {
      renderWithProviders(
        <ProgressBar progressMs={15000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('0:15')).toBeInTheDocument();
    });
  });

  describe('Initial Rendering', () => {
    it('renders progress bar at 0%', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={0} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('renders progress bar at 50%', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={90000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('renders progress bar at 100%', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={180000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('renders progress bar at 25%', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={45000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '25%' });
    });

    it('renders progress bar at 75%', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={135000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });
  });

  describe('Auto-Increment When Playing', () => {
    it('increments progress every second when playing', async () => {
      renderWithProviders(
        <ProgressBar progressMs={0} durationMs={180000} isPlaying={true} />
      );

      // Initial state
      expect(screen.getByText('0:00')).toBeInTheDocument();

      // Advance 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('0:01')).toBeInTheDocument();

      // Advance another second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('0:02')).toBeInTheDocument();
    });

    it('does not increment when paused', async () => {
      renderWithProviders(
        <ProgressBar progressMs={5000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('0:05')).toBeInTheDocument();

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Time should not change
      expect(screen.getByText('0:05')).toBeInTheDocument();
    });

    it('updates progress bar width while playing', async () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={0} durationMs={10000} isPlaying={true} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '0%' });

      // Advance 5 seconds (50% of 10 seconds)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const updatedBar = container.querySelector('.bg-gradient-to-r');
      expect(updatedBar).toHaveStyle({ width: '50%' });
    });

    it('stops incrementing at duration', async () => {
      renderWithProviders(
        <ProgressBar progressMs={8000} durationMs={10000} isPlaying={true} />
      );

      expect(screen.getByText('0:08')).toBeInTheDocument();

      // Advance 5 seconds (should only go to 10 seconds max)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Both current time and duration show 0:10
      const timeElements = screen.getAllByText('0:10');
      expect(timeElements).toHaveLength(2);

      // Verify it doesn't go past duration
      expect(screen.queryByText('0:11')).not.toBeInTheDocument();
      expect(screen.queryByText('0:12')).not.toBeInTheDocument();
    });

    it('clamps progress at 100% when at duration', async () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={9000} durationMs={10000} isPlaying={true} />
      );

      // Advance past duration
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Progress Updates', () => {
    it('updates when progressMs prop changes', () => {
      const { rerender } = renderWithProviders(
        <ProgressBar progressMs={5000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('0:05')).toBeInTheDocument();

      rerender(
        <ProgressBar progressMs={30000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('updates when durationMs prop changes', () => {
      const { rerender } = renderWithProviders(
        <ProgressBar progressMs={60000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('3:00')).toBeInTheDocument();

      rerender(
        <ProgressBar progressMs={60000} durationMs={240000} isPlaying={false} />
      );

      expect(screen.getByText('4:00')).toBeInTheDocument();
    });

    it('resets to new progressMs when prop changes while playing', async () => {
      const { rerender } = renderWithProviders(
        <ProgressBar progressMs={0} durationMs={60000} isPlaying={true} />
      );

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByText('0:03')).toBeInTheDocument();

      // Update progressMs (simulate seeking)
      rerender(
        <ProgressBar progressMs={30000} durationMs={60000} isPlaying={true} />
      );

      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('continues incrementing from new progress after prop update', async () => {
      const { rerender } = renderWithProviders(
        <ProgressBar progressMs={5000} durationMs={60000} isPlaying={true} />
      );

      // Update progress
      rerender(
        <ProgressBar progressMs={10000} durationMs={60000} isPlaying={true} />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();

      // Should continue from 10 seconds
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('0:11')).toBeInTheDocument();
    });
  });

  describe('Play/Pause Transitions', () => {
    it('stops incrementing when isPlaying changes to false', async () => {
      const { rerender } = renderWithProviders(
        <ProgressBar progressMs={5000} durationMs={60000} isPlaying={true} />
      );

      // Advance while playing
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText('0:07')).toBeInTheDocument();

      // Pause
      rerender(
        <ProgressBar progressMs={7000} durationMs={60000} isPlaying={false} />
      );

      // Advance time while paused
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Should still show 7 seconds
      expect(screen.getByText('0:07')).toBeInTheDocument();
    });

    it('starts incrementing when isPlaying changes to true', async () => {
      const { rerender } = renderWithProviders(
        <ProgressBar progressMs={10000} durationMs={60000} isPlaying={false} />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();

      // Start playing
      rerender(
        <ProgressBar progressMs={10000} durationMs={60000} isPlaying={true} />
      );

      // Should increment
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('0:11')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero duration', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={0} durationMs={0} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '0%' });
      expect(screen.getAllByText('0:00')).toHaveLength(2);
    });

    it('handles progress equal to duration', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={180000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '100%' });
      expect(screen.getAllByText('3:00')).toHaveLength(2);
    });

    it('handles very small durations', () => {
      renderWithProviders(
        <ProgressBar progressMs={500} durationMs={1000} isPlaying={false} />
      );

      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText('0:01')).toBeInTheDocument();
    });

    it('handles very long durations', () => {
      renderWithProviders(
        <ProgressBar progressMs={3600000} durationMs={7200000} isPlaying={false} />
      );

      expect(screen.getByText('60:00')).toBeInTheDocument();
      expect(screen.getByText('120:00')).toBeInTheDocument();
    });

    it('handles fractional milliseconds', () => {
      renderWithProviders(
        <ProgressBar progressMs={5500} durationMs={180000} isPlaying={false} />
      );

      // Should floor to 5 seconds
      expect(screen.getByText('0:05')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('renders current time on the left', () => {
      renderWithProviders(
        <ProgressBar progressMs={30000} durationMs={180000} isPlaying={false} />
      );

      const timeElements = screen.getAllByText(/\d:\d{2}/);
      expect(timeElements.length).toBeGreaterThanOrEqual(2);
    });

    it('renders duration on the right', () => {
      renderWithProviders(
        <ProgressBar progressMs={30000} durationMs={180000} isPlaying={false} />
      );

      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders progress bar container', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={30000} durationMs={180000} isPlaying={false} />
      );

      const progressBarContainer = container.querySelector('.bg-gray-200');
      expect(progressBarContainer).toBeInTheDocument();
    });

    it('renders filled progress indicator', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={30000} durationMs={180000} isPlaying={false} />
      );

      const progressFill = container.querySelector('.bg-gradient-to-r');
      expect(progressFill).toBeInTheDocument();
    });
  });

  describe('Percentage Calculations', () => {
    it('calculates 0% correctly', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={0} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('calculates 33.33% correctly', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={60000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });
    });

    it('calculates 66.67% correctly', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={120000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '66.66666666666666%' });
    });

    it('calculates 100% correctly', () => {
      const { container } = renderWithProviders(
        <ProgressBar progressMs={180000} durationMs={180000} isPlaying={false} />
      );

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });
});
