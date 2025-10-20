import { describe, it, expect } from 'vitest';
import {
  calculateAverageFeatures,
  calculateFeatureDistance,
  matchesProfile,
  blendFeatures,
} from '@/lib/algorithm/audio-features';
import type { AudioFeatures } from '@/types';

describe('Audio Features Algorithm', () => {
  const createMockFeatures = (overrides?: Partial<AudioFeatures>): AudioFeatures => ({
    id: 'test-track',
    danceability: 0.5,
    energy: 0.6,
    valence: 0.7,
    tempo: 120,
    acousticness: 0.3,
    instrumentalness: 0.1,
    liveness: 0.2,
    loudness: -5,
    speechiness: 0.05,
    key: 0,
    mode: 1,
    time_signature: 4,
    duration_ms: 180000,
    ...overrides,
  });

  describe('calculateAverageFeatures', () => {
    it('calculates average of multiple features', () => {
      const features = [
        createMockFeatures({ danceability: 0.4, energy: 0.5, tempo: 100 }),
        createMockFeatures({ danceability: 0.6, energy: 0.7, tempo: 140 }),
      ];

      const average = calculateAverageFeatures(features);

      expect(average.danceability).toBe(0.5);
      expect(average.energy).toBe(0.6);
      expect(average.tempo).toBe(120);
      expect(average.id).toBe('average');
    });

    it('returns same values for single feature', () => {
      const features = [
        createMockFeatures({ danceability: 0.8, energy: 0.9, valence: 0.6 }),
      ];

      const average = calculateAverageFeatures(features);

      expect(average.danceability).toBe(0.8);
      expect(average.energy).toBe(0.9);
      expect(average.valence).toBe(0.6);
    });

    it('rounds discrete values (key, mode, time_signature)', () => {
      const features = [
        createMockFeatures({ key: 0, mode: 0, time_signature: 4 }),
        createMockFeatures({ key: 1, mode: 1, time_signature: 3 }),
        createMockFeatures({ key: 2, mode: 1, time_signature: 4 }),
      ];

      const average = calculateAverageFeatures(features);

      // Average would be 1, 0.666, 3.666 - should round to integers
      expect(average.key).toBe(1);
      expect(average.mode).toBe(1); // rounds 0.666... to 1
      expect(average.time_signature).toBe(4); // rounds 3.666... to 4
    });

    it('throws error for empty array', () => {
      expect(() => calculateAverageFeatures([])).toThrow(
        'Cannot calculate average of empty features array'
      );
    });

    it('averages all numeric properties correctly', () => {
      const features = [
        createMockFeatures({
          danceability: 0.2,
          energy: 0.3,
          valence: 0.4,
          tempo: 80,
          acousticness: 0.5,
          instrumentalness: 0.6,
          speechiness: 0.1,
          loudness: -10,
        }),
        createMockFeatures({
          danceability: 0.8,
          energy: 0.9,
          valence: 0.6,
          tempo: 160,
          acousticness: 0.1,
          instrumentalness: 0.2,
          speechiness: 0.3,
          loudness: -2,
        }),
      ];

      const average = calculateAverageFeatures(features);

      expect(average.danceability).toBe(0.5);
      expect(average.energy).toBe(0.6);
      expect(average.valence).toBe(0.5);
      expect(average.tempo).toBe(120);
      expect(average.acousticness).toBe(0.3);
      expect(average.instrumentalness).toBe(0.4);
      expect(average.speechiness).toBe(0.2);
      expect(average.loudness).toBe(-6);
    });
  });

  describe('calculateFeatureDistance', () => {
    it('returns 0 for identical features', () => {
      const features = createMockFeatures();
      const distance = calculateFeatureDistance(features, features);

      expect(distance).toBe(0);
    });

    it('calculates distance between different features', () => {
      const a = createMockFeatures({
        danceability: 0.8,
        energy: 0.9,
        valence: 0.7,
        tempo: 140,
      });

      const b = createMockFeatures({
        danceability: 0.2,
        energy: 0.3,
        valence: 0.1,
        tempo: 80,
      });

      const distance = calculateFeatureDistance(a, b);

      expect(distance).toBeGreaterThan(0);
    });

    it('normalizes tempo to 0-1 scale', () => {
      const a = createMockFeatures({ tempo: 60 }); // Min tempo
      const b = createMockFeatures({ tempo: 200 }); // Max tempo

      const distance = calculateFeatureDistance(a, b);

      // Distance should be calculated with normalized tempo
      expect(distance).toBeGreaterThan(0);
    });

    it('normalizes loudness to 0-1 scale', () => {
      const a = createMockFeatures({ loudness: -60 }); // Min loudness
      const b = createMockFeatures({ loudness: 0 }); // Max loudness

      const distance = calculateFeatureDistance(a, b);

      expect(distance).toBeGreaterThan(0);
    });

    it('applies feature weights correctly', () => {
      // High-weight features (danceability, energy) should have more impact
      const a1 = createMockFeatures({ danceability: 0.0, energy: 0.5 });
      const b1 = createMockFeatures({ danceability: 1.0, energy: 0.5 });

      // Low-weight feature (speechiness)
      const a2 = createMockFeatures({ speechiness: 0.0, energy: 0.5 });
      const b2 = createMockFeatures({ speechiness: 1.0, energy: 0.5 });

      const highWeightDistance = calculateFeatureDistance(a1, b1);
      const lowWeightDistance = calculateFeatureDistance(a2, b2);

      // Danceability difference should create larger distance than speechiness
      expect(highWeightDistance).toBeGreaterThan(lowWeightDistance);
    });

    it('is symmetric (distance A to B equals distance B to A)', () => {
      const a = createMockFeatures({ danceability: 0.8, energy: 0.9 });
      const b = createMockFeatures({ danceability: 0.2, energy: 0.3 });

      const distanceAB = calculateFeatureDistance(a, b);
      const distanceBA = calculateFeatureDistance(b, a);

      expect(distanceAB).toBe(distanceBA);
    });

    it('handles extreme values gracefully', () => {
      const a = createMockFeatures({
        danceability: 0,
        energy: 0,
        valence: 0,
        tempo: 60,
        loudness: -60,
      });

      const b = createMockFeatures({
        danceability: 1,
        energy: 1,
        valence: 1,
        tempo: 200,
        loudness: 0,
      });

      const distance = calculateFeatureDistance(a, b);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Reasonable upper bound
    });
  });

  describe('matchesProfile', () => {
    it('returns true for identical features', () => {
      const features = createMockFeatures();
      const matches = matchesProfile(features, features);

      expect(matches).toBe(true);
    });

    it('returns true for similar features within threshold', () => {
      const a = createMockFeatures({
        danceability: 0.5,
        energy: 0.6,
        valence: 0.7,
      });

      const b = createMockFeatures({
        danceability: 0.52,
        energy: 0.61,
        valence: 0.69,
      });

      const matches = matchesProfile(a, b, 0.5);

      expect(matches).toBe(true);
    });

    it('returns false for dissimilar features beyond threshold', () => {
      const a = createMockFeatures({
        danceability: 0.1,
        energy: 0.2,
        valence: 0.1,
      });

      const b = createMockFeatures({
        danceability: 0.9,
        energy: 0.8,
        valence: 0.9,
      });

      const matches = matchesProfile(a, b, 0.5);

      expect(matches).toBe(false);
    });

    it('uses default threshold of 0.5', () => {
      const a = createMockFeatures({ danceability: 0.5 });
      const b = createMockFeatures({ danceability: 0.5 });

      const matches = matchesProfile(a, b);

      expect(matches).toBe(true);
    });

    it('respects custom threshold', () => {
      const a = createMockFeatures({ danceability: 0.5, energy: 0.5 });
      const b = createMockFeatures({ danceability: 0.6, energy: 0.6 });

      const strictMatch = matchesProfile(a, b, 0.1);
      const looseMatch = matchesProfile(a, b, 1.0);

      expect(strictMatch).toBe(false);
      expect(looseMatch).toBe(true);
    });
  });

  describe('blendFeatures', () => {
    it('blends features with equal weights by default', () => {
      const features = [
        createMockFeatures({ danceability: 0.4, energy: 0.5 }),
        createMockFeatures({ danceability: 0.6, energy: 0.7 }),
      ];

      const blended = blendFeatures(features);

      expect(blended.danceability).toBe(0.5);
      expect(blended.energy).toBe(0.6);
      expect(blended.id).toBe('blended');
    });

    it('blends features with custom weights', () => {
      const features = [
        createMockFeatures({ danceability: 0.4, energy: 0.5 }),
        createMockFeatures({ danceability: 0.6, energy: 0.7 }),
      ];

      // Weight first feature 3x more than second
      const blended = blendFeatures(features, [3, 1]);

      // Weighted average: (0.4*3 + 0.6*1) / 4 = 0.45
      expect(blended.danceability).toBeCloseTo(0.45);
      // Weighted average: (0.5*3 + 0.7*1) / 4 = 0.55
      expect(blended.energy).toBeCloseTo(0.55);
    });

    it('normalizes weights to sum to 1', () => {
      const features = [
        createMockFeatures({ danceability: 0.2 }),
        createMockFeatures({ danceability: 0.8 }),
      ];

      // Weights [2, 2] should be normalized to [0.5, 0.5]
      const blended1 = blendFeatures(features, [2, 2]);
      // Weights [1, 1] should also be normalized to [0.5, 0.5]
      const blended2 = blendFeatures(features, [1, 1]);

      expect(blended1.danceability).toBe(blended2.danceability);
    });

    it('handles single feature', () => {
      const features = [
        createMockFeatures({ danceability: 0.7, energy: 0.8 }),
      ];

      const blended = blendFeatures(features);

      expect(blended.danceability).toBe(0.7);
      expect(blended.energy).toBe(0.8);
    });

    it('rounds discrete values (key, mode, time_signature)', () => {
      const features = [
        createMockFeatures({ key: 0, mode: 0, time_signature: 4 }),
        createMockFeatures({ key: 1, mode: 1, time_signature: 3 }),
      ];

      const blended = blendFeatures(features);

      expect(Number.isInteger(blended.key)).toBe(true);
      expect(Number.isInteger(blended.mode)).toBe(true);
      expect(Number.isInteger(blended.time_signature)).toBe(true);
    });

    it('throws error for empty array', () => {
      expect(() => blendFeatures([])).toThrow(
        'Cannot blend empty features array'
      );
    });

    it('blends all properties correctly', () => {
      const features = [
        createMockFeatures({
          danceability: 0.2,
          energy: 0.3,
          valence: 0.4,
          tempo: 80,
          acousticness: 0.5,
          instrumentalness: 0.6,
          speechiness: 0.1,
          loudness: -10,
        }),
        createMockFeatures({
          danceability: 0.8,
          energy: 0.9,
          valence: 0.6,
          tempo: 160,
          acousticness: 0.1,
          instrumentalness: 0.2,
          speechiness: 0.3,
          loudness: -2,
        }),
      ];

      const blended = blendFeatures(features);

      expect(blended.danceability).toBe(0.5);
      expect(blended.energy).toBe(0.6);
      expect(blended.valence).toBe(0.5);
      expect(blended.tempo).toBe(120);
      expect(blended.acousticness).toBe(0.3);
      expect(blended.instrumentalness).toBe(0.4);
      expect(blended.speechiness).toBe(0.2);
      expect(blended.loudness).toBe(-6);
    });

    it('handles weights that heavily favor one profile', () => {
      const features = [
        createMockFeatures({ danceability: 0.2, energy: 0.3 }),
        createMockFeatures({ danceability: 0.8, energy: 0.9 }),
      ];

      // Weight second feature 99x more than first
      const blended = blendFeatures(features, [1, 99]);

      // Should be very close to second feature
      expect(blended.danceability).toBeCloseTo(0.8, 1);
      expect(blended.energy).toBeCloseTo(0.9, 1);
    });

    it('works with more than 2 features', () => {
      const features = [
        createMockFeatures({ danceability: 0.2 }),
        createMockFeatures({ danceability: 0.5 }),
        createMockFeatures({ danceability: 0.8 }),
      ];

      const blended = blendFeatures(features);

      // Equal weights: (0.2 + 0.5 + 0.8) / 3 = 0.5
      expect(blended.danceability).toBe(0.5);
    });
  });
});
