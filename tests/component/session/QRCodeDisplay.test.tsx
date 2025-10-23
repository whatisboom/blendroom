import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import QRCodeDisplay from "@/components/session/QRCodeDisplay";

// Mock QRCodeSVG from qrcode.react
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <svg data-testid="qr-code" data-value={value} data-size={size} />
  ),
}));

describe("QRCodeDisplay", () => {
  const mockSessionCode = "ABC123";
  const mockOrigin = "https://dev.local:3000";

  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(window, "location", {
      value: {
        origin: mockOrigin,
      },
      writable: true,
    });
  });

  it("renders QR code with correct join URL", () => {
    render(<QRCodeDisplay sessionCode={mockSessionCode} />);

    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toBeInTheDocument();
    expect(qrCode).toHaveAttribute(
      "data-value",
      `${mockOrigin}/join?code=${mockSessionCode}`
    );
  });

  it("renders with default size of 128", () => {
    render(<QRCodeDisplay sessionCode={mockSessionCode} />);

    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute("data-size", "128");
  });

  it("renders with custom size", () => {
    const customSize = 96;
    render(<QRCodeDisplay sessionCode={mockSessionCode} size={customSize} />);

    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute("data-size", customSize.toString());
  });

  it("renders descriptive text", () => {
    render(<QRCodeDisplay sessionCode={mockSessionCode} />);

    expect(screen.getByText("Scan to join session")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const customClass = "custom-class";
    const { container } = render(
      <QRCodeDisplay sessionCode={mockSessionCode} className={customClass} />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass(customClass);
  });

  it("renders white background container for QR code", () => {
    const { container } = render(
      <QRCodeDisplay sessionCode={mockSessionCode} />
    );

    const qrContainer = container.querySelector(".bg-white");
    expect(qrContainer).toBeInTheDocument();
    expect(qrContainer).toHaveClass("p-3", "rounded-lg", "shadow-md");
  });

  it("generates correct URL with different session codes", () => {
    const sessionCode1 = "XYZ789";
    const { rerender } = render(<QRCodeDisplay sessionCode={sessionCode1} />);

    let qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute(
      "data-value",
      `${mockOrigin}/join?code=${sessionCode1}`
    );

    const sessionCode2 = "DEF456";
    rerender(<QRCodeDisplay sessionCode={sessionCode2} />);

    qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute(
      "data-value",
      `${mockOrigin}/join?code=${sessionCode2}`
    );
  });

  it("handles special characters in session code", () => {
    const specialCode = "A-B_C1";
    render(<QRCodeDisplay sessionCode={specialCode} />);

    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute(
      "data-value",
      `${mockOrigin}/join?code=${specialCode}`
    );
  });
});
