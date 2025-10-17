import { faker } from '@faker-js/faker';
import type { SpotifyTrack, SpotifyArtist, SpotifyAlbum, SpotifyDevice, SpotifyImage } from '@/types/spotify';

export function createMockSpotifyImage(overrides?: Partial<SpotifyImage>): SpotifyImage {
  return {
    url: faker.image.url(),
    height: 640,
    width: 640,
    ...overrides,
  };
}

export function createMockSpotifyArtist(overrides?: Partial<SpotifyArtist>): SpotifyArtist {
  const artistName = faker.person.fullName();
  return {
    id: faker.string.alphanumeric(22),
    name: artistName,
    uri: `spotify:artist:${faker.string.alphanumeric(22)}`,
    external_urls: {
      spotify: `https://open.spotify.com/artist/${faker.string.alphanumeric(22)}`,
    },
    ...overrides,
  };
}

export function createMockSpotifyAlbum(overrides?: Partial<SpotifyAlbum>): SpotifyAlbum {
  const albumName = faker.music.songName();
  return {
    id: faker.string.alphanumeric(22),
    name: albumName,
    images: [
      createMockSpotifyImage({ height: 640, width: 640 }),
      createMockSpotifyImage({ height: 300, width: 300 }),
      createMockSpotifyImage({ height: 64, width: 64 }),
    ],
    uri: `spotify:album:${faker.string.alphanumeric(22)}`,
    external_urls: {
      spotify: `https://open.spotify.com/album/${faker.string.alphanumeric(22)}`,
    },
    ...overrides,
  };
}

export function createMockSpotifyTrack(overrides?: Partial<SpotifyTrack>): SpotifyTrack {
  const trackName = faker.music.songName();
  const trackId = faker.string.alphanumeric(22);

  return {
    id: trackId,
    name: trackName,
    uri: `spotify:track:${trackId}`,
    duration_ms: faker.number.int({ min: 120000, max: 300000 }), // 2-5 minutes
    artists: [createMockSpotifyArtist()],
    album: createMockSpotifyAlbum(),
    external_urls: {
      spotify: `https://open.spotify.com/track/${trackId}`,
    },
    preview_url: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.7 }),
    ...overrides,
  };
}

export function createMockSpotifyDevice(overrides?: Partial<SpotifyDevice>): SpotifyDevice {
  const deviceTypes = ['Computer', 'Smartphone', 'Speaker', 'TV', 'AVR', 'STB', 'AudioDongle', 'GameConsole', 'CastVideo', 'CastAudio', 'Automobile'];
  const deviceNames = {
    Computer: () => `${faker.person.firstName()}'s ${faker.helpers.arrayElement(['MacBook Pro', 'Windows PC', 'iMac'])}`,
    Smartphone: () => `${faker.person.firstName()}'s ${faker.helpers.arrayElement(['iPhone', 'Android Phone'])}`,
    Speaker: () => faker.helpers.arrayElement(['Living Room', 'Bedroom', 'Kitchen', 'Office']) + ' Speaker',
    TV: () => faker.helpers.arrayElement(['Living Room', 'Bedroom']) + ' TV',
  };

  const deviceType = faker.helpers.arrayElement(deviceTypes);
  const getName = deviceNames[deviceType as keyof typeof deviceNames] || (() => `${deviceType} Device`);

  return {
    id: faker.string.alphanumeric(40),
    name: getName(),
    type: deviceType,
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    volume_percent: faker.number.int({ min: 0, max: 100 }),
    ...overrides,
  };
}
