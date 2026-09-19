// Audius provider — search + direct streaming from the Audius catalog.
//
// Audius's public REST API (https://api.audius.co/v1) serves search and
// streaming without any API key or bearer token: the only query param it
// asks for is `app_name`, which is just a free-text identifier for
// analytics (not a secret, not required for the request to succeed). That
// makes it a good match for "play directly, no import" — the stream URL
// can be handed straight to an <audio> element.

export interface AudiusTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  artwork?: string;
  /** URL that can be set directly as an <audio> src — streams the track. */
  streamUrl: string;
}

const API_BASE = "https://api.audius.co/v1";
const APP_NAME = "Sonora";

async function audiusFetch<T>(path: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${API_BASE}${path}${sep}app_name=${encodeURIComponent(APP_NAME)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Audius request failed (${res.status})`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function artworkUrl(t: any): string | undefined {
  const art = t.artwork ?? {};
  return art["480x480"] ?? art["150x150"] ?? art["1000x1000"] ?? undefined;
}

export function audiusStreamUrl(trackId: string) {
  return `${API_BASE}/tracks/${trackId}/stream?app_name=${encodeURIComponent(APP_NAME)}`;
}

function mapTrack(t: any): AudiusTrack {
  return {
    id: String(t.id),
    title: t.title ?? "Untitled",
    artist: t.user?.name ?? t.user?.handle ?? "Unknown artist",
    duration: typeof t.duration === "number" ? t.duration : 0,
    genre: t.genre ?? undefined,
    artwork: artworkUrl(t),
    streamUrl: audiusStreamUrl(String(t.id)),
  };
}

/** Free-text search across the Audius catalog. No auth required. */
export async function searchAudiusTracks(query: string, limit = 20): Promise<AudiusTrack[]> {
  if (!query.trim()) return [];
  const data = await audiusFetch<{ data?: any[] }>(
    `/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return (data.data ?? []).map(mapTrack);
}

/** Currently trending tracks — handy for a default/empty-query view. */
export async function trendingAudiusTracks(limit = 20): Promise<AudiusTrack[]> {
  const data = await audiusFetch<{ data?: any[] }>(`/tracks/trending?limit=${limit}`);
  return (data.data ?? []).map(mapTrack);
}
