import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getDesktop, mediaUrl, type DesktopTrack } from "@/lib/desktop";


export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: string;
  duration: number;
  /** object URL for local files; absent for metadata-only results */
  url?: string;
  cover?: string;
  addedAt: number;
  playCount: number;
  source: "local" | "metadata" | "audius";
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  favorite: boolean;
  createdAt: number;
}

export interface Settings {
  theme: "light" | "dark";
  accent: "green" | "blue" | "violet" | "amber";
  defaultVolume: number;
  crossfade: boolean;
  gapless: boolean;
  autoScan: boolean;
  fontScale: number;
  highContrast: boolean;
  apiTimeout: number;
}

export type RepeatMode = "off" | "all" | "one";

interface Persisted {
  playlists: Playlist[];
  favorites: string[];
  favoriteAlbums: string[];
  favoriteArtists: string[];
  recent: { id: string; at: number }[];
  settings: Settings;
  position: { trackId: string | null; time: number };
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "green",
  defaultVolume: 0.8,
  crossfade: false,
  gapless: true,
  autoScan: true,
  fontScale: 1,
  highContrast: false,
  apiTimeout: 12,
};

const KEY = "sonora.state.v1";

function load(): Persisted {
  const base: Persisted = {
    playlists: [],
    favorites: [],
    favoriteAlbums: [],
    favoriteArtists: [],
    recent: [],
    settings: DEFAULT_SETTINGS,
    position: { trackId: null, time: 0 },
  };
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      ...base,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return base;
  }
}

