import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/component-test-utils';
import { Modal } from '@/components/ui/Modal';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="x-icon">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
}));

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      renderWithProviders(<Modal {...defaultProps} />);

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('renders title in header', () => {
      renderWithProviders(<Modal {...defaultProps} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders children content', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <div>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </div>
        </Modal>
      );

      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });

    it('renders close button with X icon', () => {
      renderWithProviders(<Modal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('renders with backdrop', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);

      const backdrop = container.querySelector('.bg-black\\/70');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders with small size', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} size="sm" />);

      const modal = container.querySelector('.max-w-md');
      expect(modal).toBeInTheDocument();
    });

    it('renders with medium size (default)', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);

      const modal = container.querySelector('.max-w-lg');
      expect(modal).toBeInTheDocument();
    });

    it('renders with large size', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} size="lg" />);

      const modal = container.querySelector('.max-w-2xl');
      expect(modal).toBeInTheDocument();
    });

    it('renders with extra large size', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} size="xl" />);

      const modal = container.querySelector('.max-w-4xl');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      renderWithProviders(<Modal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      const { container } = renderWithProviders(<Modal {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector('.bg-black\\/70');
      await user.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      renderWithProviders(<Modal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText('Modal Content'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      renderWithProviders(<Modal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when other keys are pressed', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      renderWithProviders(<Modal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Enter}');
      await user.keyboard('{Space}');
      await user.keyboard('a');

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Management', () => {
    it('prevents body scroll when modal opens', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('unset');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = renderWithProviders(<Modal {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });

    it('does not set body overflow when modal is not open', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Keyboard Event Listeners', () => {
    it('adds keyboard listener when modal opens', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderWithProviders(<Modal {...defaultProps} isOpen={true} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('removes keyboard listener when modal closes', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { rerender } = renderWithProviders(<Modal {...defaultProps} isOpen={true} />);

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('removes keyboard listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderWithProviders(<Modal {...defaultProps} isOpen={true} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('does not add keyboard listener when closed', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderWithProviders(<Modal {...defaultProps} isOpen={false} />);

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has accessible close button label', () => {
      renderWithProviders(<Modal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('uses heading for title', () => {
      renderWithProviders(<Modal {...defaultProps} title="Accessible Title" />);

      const heading = screen.getByRole('heading', { name: 'Accessible Title' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Animation Classes', () => {
    it('applies fade-in animation to backdrop', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);

      const backdrop = container.querySelector('.animate-fade-in');
      expect(backdrop).toBeInTheDocument();
    });

    it('applies slide-up animation to modal content', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);

      const modal = container.querySelector('.animate-slide-up');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('renders header with border', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);

      const header = container.querySelector('.border-b.border-gray-800');
      expect(header).toBeInTheDocument();
    });

    it('renders scrollable content area', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);

      const content = container.querySelector('.overflow-y-auto');
      expect(content).toBeInTheDocument();
    });

    it('limits modal height to 90vh', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);

      const modal = container.querySelector('.max-h-\\[90vh\\]');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Complex Content', () => {
    it('renders complex nested content', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <div>
            <h3>Nested Heading</h3>
            <p>Paragraph with <strong>bold</strong> text</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </Modal>
      );

      expect(screen.getByText('Nested Heading')).toBeInTheDocument();
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('renders with form elements', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <form>
            <input type="text" placeholder="Test input" />
            <button type="submit">Submit</button>
          </form>
        </Modal>
      );

      expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long title', () => {
      const longTitle = 'A'.repeat(100);
      renderWithProviders(<Modal {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles empty children', () => {
      renderWithProviders(<Modal {...defaultProps}>{null}</Modal>);

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('handles multiple rapid open/close cycles', () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} isOpen={false} />);

      // Open and close multiple times
      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');

      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });

    it('handles onClose callback change', async () => {
      const user = userEvent.setup({ delay: null });
      const firstOnClose = vi.fn();
      const secondOnClose = vi.fn();

      const { rerender } = renderWithProviders(
        <Modal {...defaultProps} onClose={firstOnClose} />
      );

      await user.keyboard('{Escape}');
      expect(firstOnClose).toHaveBeenCalledTimes(1);

      rerender(<Modal {...defaultProps} onClose={secondOnClose} />);

      await user.keyboard('{Escape}');
      expect(secondOnClose).toHaveBeenCalledTimes(1);
      expect(firstOnClose).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });
});
