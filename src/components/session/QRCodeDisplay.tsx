"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  sessionCode: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({
  sessionCode,
  size = 128,
  className = "",
}: QRCodeDisplayProps) {
  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${sessionCode}`;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="bg-white p-3 rounded-lg shadow-md">
        <QRCodeSVG
          value={joinUrl}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Scan to join session
      </p>
    </div>
  );
}