interface MusicContextValue extends Persisted {
  library: Track[];
  queue: Track[];
  current: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  importFiles: (files: FileList | File[]) => Promise<number>;
  addMetadataTracks: (tracks: Track[]) => void;
  playTrack: (track: Track, list?: Track[]) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  enqueue: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  toggleFavorite: (id: string) => void;
  toggleFavoriteAlbum: (name: string) => void;
  toggleFavoriteArtist: (name: string) => void;
  createPlaylist: (name: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  togglePlaylistFavorite: (id: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylist: (playlistId: string, from: number, to: number) => void;
  clearHistory: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  trackById: (id: string) => Track | undefined;
}

const MusicContext = createContext<MusicContextValue | null>(null);

const AUDIO_EXT = /\.(mp3|flac|wav|aac|ogg|oga|m4a)$/i;

function parseName(name: string) {
  const clean = name.replace(AUDIO_EXT, "").replace(/_/g, " ").trim();
  const parts = clean.split(/\s+-\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  return { artist: "Unknown artist", title: clean };
}

function fromDesktop(t: DesktopTrack): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    genre: t.genre ?? undefined,
    year: t.year ?? undefined,
    duration: t.duration,
    url: mediaUrl(t.path),
    cover: mediaUrl(t.artwork),
    addedAt: t.added_at,
    playCount: t.play_count,
    source: "local",
  };
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load());
  const [library, setLibrary] = useState<Track[]>([]);

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_SETTINGS.defaultVolume);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = index >= 0 ? (queue[index] ?? null) : null;

  // persistence
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  // desktop backend: SQLite-backed library + live folder watching
  useEffect(() => {
    const api = getDesktop();
    if (!api) return;
    let cancelled = false;
    const sync = async () => {
      const rows = await api.library.tracks();
      if (!cancelled) setLibrary(rows.map(fromDesktop));
    };
    void sync();
    const off = api.on("library:changed", () => void sync());
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // theme + accessibility flags
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", state.settings.theme === "dark");
    root.dataset.accent = state.settings.accent;
    root.classList.toggle("high-contrast", state.settings.highContrast);
    root.style.fontSize = `${16 * state.settings.fontScale}px`;
  }, [state.settings]);

  useEffect(() => setVolumeState(state.settings.defaultVolume), [state.settings.defaultVolume]);

  // audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => endedRef.current();
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // remember playback position
  useEffect(() => {
    if (!current) return;
    const t = window.setInterval(() => {
      setState((s) => ({ ...s, position: { trackId: current.id, time: audioRef.current?.currentTime ?? 0 } }));
    }, 5000);
    return () => window.clearInterval(t);
  }, [current]);

  const startTrack = useCallback((track: Track, resumeAt = 0) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!track.url) {
      setPlaying(false);
      return;
    }
    audio.src = track.url;
    audio.currentTime = resumeAt;
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    setState((s) => ({
      ...s,
      recent: [{ id: track.id, at: Date.now() }, ...s.recent.filter((r) => r.id !== track.id)].slice(0, 100),
    }));
    setLibrary((lib) => lib.map((t) => (t.id === track.id ? { ...t, playCount: t.playCount + 1 } : t)));
    void getDesktop()?.library.recordPlay(track.id);
  }, []);

  const playAt = useCallback(
    (i: number, list = queue) => {
      const track = list[i];
      if (!track) return;
      setIndex(i);
      startTrack(track);
    },
    [queue, startTrack],
  );

  const next = useCallback(() => {
    setIndex((i) => {
      if (queue.length === 0) return i;
      let n: number;
      if (shuffle) n = Math.floor(Math.random() * queue.length);
      else n = i + 1;
      if (n >= queue.length) {
        if (repeat === "all") n = 0;
        else {
          audioRef.current?.pause();
          setPlaying(false);
          return i;
        }
      }
      startTrack(queue[n]);
      return n;
    });
  }, [queue, shuffle, repeat, startTrack]);

  const endedRef = useRef<() => void>(() => {});
  endedRef.current = () => {
    if (repeat === "one" && current) {
      startTrack(current);
      return;
    }
    next();
  };

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setIndex((i) => {
      const p = i - 1 < 0 ? (repeat === "all" ? queue.length - 1 : 0) : i - 1;
      if (queue[p]) startTrack(queue[p]);
      return p;
    });
  }, [queue, repeat, startTrack]);

  const playTrack = useCallback(
    (track: Track, list?: Track[]) => {
      const nextQueue = list && list.length ? list : [track];
      setQueue(nextQueue);
      const i = Math.max(0, nextQueue.findIndex((t) => t.id === track.id));
      setIndex(i);
      startTrack(nextQueue[i]);
    },
    [startTrack],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current?.url) return;
    if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else {
      audio.pause();
      setPlaying(false);
    }
  }, [current]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
  }, []);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => AUDIO_EXT.test(f.name));
    if (!list.length) return 0;
    const tracks: Track[] = await Promise.all(
      list.map(async (file) => {
        const url = URL.createObjectURL(file);
        const meta = parseName(file.name);
        const folder = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
        const album = folder.split("/").slice(-2, -1)[0] || "Local files";
        const duration = await new Promise<number>((resolve) => {
          const a = new Audio();
          a.preload = "metadata";
          a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : 0);
          a.onerror = () => resolve(0);
          a.src = url;
        });
        return {
          id: `local-${file.name}-${file.size}-${file.lastModified}`,
          title: meta.title,
          artist: meta.artist,
          album,
          duration,
          url,
          addedAt: Date.now(),
          playCount: 0,
          source: "local" as const,
        };
      }),
    );
    setLibrary((lib) => {
      const seen = new Set(lib.map((t) => t.id));
      return [...lib, ...tracks.filter((t) => !seen.has(t.id))];
    });
    return tracks.length;
  }, []);

  const addMetadataTracks = useCallback((tracks: Track[]) => {
    setLibrary((lib) => {
      const seen = new Set(lib.map((t) => t.id));
      return [...lib, ...tracks.filter((t) => !seen.has(t.id))];
    });
  }, []);

  const value = useMemo<MusicContextValue>(
    () => ({
      ...state,
      library,
      queue,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      importFiles,
      addMetadataTracks,
      playTrack,
      toggle,
      stop,
      next,
      prev,
      seek: (t) => {
        if (audioRef.current) audioRef.current.currentTime = t;
        setProgress(t);
      },
      setVolume: (v) => {
        setVolumeState(v);
        setMuted(false);
      },
      toggleMute: () => setMuted((m) => !m),
      toggleShuffle: () => setShuffle((s) => !s),
      cycleRepeat: () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
      enqueue: (track) => setQueue((q) => (q.some((t) => t.id === track.id) ? q : [...q, track])),
      removeFromQueue: (id) => setQueue((q) => q.filter((t) => t.id !== id)),
      moveInQueue: (from, to) =>
        setQueue((q) => {
          const copy = [...q];
          const [item] = copy.splice(from, 1);
          copy.splice(to, 0, item);
          return copy;
        }),
      clearQueue: () => {
        setQueue(current ? [current] : []);
        setIndex(current ? 0 : -1);
      },
      toggleFavorite: (id) =>
        setState((s) => ({
          ...s,
          favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
        })),
      toggleFavoriteAlbum: (name) =>
        setState((s) => ({
          ...s,
          favoriteAlbums: s.favoriteAlbums.includes(name)
            ? s.favoriteAlbums.filter((f) => f !== name)
            : [...s.favoriteAlbums, name],
        })),
      toggleFavoriteArtist: (name) =>
        setState((s) => ({
          ...s,
          favoriteArtists: s.favoriteArtists.includes(name)
            ? s.favoriteArtists.filter((f) => f !== name)
            : [...s.favoriteArtists, name],
        })),
      createPlaylist: (name) => {
        const pl: Playlist = {
          id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          trackIds: [],
          favorite: false,
          createdAt: Date.now(),
        };
        setState((s) => ({ ...s, playlists: [...s.playlists, pl] }));
        return pl;
      },
      renamePlaylist: (id, name) =>
        setState((s) => ({ ...s, playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)) })),
      deletePlaylist: (id) => setState((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) })),
      togglePlaylistFavorite: (id) =>
        setState((s) => ({
          ...s,
          playlists: s.playlists.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
        })),
      addToPlaylist: (playlistId, trackId) =>
        setState((s) => ({
          ...s,
          playlists: s.playlists.map((p) =>
            p.id === playlistId && !p.trackIds.includes(trackId)
              ? { ...p, trackIds: [...p.trackIds, trackId] }
              : p,
          ),
        })),
      removeFromPlaylist: (playlistId, trackId) =>
        setState((s) => ({
          ...s,
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
          ),
        })),
      reorderPlaylist: (playlistId, from, to) =>
        setState((s) => ({
          ...s,
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const ids = [...p.trackIds];
            const [item] = ids.splice(from, 1);
            ids.splice(to, 0, item);
            return { ...p, trackIds: ids };
          }),
        })),
      clearHistory: () => setState((s) => ({ ...s, recent: [] })),
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      updateTrack: (id, patch) => {
        setLibrary((lib) => lib.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        void getDesktop()?.library.update(id, {
          title: patch.title,
          artist: patch.artist,
          album: patch.album,
          genre: patch.genre,
          year: patch.year,
        });
      },
      trackById: (id) => library.find((t) => t.id === id),
    }),
    [
      state,
      library,
      queue,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      importFiles,
      addMetadataTracks,
      playTrack,
      toggle,
      stop,
      next,
      prev,
    ],
  );

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowRight" && e.ctrlKey) next();
      else if (e.code === "ArrowLeft" && e.ctrlKey) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, next, prev]);

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
