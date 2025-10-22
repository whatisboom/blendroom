import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/component-test-utils';
import { DeviceSelector } from '@/components/player/DeviceSelector';
import type { SpotifyDevice } from '@/types';
import { useFetchMock, createMockResponse, useConsoleErrorSpy } from '../../utils/mock-helpers';

describe('DeviceSelector', () => {
  const mockFetch = useFetchMock();
  const mockSessionId = 'test-session-123';
  const mockDevices: SpotifyDevice[] = [
    {
      id: 'device-1',
      name: 'My Laptop',
      type: 'Computer',
      is_active: true,
      is_private_session: false,
      is_restricted: false,
      volume_percent: 50,
      supports_volume: true,
    },
    {
      id: 'device-2',
      name: 'My Phone',
      type: 'Smartphone',
      is_active: false,
      is_private_session: false,
      is_restricted: false,
      volume_percent: 75,
      supports_volume: true,
    },
    {
      id: 'device-3',
      name: 'Living Room Speaker',
      type: 'Speaker',
      is_active: false,
      is_private_session: false,
      is_restricted: false,
      volume_percent: 100,
      supports_volume: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('renders initial connect device prompt', () => {
      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      expect(screen.getByText('Connect a Device')).toBeInTheDocument();
      expect(screen.getByText('Choose where to play music for this session')).toBeInTheDocument();
      expect(screen.getByText('Find Devices')).toBeInTheDocument();
    });

    it('shows help text about opening Spotify', () => {
      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      expect(screen.getByText('Make sure Spotify is open on at least one device')).toBeInTheDocument();
    });

    it('renders speaker icon', () => {
      const { container } = renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('does not show error initially', () => {
      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Finding Devices', () => {
    useConsoleErrorSpy();

    it('shows loading state when finding devices', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      const findButton = screen.getByText('Find Devices');
      await user.click(findButton);

      expect(screen.getByText('Finding Devices...')).toBeInTheDocument();

      // The button itself should be disabled
      const loadingButton = screen.getByText('Finding Devices...').closest('button');
      expect(loadingButton).toBeDisabled();
    });

    it('calls API with correct sessionId', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockResolvedValue(
        createMockResponse({ availableDevices: mockDevices })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/playback/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: mockSessionId }),
        });
      });
    });

    it('displays found devices', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockResolvedValue(
        createMockResponse({ availableDevices: mockDevices })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
        expect(screen.getByText('My Phone')).toBeInTheDocument();
        expect(screen.getByText('Living Room Speaker')).toBeInTheDocument();
      });
    });

    it('shows device types', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockResolvedValue(
        createMockResponse({ availableDevices: mockDevices })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        // Device types may be combined with " • Active" text or device names
        const computerElements = screen.getAllByText(/Computer/);
        expect(computerElements.length).toBeGreaterThan(0);

        const smartphoneElements = screen.getAllByText(/Smartphone/);
        expect(smartphoneElements.length).toBeGreaterThan(0);

        const speakerElements = screen.getAllByText(/Speaker/);
        expect(speakerElements.length).toBeGreaterThan(0);
      });
    });

    it('shows active indicator for active device', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockResolvedValue(
        createMockResponse({ availableDevices: mockDevices })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('Computer • Active')).toBeInTheDocument();
      });
    });

    it('handles API error', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockResolvedValue(
        createMockResponse({ error: 'No devices found' }, { ok: false })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('No devices found')).toBeInTheDocument();
      });

    });

    it('handles network error', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

    });

    it('handles non-Error exceptions', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockRejectedValue('Unknown error');

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('Failed to find devices')).toBeInTheDocument();
      });

    });

    it('handles empty device list', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockResolvedValue(
        createMockResponse({ availableDevices: [] })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      // Should still show initial state
      await waitFor(() => {
        expect(screen.getByText('Connect a Device')).toBeInTheDocument();
      });
    });

    it('clears previous error when finding devices again', async () => {
      const user = userEvent.setup({ delay: null });

      // First call fails
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'First error' }, { ok: false })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ availableDevices: mockDevices })
      );

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

    });
  });

  describe('Device List View', () => {
    beforeEach(async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockResolvedValue(
        createMockResponse({ availableDevices: mockDevices })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);
      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });
    });

    it('shows "Select a Device" heading', () => {
      expect(screen.getByText('Select a Device')).toBeInTheDocument();
    });

    it('shows refresh button', () => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('shows help text about missing devices', () => {
      expect(screen.getByText("Don't see your device? Make sure Spotify is open on the device you want to use.")).toBeInTheDocument();
    });

    it('renders device buttons', () => {
      const deviceButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('My Laptop') ||
        btn.textContent?.includes('My Phone') ||
        btn.textContent?.includes('Living Room Speaker')
      );

      expect(deviceButtons).toHaveLength(3);
    });

    it('shows different icons for different device types', () => {
      const { container } = renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      // Component should have SVG icons for Computer, Smartphone, and Speaker
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Device Selection', () => {
    useConsoleErrorSpy();

    it('calls API with device ID when device is selected', async () => {
      const user = userEvent.setup({ delay: null });

      // First call to find devices
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ availableDevices: mockDevices })
      );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);
      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      // Second call to select device
      mockFetch.mockResolvedValueOnce(
        createMockResponse({})
      );

      const laptopButton = screen.getByText('My Laptop').closest('button');
      await user.click(laptopButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/playback/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: mockSessionId, deviceId: 'device-1' }),
        });
      });
    });

    it('shows connected state after successful selection', async () => {
      const user = userEvent.setup({ delay: null });

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockResolvedValueOnce(
          createMockResponse({})
        );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);
      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      const laptopButton = screen.getByText('My Laptop').closest('button');
      await user.click(laptopButton!);

      await waitFor(() => {
        expect(screen.getByText('Device Connected')).toBeInTheDocument();
        expect(screen.getByText('My Laptop (Computer)')).toBeInTheDocument();
      });
    });

    it('calls onDeviceConnected callback', async () => {
      const user = userEvent.setup({ delay: null });
      const onDeviceConnected = vi.fn();

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockResolvedValueOnce(
          createMockResponse({})
        );

      renderWithProviders(
        <DeviceSelector sessionId={mockSessionId} onDeviceConnected={onDeviceConnected} />
      );

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      const laptopButton = screen.getByText('My Laptop').closest('button');
      await user.click(laptopButton!);

      await waitFor(() => {
        expect(onDeviceConnected).toHaveBeenCalledWith('device-1');
      });
    });

    it('handles selection error', async () => {
      const user = userEvent.setup({ delay: null });

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockResolvedValueOnce(
          createMockResponse({ error: 'Failed to connect device' }, { ok: false })
        );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      const laptopButton = screen.getByText('My Laptop').closest('button');
      await user.click(laptopButton!);

      await waitFor(() => {
        expect(screen.getByText('Failed to connect device')).toBeInTheDocument();
      });

    });

    it('shows loading state during selection', async () => {
      const user = userEvent.setup({ delay: null });

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      const laptopButton = screen.getByText('My Laptop').closest('button');
      await user.click(laptopButton!);

      // Buttons should be disabled during loading
      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn).toBeDisabled();
      });
    });

    it('does not call callback if onDeviceConnected is not provided', async () => {
      const user = userEvent.setup({ delay: null });

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockResolvedValueOnce(
          createMockResponse({})
        );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      const laptopButton = screen.getByText('My Laptop').closest('button');
      await user.click(laptopButton!);

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Device Connected')).toBeInTheDocument();
      });
    });
  });

  describe('Connected State', () => {
    beforeEach(async () => {
      const user = userEvent.setup({ delay: null });

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockResolvedValueOnce(
          createMockResponse({})
        );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);
      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      const laptopButton = screen.getByText('My Laptop').closest('button');
      await user.click(laptopButton!);

      await waitFor(() => {
        expect(screen.getByText('Device Connected')).toBeInTheDocument();
      });
    });

    it('shows connected device info', () => {
      expect(screen.getByText('Device Connected')).toBeInTheDocument();
      expect(screen.getByText('My Laptop (Computer)')).toBeInTheDocument();
    });

    it('shows success indicator with green styling', () => {
      // The connected state should have green-themed visual elements
      const connectedText = screen.getByText('Device Connected');
      const containerDiv = connectedText.closest('.bg-green-900\\/20');
      expect(containerDiv).toBeInTheDocument();
    });

    it('shows change device button', () => {
      expect(screen.getByText('Change Device')).toBeInTheDocument();
    });

    it('returns to device selection when change device is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      const changeButton = screen.getByText('Change Device');
      await user.click(changeButton);

      expect(screen.queryByText('Device Connected')).not.toBeInTheDocument();
      expect(screen.getByText('Connect a Device')).toBeInTheDocument();
    });

    it('clears device list when changing device', async () => {
      const user = userEvent.setup({ delay: null });

      const changeButton = screen.getByText('Change Device');
      await user.click(changeButton);

      expect(screen.queryByText('My Laptop')).not.toBeInTheDocument();
      expect(screen.queryByText('My Phone')).not.toBeInTheDocument();
    });

    it('handles missing device name gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      const devicesWithoutName: SpotifyDevice[] = [{
        id: 'device-no-name',
        name: '',
        type: 'Computer',
        is_active: false,
        is_private_session: false,
        is_restricted: false,
        volume_percent: 50,
        supports_volume: true,
      }];

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: devicesWithoutName })
        )
        .mockResolvedValueOnce(
          createMockResponse({})
        );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        // Device type should be visible even without name
        expect(screen.getByText('Computer')).toBeInTheDocument();
        // Should show device selection view
        expect(screen.getByText('Select a Device')).toBeInTheDocument();
      });

      // Find device button by its containing Computer text
      const allButtons = screen.getAllByRole('button');
      const deviceButton = allButtons.find(btn =>
        btn.textContent?.includes('Computer') &&
        !btn.textContent?.includes('Refresh')
      );

      expect(deviceButton).toBeDefined();
      await user.click(deviceButton!);

      await waitFor(() => {
        // When connected, should show fallback name
        expect(screen.getByText('Spotify Device (Computer)')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refetches devices when refresh is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      // Use mockResolvedValueOnce for each call
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        );

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      await user.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Devices should still be shown after refresh
      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });
    });

    it('shows "Refreshing..." text while refreshing', async () => {
      const user = userEvent.setup({ delay: null });

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Refresh'));

      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });

    it('disables refresh button while loading', async () => {
      const user = userEvent.setup({ delay: null });

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ availableDevices: mockDevices })
        )
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      await user.click(screen.getByText('Find Devices'));

      await waitFor(() => {
        expect(screen.getByText('My Laptop')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible buttons', () => {
      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      const findButton = screen.getByRole('button', { name: /find devices/i });
      expect(findButton).toBeInTheDocument();
    });

    it('disables buttons with proper attributes when loading', async () => {
      const user = userEvent.setup({ delay: null });
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<DeviceSelector sessionId={mockSessionId} />);

      const findButton = screen.getByText('Find Devices');
      await user.click(findButton);

      expect(findButton).toBeDisabled();
      expect(findButton).toHaveClass('disabled:opacity-50');
    });
  });
});
