import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/component-test-utils';
import { SessionSettingsModal } from '@/components/session/SessionSettingsModal';
import type { SessionSettings } from '@/types/session';
import { useFetchMock, createMockResponse, useConsoleErrorSpy } from '../../utils/mock-helpers';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Save: ({ className }: { className?: string }) => <svg className={className} data-testid="save-icon" />,
  Loader2: ({ className }: { className?: string }) => <svg className={className} data-testid="loader-icon" />,
  X: ({ className }: { className?: string }) => <svg className={className} data-testid="x-icon" />,
}));

describe('SessionSettingsModal', () => {
  const mockFetch = useFetchMock();
  const mockSessionId = 'test-session-123';
  const mockOnClose = vi.fn();
  const mockOnSettingsUpdated = vi.fn();

  const mockCurrentSettings: SessionSettings = {
    voteToSkip: false,
    skipThreshold: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal Visibility', () => {
    it('renders when isOpen is true', () => {
      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByText('Session Settings')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(
        <SessionSettingsModal
          isOpen={false}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.queryByText('Session Settings')).not.toBeInTheDocument();
    });

    it('calls onClose when modal is closed', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Initial State', () => {
    it('displays current vote to skip setting', () => {
      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByText('Vote to Skip')).toBeInTheDocument();
      expect(screen.getByText('Allow participants to vote for skipping tracks')).toBeInTheDocument();

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('displays vote to skip as enabled when current setting is true', () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 5,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('does not show skip threshold when vote to skip is disabled', () => {
      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.queryByText('Skip Threshold')).not.toBeInTheDocument();
    });

    it('shows skip threshold when vote to skip is enabled', () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 5,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByText('Skip Threshold')).toBeInTheDocument();
      expect(screen.getByText('Number of votes needed to skip a track')).toBeInTheDocument();
    });

    it('displays current skip threshold value', () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 7,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('disables save button when no changes', () => {
      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('does not show error initially', () => {
      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });
  });

  describe('Vote to Skip Toggle', () => {
    it('toggles vote to skip when clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('shows skip threshold when vote to skip is toggled on', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.queryByText('Skip Threshold')).not.toBeInTheDocument();

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(screen.getByText('Skip Threshold')).toBeInTheDocument();
    });

    it('hides skip threshold when vote to skip is toggled off', async () => {
      const user = userEvent.setup();
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 5,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByText('Skip Threshold')).toBeInTheDocument();

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(screen.queryByText('Skip Threshold')).not.toBeInTheDocument();
    });

    it('enables save button when vote to skip is changed', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Skip Threshold Slider', () => {
    it('updates skip threshold value when slider is changed', async () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 3,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '10' } });

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('enables save button when skip threshold is changed', async () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 3,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '5' } });

      expect(saveButton).not.toBeDisabled();
    });

    it('has correct min and max values', () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 5,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '1');
      expect(slider).toHaveAttribute('max', '20');
    });
  });

  describe('Cancel Button', () => {
    it('renders cancel button', () => {
      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('is disabled while saving', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Cancel should be disabled
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Save Functionality', () => {
    useConsoleErrorSpy();

    it('saves settings when save button is clicked', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(
        createMockResponse({})
      );

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Enable vote to skip
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/session/${mockSessionId}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voteToSkip: true,
            skipThreshold: 3,
          }),
        });
      });
    });

    it('saves updated skip threshold', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(
        createMockResponse({})
      );

      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 3,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Change threshold
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '8' } });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/session/${mockSessionId}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voteToSkip: true,
            skipThreshold: 8,
          }),
        });
      });
    });

    it('shows loading state while saving', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('disables save button while saving', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        const savingButton = screen.getByRole('button', { name: /saving/i });
        expect(savingButton).toBeDisabled();
      });
    });

    it('calls onSettingsUpdated after successful save', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(
        createMockResponse({})
      );

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSettingsUpdated).toHaveBeenCalledTimes(1);
      });
    });

    it('closes modal after successful save', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(
        createMockResponse({})
      );

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('handles save API error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(
        createMockResponse({ error: 'Unauthorized' }, { ok: false })
      );

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      });

      // Modal should not close on error
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnSettingsUpdated).not.toHaveBeenCalled();
    });

    it('handles network error during save', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('handles non-Error exceptions', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValue('Unknown error');

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update settings')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles skip threshold at minimum value', () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 1,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('handles skip threshold at maximum value', () => {
      const enabledSettings: SessionSettings = {
        voteToSkip: true,
        skipThreshold: 20,
      };

      renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={enabledSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('resets to initial values when reopened after canceling', async () => {
      const user = userEvent.setup();

      const { rerender } = renderWithProviders(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Make a change
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Close modal
      rerender(
        <SessionSettingsModal
          isOpen={false}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Reopen modal
      rerender(
        <SessionSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId={mockSessionId}
          currentSettings={mockCurrentSettings}
          onSettingsUpdated={mockOnSettingsUpdated}
        />
      );

      // Should be back to initial state
      const reopenedCheckbox = screen.getByRole('checkbox');
      expect(reopenedCheckbox).not.toBeChecked();
    });
  });
});
