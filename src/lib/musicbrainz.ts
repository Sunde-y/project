// MusicBrainz metadata provider. Written against a generic provider shape so
// additional providers (Discogs, Last.fm, ...) can be added later.

export interface RemoteTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumId?: string;
  duration?: number;
  year?: string;
}

export interface RemoteRelease {
  id: string;
  title: string;
  artist: string;
  year?: string;
  trackCount?: number;
}

export interface RemoteArtist {
  id: string;
  name: string;
  area?: string;
  type?: string;
  tags?: string[];
}

export interface MetadataProvider {
  name: string;
  searchRecordings(q: string, limit?: number): Promise<RemoteTrack[]>;
  searchReleases(q: string, limit?: number): Promise<RemoteRelease[]>;
  searchArtists(q: string, limit?: number): Promise<RemoteArtist[]>;
}

const BASE = "https://musicbrainz.org/ws/2";
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 1000 * 60 * 30;

async function mb<T>(path: string, timeoutMs = 12000): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}${path.includes("?") ? "&" : "?"}fmt=json`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`MusicBrainz request failed (${res.status})`);
    const data = (await res.json()) as T;
    cache.set(path, { at: Date.now(), data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function coverArtUrl(releaseId: string, size: 250 | 500 = 250) {
  return `https://coverartarchive.org/release/${releaseId}/front-${size}`;
}

export function coverArtGroupUrl(releaseGroupId: string, size: 250 | 500 = 250) {
  return `https://coverartarchive.org/release-group/${releaseGroupId}/front-${size}`;
}

export const musicBrainz: MetadataProvider = {
  name: "MusicBrainz",

  async searchRecordings(q, limit = 25) {
    if (!q.trim()) return [];
    const data = await mb<{ recordings?: any[] }>(
      `/recording?query=${encodeURIComponent(q)}&limit=${limit}`,
    );
    return (data.recordings ?? []).map((r) => {
      const release = r.releases?.[0];
      return {
        id: r.id as string,
        title: r.title as string,
        artist: r["artist-credit"]?.map((a: any) => a.name).join(", ") ?? "Unknown artist",
        album: release?.title,
        albumId: release?.id,
        duration: r.length ? Math.round(r.length / 1000) : undefined,
        year: release?.date?.slice(0, 4),
      } satisfies RemoteTrack;
    });
  },

  async searchReleases(q, limit = 20) {
    if (!q.trim()) return [];
    const data = await mb<{ releases?: any[] }>(
      `/release?query=${encodeURIComponent(q)}&limit=${limit}`,
    );
    return (data.releases ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      artist: r["artist-credit"]?.map((a: any) => a.name).join(", ") ?? "Unknown artist",
      year: r.date?.slice(0, 4),
      trackCount: r["track-count"],
    }));
  },

  async searchArtists(q, limit = 20) {
    if (!q.trim()) return [];
    const data = await mb<{ artists?: any[] }>(
      `/artist?query=${encodeURIComponent(q)}&limit=${limit}`,
    );
    return (data.artists ?? []).map((a) => ({
      id: a.id as string,
      name: a.name as string,
      area: a.area?.name ?? a["begin-area"]?.name,
      type: a.type,
      tags: (a.tags ?? []).slice(0, 3).map((t: any) => t.name),
    }));
  },
};

export async function artistDetails(id: string) {
  return mb<any>(`/artist/${id}?inc=release-groups+tags+url-rels`);
}

export async function releaseDetails(id: string) {
  return mb<any>(`/release/${id}?inc=recordings+artist-credits+release-groups`);
}

export function clearMetadataCache() {
  cache.clear();
}

export function metadataCacheSize() {
  return cache.size;
}
