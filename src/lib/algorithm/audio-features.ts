import type { AudioFeatures } from "@/types";

/**
 * Calculate the average of audio features across multiple tracks
 */
export function calculateAverageFeatures(features: AudioFeatures[]): AudioFeatures {
  if (features.length === 0) {
    throw new Error("Cannot calculate average of empty features array");
  }

  const sum = features.reduce(
    (acc, f) => ({
      id: "", // Will be set after
      danceability: acc.danceability + f.danceability,
      energy: acc.energy + f.energy,
      valence: acc.valence + f.valence,
      tempo: acc.tempo + f.tempo,
      acousticness: acc.acousticness + f.acousticness,
      instrumentalness: acc.instrumentalness + f.instrumentalness,
      speechiness: acc.speechiness + f.speechiness,
      loudness: acc.loudness + f.loudness,
      key: acc.key + f.key,
      mode: acc.mode + f.mode,
      time_signature: acc.time_signature + f.time_signature,
    }),
    {
      id: "",
      danceability: 0,
      energy: 0,
      valence: 0,
      tempo: 0,
      acousticness: 0,
      instrumentalness: 0,
      speechiness: 0,
      loudness: 0,
      key: 0,
      mode: 0,
      time_signature: 0,
    }
  );

  const count = features.length;

  return {
    id: "average",
    danceability: sum.danceability / count,
    energy: sum.energy / count,
    valence: sum.valence / count,
    tempo: sum.tempo / count,
    acousticness: sum.acousticness / count,
    instrumentalness: sum.instrumentalness / count,
    speechiness: sum.speechiness / count,
    loudness: sum.loudness / count,
    key: Math.round(sum.key / count),
    mode: Math.round(sum.mode / count),
    time_signature: Math.round(sum.time_signature / count),
  };
}

/**
 * Calculate Euclidean distance between two audio feature sets
 * Lower distance = more similar
 */
export function calculateFeatureDistance(a: AudioFeatures, b: AudioFeatures): number {
  // Normalize tempo to 0-1 scale (assuming 60-200 BPM range)
  const tempoA = (a.tempo - 60) / 140;
  const tempoB = (b.tempo - 60) / 140;

  // Normalize loudness to 0-1 scale (assuming -60 to 0 dB range)
  const loudnessA = (a.loudness + 60) / 60;
  const loudnessB = (b.loudness + 60) / 60;

  // Feature weights (emphasize more important features)
  const weights = {
    danceability: 1.2,
    energy: 1.2,
    valence: 1.0,
    tempo: 0.8,
    acousticness: 0.6,
    instrumentalness: 0.6,
    speechiness: 0.4,
    loudness: 0.5,
  };

  // Calculate weighted squared differences
  const diff = {
    danceability: Math.pow((a.danceability - b.danceability) * weights.danceability, 2),
    energy: Math.pow((a.energy - b.energy) * weights.energy, 2),
    valence: Math.pow((a.valence - b.valence) * weights.valence, 2),
    tempo: Math.pow((tempoA - tempoB) * weights.tempo, 2),
    acousticness: Math.pow((a.acousticness - b.acousticness) * weights.acousticness, 2),
    instrumentalness: Math.pow((a.instrumentalness - b.instrumentalness) * weights.instrumentalness, 2),
    speechiness: Math.pow((a.speechiness - b.speechiness) * weights.speechiness, 2),
    loudness: Math.pow((loudnessA - loudnessB) * weights.loudness, 2),
  };

  // Sum all squared differences
  const sumSquaredDiff = Object.values(diff).reduce((sum, val) => sum + val, 0);

  // Return Euclidean distance
  return Math.sqrt(sumSquaredDiff);
}

/**
 * Check if a track's features match a target profile within a threshold
 */
export function matchesProfile(trackFeatures: AudioFeatures, targetFeatures: AudioFeatures, threshold = 0.5): boolean {
  const distance = calculateFeatureDistance(trackFeatures, targetFeatures);
  return distance <= threshold;
}

/**
 * Blend multiple audio feature profiles with optional weighting
 */
export function blendFeatures(features: AudioFeatures[], weights?: number[]): AudioFeatures {
  if (features.length === 0) {
    throw new Error("Cannot blend empty features array");
  }

  // Default to equal weights
  const w = weights || features.map(() => 1 / features.length);

  // Normalize weights to sum to 1
  const weightSum = w.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = w.map((weight) => weight / weightSum);

  const blended = features.reduce(
    (acc, f, i) => {
      const weight = normalizedWeights[i];
      return {
        id: acc.id,
        danceability: acc.danceability + f.danceability * weight,
        energy: acc.energy + f.energy * weight,
        valence: acc.valence + f.valence * weight,
        tempo: acc.tempo + f.tempo * weight,
        acousticness: acc.acousticness + f.acousticness * weight,
        instrumentalness: acc.instrumentalness + f.instrumentalness * weight,
        speechiness: acc.speechiness + f.speechiness * weight,
        loudness: acc.loudness + f.loudness * weight,
        key: acc.key + f.key * weight,
        mode: acc.mode + f.mode * weight,
        time_signature: acc.time_signature + f.time_signature * weight,
      };
    },
    {
      id: "blended",
      danceability: 0,
      energy: 0,
      valence: 0,
      tempo: 0,
      acousticness: 0,
      instrumentalness: 0,
      speechiness: 0,
      loudness: 0,
      key: 0,
      mode: 0,
      time_signature: 0,
    }
  );

  // Round discrete values
  blended.key = Math.round(blended.key);
  blended.mode = Math.round(blended.mode);
  blended.time_signature = Math.round(blended.time_signature);

  return blended;
}
