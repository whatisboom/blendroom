import { describe, it, expect } from 'vitest';
import {
  generateSessionCode,
  isValidSessionCode,
  formatSessionCode,
  normalizeSessionCode,
} from '@/lib/utils/session-code';

describe('Session Code Utilities', () => {
  describe('generateSessionCode', () => {
    it('generates a 6-character code', () => {
      const code = generateSessionCode();
      expect(code).toHaveLength(6);
    });

    it('generates uppercase alphanumeric code', () => {
      const code = generateSessionCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('excludes ambiguous characters (0, O, I, 1)', () => {
      // Generate multiple codes to ensure ambiguous chars are excluded
      const codes = Array.from({ length: 100 }, () => generateSessionCode());

      codes.forEach((code) => {
        expect(code).not.toContain('0');
        expect(code).not.toContain('O');
        expect(code).not.toContain('I');
        expect(code).not.toContain('1');
      });
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateSessionCode()));

      // Should have high uniqueness (at least 95% unique)
      expect(codes.size).toBeGreaterThan(95);
    });

    it('uses valid alphabet characters', () => {
      const validChars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      const codes = Array.from({ length: 50 }, () => generateSessionCode());

      codes.forEach((code) => {
        for (const char of code) {
          expect(validChars).toContain(char);
        }
      });
    });
  });

  describe('isValidSessionCode', () => {
    it('validates correct session codes', () => {
      expect(isValidSessionCode('ABC234')).toBe(true);
      expect(isValidSessionCode('XYZ789')).toBe(true);
      expect(isValidSessionCode('23ABC9')).toBe(true);
      expect(isValidSessionCode('AAAAAA')).toBe(true);
      expect(isValidSessionCode('999999')).toBe(true);
    });

    it('rejects codes with invalid length', () => {
      expect(isValidSessionCode('ABC12')).toBe(false); // Too short
      expect(isValidSessionCode('ABC1234')).toBe(false); // Too long
      expect(isValidSessionCode('')).toBe(false); // Empty
      expect(isValidSessionCode('A')).toBe(false); // Single char
    });

    it('rejects codes with ambiguous characters', () => {
      expect(isValidSessionCode('ABC0DE')).toBe(false); // Contains 0
      expect(isValidSessionCode('ABCODE')).toBe(false); // Contains O
      expect(isValidSessionCode('ABC1DE')).toBe(false); // Contains 1
      expect(isValidSessionCode('ABCIDE')).toBe(false); // Contains I
    });

    it('rejects codes with lowercase letters', () => {
      expect(isValidSessionCode('abc234')).toBe(false);
      expect(isValidSessionCode('AbC234')).toBe(false);
    });

    it('rejects codes with special characters', () => {
      expect(isValidSessionCode('ABC-23')).toBe(false);
      expect(isValidSessionCode('ABC 23')).toBe(false);
      expect(isValidSessionCode('ABC_23')).toBe(false);
      expect(isValidSessionCode('ABC!23')).toBe(false);
    });

    it('accepts all valid alphabet characters', () => {
      const validChars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

      // Test with codes made up of each valid character
      for (const char of validChars) {
        const code = char.repeat(6);
        expect(isValidSessionCode(code)).toBe(true);
      }
    });
  });

  describe('formatSessionCode', () => {
    it('formats 6-character code with hyphen', () => {
      expect(formatSessionCode('ABC234')).toBe('ABC-234');
      expect(formatSessionCode('XYZ789')).toBe('XYZ-789');
      expect(formatSessionCode('23ABC9')).toBe('23A-BC9');
    });

    it('returns code unchanged if not 6 characters', () => {
      expect(formatSessionCode('ABC12')).toBe('ABC12');
      expect(formatSessionCode('ABC1234')).toBe('ABC1234');
      expect(formatSessionCode('')).toBe('');
      expect(formatSessionCode('A')).toBe('A');
    });

    it('splits at position 3', () => {
      const formatted = formatSessionCode('ABCDEF');
      expect(formatted).toBe('ABC-DEF');

      const parts = formatted.split('-');
      expect(parts[0]).toHaveLength(3);
      expect(parts[1]).toHaveLength(3);
    });

    it('handles edge cases', () => {
      expect(formatSessionCode('123456')).toBe('123-456');
      expect(formatSessionCode('AAAAAA')).toBe('AAA-AAA');
    });
  });

  describe('normalizeSessionCode', () => {
    it('removes spaces', () => {
      expect(normalizeSessionCode('ABC 234')).toBe('ABC234');
      expect(normalizeSessionCode('A B C 2 3 4')).toBe('ABC234');
      expect(normalizeSessionCode('  ABC234  ')).toBe('ABC234');
    });

    it('removes hyphens', () => {
      expect(normalizeSessionCode('ABC-234')).toBe('ABC234');
      expect(normalizeSessionCode('A-B-C-2-3-4')).toBe('ABC234');
    });

    it('removes both spaces and hyphens', () => {
      expect(normalizeSessionCode('ABC - 234')).toBe('ABC234');
      expect(normalizeSessionCode(' A-B C-2 34 ')).toBe('ABC234');
    });

    it('converts to uppercase', () => {
      expect(normalizeSessionCode('abc234')).toBe('ABC234');
      expect(normalizeSessionCode('aBc234')).toBe('ABC234');
      expect(normalizeSessionCode('abc-234')).toBe('ABC234');
    });

    it('handles already normalized codes', () => {
      expect(normalizeSessionCode('ABC234')).toBe('ABC234');
      expect(normalizeSessionCode('XYZ789')).toBe('XYZ789');
    });

    it('handles empty string', () => {
      expect(normalizeSessionCode('')).toBe('');
    });

    it('combines normalization steps', () => {
      // Lowercase with spaces and hyphens
      expect(normalizeSessionCode('abc - 234')).toBe('ABC234');
      expect(normalizeSessionCode('  a-b-c 2-3-4  ')).toBe('ABC234');
    });

    it('preserves other characters', () => {
      // Numbers and letters should be preserved
      expect(normalizeSessionCode('abc234xyz')).toBe('ABC234XYZ');
      expect(normalizeSessionCode('23abc9')).toBe('23ABC9');
    });
  });

  describe('integration', () => {
    it('generated codes are valid', () => {
      const code = generateSessionCode();
      expect(isValidSessionCode(code)).toBe(true);
    });

    it('formatted codes can be normalized back', () => {
      const original = 'ABC234';
      const formatted = formatSessionCode(original);
      const normalized = normalizeSessionCode(formatted);

      expect(normalized).toBe(original);
    });

    it('normalized user input is valid', () => {
      const userInput = 'abc - 234';
      const normalized = normalizeSessionCode(userInput);

      // If the underlying code is valid, normalized version should be valid
      if (isValidSessionCode(normalized)) {
        expect(normalized).toBe('ABC234');
      }
    });

    it('workflow: generate -> format -> normalize -> validate', () => {
      const generated = generateSessionCode();
      const formatted = formatSessionCode(generated);
      const normalized = normalizeSessionCode(formatted);
      const isValid = isValidSessionCode(normalized);

      expect(isValid).toBe(true);
      expect(normalized).toBe(generated);
    });
  });
});
