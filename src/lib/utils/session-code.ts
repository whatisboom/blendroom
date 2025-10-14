import { customAlphabet } from "nanoid";

/**
 * Generate a unique session code
 * Format: 6 uppercase alphanumeric characters (e.g., "ABC123")
 * Excludes ambiguous characters: 0, O, I, 1
 */
const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateSessionCode(): string {
  return nanoid();
}

/**
 * Validate session code format
 */
export function isValidSessionCode(code: string): boolean {
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code);
}

/**
 * Format session code for display (e.g., "ABC-123")
 */
export function formatSessionCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Normalize session code input (remove spaces, dashes, convert to uppercase)
 */
export function normalizeSessionCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}
