// Typed bridge to the Electron backend. Safe to import in the browser build:
// `isDesktop` is false there and every call throws only if used explicitly.

export interface DesktopTrack {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  album_artist: string | null;
  genre: string | null;
  year: string | null;
  track_no: number | null;
  duration: number;
  bitrate: number | null;
  codec: string | null;
  size: number | null;
  mtime: number | null;
  artwork: string | null;
  mb_recording_id: string | null;
  mb_release_id: string | null;
  play_count: number;
  favorite: number;
  added_at: number;
}

export interface DesktopPlaylist {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: number;
  trackIds: string[];
}

export interface PlaybackState {
  queue: string[];
  index: number;
  isPlaying: boolean;
  position: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  volume: number;
  current: string | null;
}

export interface SonoraApi {
  isDesktop: true;
  folders: {
    list(): Promise<{ path: string; added_at: number }[]>;
    pick(): Promise<string[]>;
    add(folder: string): Promise<{ folder: string; count: number }>;
    remove(folder: string): Promise<void>;
    rescan(): Promise<number>;
  };
  library: {
    tracks(): Promise<DesktopTrack[]>;
    update(id: string, patch: Partial<DesktopTrack>): Promise<void>;
    toggleTrackFavorite(id: string): Promise<boolean>;
    toggleFavorite(kind: "album" | "artist", value: string): Promise<boolean>;
    favorites(): Promise<{ kind: string; value: string }[]>;
    recordPlay(id: string): Promise<void>;
    history(): Promise<{ track_id: string; played_at: number }[]>;
    clearHistory(): Promise<void>;
  };
  playlists: {
    list(): Promise<DesktopPlaylist[]>;
    create(name: string): Promise<DesktopPlaylist>;
    rename(id: string, name: string): Promise<void>;
    remove(id: string): Promise<void>;
    toggleFavorite(id: string): Promise<void>;
    addTrack(playlistId: string, trackId: string): Promise<void>;
    removeTrack(playlistId: string, trackId: string): Promise<void>;
    reorder(playlistId: string, from: number, to: number): Promise<void>;
  };
  playback: {
    state(): Promise<PlaybackState>;
    setQueue(trackIds: string[], startIndex?: number): Promise<PlaybackState>;
    update(patch: Partial<PlaybackState>): Promise<PlaybackState>;
    jump(index: number): Promise<PlaybackState>;
    next(): Promise<PlaybackState>;
    prev(): Promise<PlaybackState>;
    savePosition(trackId: string, time: number): Promise<void>;
    resumePoint(): Promise<{ trackId: string; time: number } | null>;
  };
  settings: {
    get(): Promise<Record<string, unknown>>;
    set(patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  metadata: {
    searchRecordings(q: string, limit?: number): Promise<unknown>;
    searchReleases(q: string, limit?: number): Promise<unknown>;
    searchArtists(q: string, limit?: number): Promise<unknown>;
    clearCache(): Promise<void>;
  };
  on(event: string, handler: (payload: unknown) => void): () => void;
}

declare global {
  interface Window {
    sonora?: SonoraApi;
  }
}

export function getDesktop(): SonoraApi | null {
  if (typeof window === "undefined") return null;
  return window.sonora ?? null;
}

export const isDesktop = () => getDesktop() !== null;

/** Convert an absolute local path into a URL the renderer can load. */
export function mediaUrl(absolutePath: string | null | undefined) {
  if (!absolutePath) return undefined;
  return `sonora-media://local${encodeURI(absolutePath.replace(/\\/g, "/")).replace(/^\/?/, "/")}`;
}
