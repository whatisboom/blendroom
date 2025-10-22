import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { Toast, ToastContainer } from '@/components/ui/Toast';
import { ToastProvider, useToast } from '@/components/ui/ToastProvider';
import { useState } from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="x-icon" />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon" />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="alert-circle-icon" />
  ),
  Info: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="info-icon" />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="alert-triangle-icon" />
  ),
}));

// Mock nanoid with unique IDs
let nanoidCounter = 0;
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `test-toast-id-${nanoidCounter++}`),
}));

describe('Toast Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders success toast', () => {
      render(
        <Toast
          id="1"
          type="success"
          message="Success message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('renders error toast', () => {
      render(
        <Toast
          id="1"
          type="error"
          message="Error message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('renders info toast', () => {
      render(
        <Toast
          id="1"
          type="info"
          message="Info message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('renders warning toast', () => {
      render(
        <Toast
          id="1"
          type="warning"
          message="Warning message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(
        <Toast
          id="1"
          type="success"
          message="Main message"
          description="Additional details"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Main message')).toBeInTheDocument();
      expect(screen.getByText('Additional details')).toBeInTheDocument();
    });

    it('renders without description', () => {
      render(
        <Toast
          id="1"
          type="success"
          message="Main message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Main message')).toBeInTheDocument();
    });

    it('has role="alert"', () => {
      const { container } = render(
        <Toast
          id="1"
          type="success"
          message="Message"
          onClose={mockOnClose}
        />
      );

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <Toast
          id="test-id"
          type="success"
          message="Message"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close notification');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledWith('test-id');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('auto-closes after duration', async () => {
      vi.useFakeTimers();

      render(
        <Toast
          id="test-id"
          type="success"
          message="Message"
          duration={3000}
          onClose={mockOnClose}
        />
      );

      expect(mockOnClose).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnClose).toHaveBeenCalledWith('test-id');
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('uses default duration of 5000ms', async () => {
      vi.useFakeTimers();

      render(
        <Toast
          id="test-id"
          type="success"
          message="Message"
          onClose={mockOnClose}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(4999);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('does not auto-close when duration is 0', async () => {
      vi.useFakeTimers();

      render(
        <Toast
          id="test-id"
          type="success"
          message="Message"
          duration={0}
          onClose={mockOnClose}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockOnClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('clears timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <Toast
          id="test-id"
          type="success"
          message="Message"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Styling', () => {
    it('applies success styles', () => {
      const { container } = render(
        <Toast
          id="1"
          type="success"
          message="Message"
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('.bg-green-900\\/90');
      expect(toast).toBeInTheDocument();
    });

    it('applies error styles', () => {
      const { container } = render(
        <Toast
          id="1"
          type="error"
          message="Message"
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('.bg-red-900\\/90');
      expect(toast).toBeInTheDocument();
    });

    it('applies info styles', () => {
      const { container } = render(
        <Toast
          id="1"
          type="info"
          message="Message"
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('.bg-blue-900\\/90');
      expect(toast).toBeInTheDocument();
    });

    it('applies warning styles', () => {
      const { container } = render(
        <Toast
          id="1"
          type="warning"
          message="Message"
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('.bg-yellow-900\\/90');
      expect(toast).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible close button label', () => {
      render(
        <Toast
          id="1"
          type="success"
          message="Message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
    });
  });
});

describe('ToastContainer', () => {
  it('renders children', () => {
    render(
      <ToastContainer>
        <div>Toast 1</div>
        <div>Toast 2</div>
      </ToastContainer>
    );

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('applies fixed positioning', () => {
    const { container } = render(
      <ToastContainer>
        <div>Content</div>
      </ToastContainer>
    );

    const fixedContainer = container.querySelector('.fixed.top-4.right-4');
    expect(fixedContainer).toBeInTheDocument();
  });
});

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper component to test useToast hook
  function ToastTester() {
    const toast = useToast();

    return (
      <div>
        <button onClick={() => toast.success('Success!')}>Show Success</button>
        <button onClick={() => toast.error('Error!')}>Show Error</button>
        <button onClick={() => toast.info('Info!')}>Show Info</button>
        <button onClick={() => toast.warning('Warning!')}>Show Warning</button>
        <button onClick={() => toast.success('With description', 'Details here')}>
          Show With Description
        </button>
      </div>
    );
  }

  it('renders children', () => {
    render(
      <ToastProvider>
        <div>App Content</div>
      </ToastProvider>
    );

    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('shows success toast', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('shows error toast', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
  });

  it('shows info toast', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info!')).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('shows warning toast', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning!')).toBeInTheDocument();
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
  });

  it('shows toast with description', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show With Description'));

    expect(screen.getByText('With description')).toBeInTheDocument();
    expect(screen.getByText('Details here')).toBeInTheDocument();
  });

  it('shows multiple toasts', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Success'));
    await user.click(screen.getByText('Show Error'));

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('removes toast when dismissed', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    await user.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success!')).toBeInTheDocument();

    const closeButton = screen.getByLabelText('Close notification');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });
  });

  it('auto-removes toast after duration', async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success!')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Success!')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('uses correct default durations', async () => {
    function DurationTester() {
      const toast = useToast();
      const [lastDuration, setLastDuration] = useState<number | null>(null);

      return (
        <div>
          <button
            onClick={() => {
              toast.success('Success');
              setLastDuration(5000);
            }}
          >
            Success
          </button>
          <button
            onClick={() => {
              toast.error('Error');
              setLastDuration(7000);
            }}
          >
            Error
          </button>
          <button
            onClick={() => {
              toast.info('Info');
              setLastDuration(5000);
            }}
          >
            Info
          </button>
          <button
            onClick={() => {
              toast.warning('Warning');
              setLastDuration(6000);
            }}
          >
            Warning
          </button>
          {lastDuration && <div>Duration: {lastDuration}</div>}
        </div>
      );
    }

    render(
      <ToastProvider>
        <DurationTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Duration: 5000')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Error'));
    expect(screen.getByText('Duration: 7000')).toBeInTheDocument();
  });

  it('throws error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadComponent() {
      useToast();
      return <div>Bad</div>;
    }

    expect(() => {
      render(<BadComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleErrorSpy.mockRestore();
  });

  it('handles rapid toast creation', () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    // Click multiple times rapidly
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getAllByRole('alert')).toHaveLength(3);
  });
});
