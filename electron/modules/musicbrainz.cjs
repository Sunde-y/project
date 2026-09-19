// MusicBrainz client with SQLite-backed cache and polite rate limiting (1 req/s).
const db = require("./db.cjs");

const BASE = "https://musicbrainz.org/ws/2";
const TTL = 1000 * 60 * 60 * 24 * 30;
const UA = "Sonora/1.0 (desktop music player)";

let chain = Promise.resolve();
function throttled(fn) {
  const next = chain.then(async () => {
    const result = await fn();
    await new Promise((r) => setTimeout(r, 1100));
    return result;
  });
  chain = next.catch(() => {});
  return next;
}

async function request(pathname) {
  const cached = db.one("SELECT payload, fetched_at FROM mb_cache WHERE key = ?", [pathname]);
  if (cached && Date.now() - cached.fetched_at < TTL) return JSON.parse(cached.payload);

  const data = await throttled(async () => {
    const url = `${BASE}${pathname}${pathname.includes("?") ? "&" : "?"}fmt=json`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error(`MusicBrainz request failed (${res.status})`);
    return res.json();
  });

  db.run("INSERT OR REPLACE INTO mb_cache (key, payload, fetched_at) VALUES (?, ?, ?)", [
    pathname,
    JSON.stringify(data),
    Date.now(),
  ]);
  return data;
}

async function lookupRecording({ title, artist, album }) {
  const terms = [`recording:"${title}"`];
  if (artist && artist !== "Unknown artist") terms.push(`artist:"${artist}"`);
  if (album) terms.push(`release:"${album}"`);
  const data = await request(`/recording?query=${encodeURIComponent(terms.join(" AND "))}&limit=1`);
  const rec = data.recordings?.[0];
  if (!rec) return null;
  const release = rec.releases?.[0];
  return {
    recordingId: rec.id,
    title: rec.title,
    artist: rec["artist-credit"]?.map((a) => a.name).join(", "),
    album: release?.title,
    releaseId: release?.id,
    year: release?.date?.slice(0, 4),
  };
}

const searchRecordings = (q, limit = 25) =>
  request(`/recording?query=${encodeURIComponent(q)}&limit=${limit}`);
const searchReleases = (q, limit = 20) =>
  request(`/release?query=${encodeURIComponent(q)}&limit=${limit}`);
const searchArtists = (q, limit = 20) =>
  request(`/artist?query=${encodeURIComponent(q)}&limit=${limit}`);

function clearCache() {
  db.run("DELETE FROM mb_cache");
}

module.exports = { request, lookupRecording, searchRecordings, searchReleases, searchArtists, clearCache };
