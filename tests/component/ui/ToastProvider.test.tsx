import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/component-test-utils';
import { ToastProvider, useToast } from '@/components/ui/ToastProvider';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: ({ className }: { className?: string }) => <svg className={className} data-testid="x-icon" />,
  CheckCircle2: ({ className }: { className?: string }) => <svg className={className} data-testid="check-icon" />,
  AlertCircle: ({ className }: { className?: string }) => <svg className={className} data-testid="alert-icon" />,
  Info: ({ className }: { className?: string }) => <svg className={className} data-testid="info-icon" />,
  AlertTriangle: ({ className }: { className?: string }) => <svg className={className} data-testid="warning-icon" />,
}));

// Test component that uses the toast hook
function TestComponent() {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
      <button onClick={() => toast.success('With description', 'This is a description')}>
        Show With Description
      </button>
      <button onClick={() => toast.success('Custom duration', undefined, 1000)}>
        Show Custom Duration
      </button>
    </div>
  );
}

// Component to test hook error
function InvalidComponent() {
  const toast = useToast();
  return <div>{toast ? 'Has toast' : 'No toast'}</div>;
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Provider Setup', () => {
    it('renders children', () => {
      renderWithProviders(
        <ToastProvider>
          <div>Test content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('provides toast context to children', () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByText('Show Success')).toBeInTheDocument();
      expect(screen.getByText('Show Error')).toBeInTheDocument();
      expect(screen.getByText('Show Info')).toBeInTheDocument();
      expect(screen.getByText('Show Warning')).toBeInTheDocument();
    });

    it('renders toast container', () => {
      const { container } = renderWithProviders(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      // Toast container should exist
      const toastContainer = container.querySelector('[class*="fixed"]');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('useToast Hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderWithProviders(<InvalidComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleErrorSpy.mockRestore();
    });

    it('provides all toast methods', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // All buttons should be present
      expect(screen.getByText('Show Success')).toBeInTheDocument();
      expect(screen.getByText('Show Error')).toBeInTheDocument();
      expect(screen.getByText('Show Info')).toBeInTheDocument();
      expect(screen.getByText('Show Warning')).toBeInTheDocument();
    });
  });

  describe('Success Toast', () => {
    it('shows success toast when success method is called', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });
    });

    it('displays correct icon for success toast', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      await waitFor(() => {
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      });
    });

    it('displays alert role for accessibility', async () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('shows success toast with description', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show With Description'));

      await waitFor(() => {
        expect(screen.getByText('With description')).toBeInTheDocument();
        expect(screen.getByText('This is a description')).toBeInTheDocument();
      });
    });

    it('uses default duration for success toast', () => {
      vi.useFakeTimers();

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Auto-dismiss after 5 seconds (default duration)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('uses custom duration when provided', () => {
      vi.useFakeTimers();

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Custom Duration'));

      expect(screen.getByText('Custom duration')).toBeInTheDocument();

      // Auto-dismiss after 1 second (custom duration)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Error Toast', () => {
    it('shows error toast when error method is called', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Error'));

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });

    it('displays correct icon for error toast', async () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Error'));

      await waitFor(() => {
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      });
    });

    it('shows error toast with description', async () => {
      function ErrorWithDescComponent() {
        const toast = useToast();
        return <button onClick={() => toast.error('Error title', 'Error details')}>Show Error With Desc</button>;
      }

      renderWithProviders(
        <ToastProvider>
          <ErrorWithDescComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Error With Desc'));

      await waitFor(() => {
        expect(screen.getByText('Error title')).toBeInTheDocument();
        expect(screen.getByText('Error details')).toBeInTheDocument();
      });
    });

    it('uses custom duration for error toast', () => {
      vi.useFakeTimers();

      function CustomErrorComponent() {
        const toast = useToast();
        return <button onClick={() => toast.error('Custom error', undefined, 2000)}>Show Custom Error</button>;
      }

      renderWithProviders(
        <ToastProvider>
          <CustomErrorComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Custom Error'));

      expect(screen.getByText('Custom error')).toBeInTheDocument();

      // Should dismiss after 2 seconds (custom duration)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Custom error')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('uses default duration for error toast', () => {
      vi.useFakeTimers();

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Auto-dismiss after 7 seconds (default duration for errors)
      act(() => {
        vi.advanceTimersByTime(7000);
      });

      expect(screen.queryByText('Error message')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Info Toast', () => {
    it('shows info toast when info method is called', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Info'));

      await waitFor(() => {
        expect(screen.getByText('Info message')).toBeInTheDocument();
      });
    });

    it('displays correct icon for info toast', async () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Info'));

      await waitFor(() => {
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
      });
    });

    it('shows info toast with description', async () => {
      function InfoWithDescComponent() {
        const toast = useToast();
        return <button onClick={() => toast.info('Info title', 'Info details')}>Show Info With Desc</button>;
      }

      renderWithProviders(
        <ToastProvider>
          <InfoWithDescComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Info With Desc'));

      await waitFor(() => {
        expect(screen.getByText('Info title')).toBeInTheDocument();
        expect(screen.getByText('Info details')).toBeInTheDocument();
      });
    });

    it('uses default duration for info toast', () => {
      vi.useFakeTimers();

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info message')).toBeInTheDocument();

      // Auto-dismiss after 5 seconds (default duration)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Info message')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Warning Toast', () => {
    it('shows warning toast when warning method is called', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Warning'));

      await waitFor(() => {
        expect(screen.getByText('Warning message')).toBeInTheDocument();
      });
    });

    it('displays correct icon for warning toast', async () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Warning'));

      await waitFor(() => {
        expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      });
    });

    it('shows warning toast with description', async () => {
      function WarningWithDescComponent() {
        const toast = useToast();
        return <button onClick={() => toast.warning('Warning title', 'Warning details')}>Show Warning With Desc</button>;
      }

      renderWithProviders(
        <ToastProvider>
          <WarningWithDescComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Warning With Desc'));

      await waitFor(() => {
        expect(screen.getByText('Warning title')).toBeInTheDocument();
        expect(screen.getByText('Warning details')).toBeInTheDocument();
      });
    });

    it('uses custom duration for warning toast', () => {
      vi.useFakeTimers();

      function CustomWarningComponent() {
        const toast = useToast();
        return <button onClick={() => toast.warning('Custom warning', undefined, 3000)}>Show Custom Warning</button>;
      }

      renderWithProviders(
        <ToastProvider>
          <CustomWarningComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Custom Warning'));

      expect(screen.getByText('Custom warning')).toBeInTheDocument();

      // Should dismiss after 3 seconds (custom duration)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Custom warning')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('uses default duration for warning toast', () => {
      vi.useFakeTimers();

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();

      // Auto-dismiss after 6 seconds (default duration for warnings)
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(screen.queryByText('Warning message')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Multiple Toasts', () => {
    it('shows multiple toasts at once', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Info'));

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
        expect(screen.getByText('Info message')).toBeInTheDocument();
      });
    });

    it('dismisses toasts independently', () => {
      vi.useFakeTimers();

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Show multiple toasts
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Success toast dismisses after 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Error toast dismisses after another 2 seconds (7 total)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Error message')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Manual Dismiss', () => {
    it('allows manual dismissal of toasts', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('can dismiss specific toast among multiple', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });

      // Close buttons
      const closeButtons = screen.getAllByLabelText(/close/i);
      expect(closeButtons).toHaveLength(2);

      // Click first close button
      fireEvent.click(closeButtons[0]);

      await waitFor(() => {
        // One toast should be dismissed
        const remainingCloseButtons = screen.getAllByLabelText(/close/i);
        expect(remainingCloseButtons).toHaveLength(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid successive toast creation', async () => {

      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Rapidly click multiple times
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Success'));

      await waitFor(() => {
        const successMessages = screen.getAllByText('Success message');
        expect(successMessages).toHaveLength(3);
      });
    });

    it('handles empty message', async () => {
      function EmptyMessageComponent() {
        const toast = useToast();
        return <button onClick={() => toast.success('')}>Show Empty</button>;
      }


      renderWithProviders(
        <ToastProvider>
          <EmptyMessageComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Empty'));

      // Should still create toast even with empty message
      await waitFor(() => {
        const closeButton = screen.getByLabelText(/close/i);
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('handles very long messages', async () => {
      function LongMessageComponent() {
        const toast = useToast();
        const longMessage = 'A'.repeat(500);
        return <button onClick={() => toast.success(longMessage)}>Show Long</button>;
      }


      renderWithProviders(
        <ToastProvider>
          <LongMessageComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Long'));

      await waitFor(() => {
        const longText = screen.getByText('A'.repeat(500));
        expect(longText).toBeInTheDocument();
      });
    });

    it('handles special characters in messages', async () => {
      function SpecialCharsComponent() {
        const toast = useToast();
        return (
          <button onClick={() => toast.success('Test & "quotes" <html>')}>
            Show Special
          </button>
        );
      }


      renderWithProviders(
        <ToastProvider>
          <SpecialCharsComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Special'));

      await waitFor(() => {
        expect(screen.getByText('Test & "quotes" <html>')).toBeInTheDocument();
      });
    });
  });
});
