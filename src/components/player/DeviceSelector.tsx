"use client";

import { useState } from "react";
import type { SpotifyDevice } from "@/types";

interface DeviceSelectorProps {
  sessionId: string;
  onDeviceConnected?: (deviceId: string) => void;
}

export function DeviceSelector({ sessionId, onDeviceConnected }: DeviceSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const handleFindDevices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/playback/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to find devices");
      }

      const data = await response.json();

      if (data.availableDevices && data.availableDevices.length > 0) {
        setAvailableDevices(data.availableDevices);
        // Don't pre-select any device - user must explicitly choose
      }
    } catch (err) {
      console.error("Error finding devices:", err);
      setError(err instanceof Error ? err.message : "Failed to find devices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDevice = async (deviceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/playback/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          deviceId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to connect device");
      }

      setSelectedDeviceId(deviceId);
      setIsInitialized(true);
      onDeviceConnected?.(deviceId);
    } catch (err) {
      console.error("Error selecting device:", err);
      setError(err instanceof Error ? err.message : "Failed to connect device");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialized && selectedDeviceId) {
    const connectedDevice = availableDevices.find((d) => d.id === selectedDeviceId);

    return (
      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 rounded-full p-2">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium text-green-400">Device Connected</div>
            <div className="text-sm text-gray-300">
              {connectedDevice?.name || "Spotify Device"} ({connectedDevice?.type || "Unknown"})
            </div>
          </div>
          <button
            onClick={() => {
              setIsInitialized(false);
              setAvailableDevices([]);
              setSelectedDeviceId(null);
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Change Device
          </button>
        </div>
      </div>
    );
  }

  if (availableDevices.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Select a Device</h3>
          <button
            onClick={handleFindDevices}
            disabled={isLoading}
            className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {availableDevices.map((device) => (
            <button
              key={device.id}
              onClick={() => handleSelectDevice(device.id)}
              disabled={isLoading}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                ${
                  device.id === selectedDeviceId
                    ? "bg-green-900/20 border-green-700/50"
                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }
                ${isLoading ? "opacity-50 cursor-wait" : "cursor-pointer"}
              `}
            >
              {/* Device Icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${device.id === selectedDeviceId ? "bg-green-500" : "bg-gray-700"}
              `}>
                <svg className={`w-5 h-5 ${device.id === selectedDeviceId ? "text-white" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                  {device.type === "Computer" ? (
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                  ) : device.type === "Smartphone" ? (
                    <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  )}
                </svg>
              </div>

              {/* Device Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{device.name}</div>
                <div className="text-sm text-gray-400">
                  {device.type}
                  {device.is_active && " • Active"}
                </div>
              </div>

              {/* Selected Indicator */}
              {device.id === selectedDeviceId && (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          Don't see your device? Make sure Spotify is open on the device you want to use.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
        </svg>
      </div>

      <h3 className="font-medium mb-2">Connect a Device</h3>
      <p className="text-sm text-gray-400 mb-4">
        Choose where to play music for this session
      </p>

      <button
        onClick={handleFindDevices}
        disabled={isLoading}
        className="btn-primary disabled:opacity-50 disabled:cursor-wait"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Finding Devices...
          </span>
        ) : (
          "Find Devices"
        )}
      </button>

      <p className="text-xs text-gray-500 mt-3">
        Make sure Spotify is open on at least one device
      </p>
    </div>
  );
}
