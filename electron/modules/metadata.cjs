// Metadata reader: embedded tags via music-metadata (ID3v1/ID3v2, Vorbis, FLAC, MP4).
const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");

const SUPPORTED = new Set([".mp3", ".flac", ".wav", ".ogg", ".oga", ".aac", ".m4a"]);

function isSupported(file) {
  return SUPPORTED.has(path.extname(file).toLowerCase());
}

function trackId(filePath) {
  return crypto.createHash("sha1").update(filePath).digest("hex").slice(0, 20);
}

let mmPromise;
function mm() {
  // music-metadata is ESM-only; load it dynamically from CommonJS.
  if (!mmPromise) mmPromise = import("music-metadata");
  return mmPromise;
}

function fallbackFromName(filePath) {
  const base = path.basename(filePath, path.extname(filePath)).replace(/_/g, " ").trim();
  const parts = base.split(/\s+-\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  return { artist: "Unknown artist", title: base };
}

async function read(filePath) {
  const stat = await fs.stat(filePath);
  const fb = fallbackFromName(filePath);
  let common = {};
  let format = {};
  let picture = null;
  try {
    const { parseFile } = await mm();
    const parsed = await parseFile(filePath, { duration: true });
    common = parsed.common ?? {};
    format = parsed.format ?? {};
    picture = common.picture?.[0] ?? null;
  } catch {
    /* unreadable tags — fall back to filename */
  }

  return {
    id: trackId(filePath),
    path: filePath,
    title: common.title || fb.title,
    artist: common.artist || fb.artist,
    album: common.album || path.basename(path.dirname(filePath)) || "Unknown album",
    album_artist: common.albumartist || null,
    genre: common.genre?.[0] ?? null,
    year: common.year ? String(common.year) : null,
    track_no: common.track?.no ?? null,
    duration: format.duration ?? 0,
    bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null,
    codec: format.codec ?? path.extname(filePath).slice(1).toUpperCase(),
    size: stat.size,
    mtime: Math.round(stat.mtimeMs),
    mb_recording_id: common.musicbrainz_recordingid?.[0] ?? null,
    mb_release_id: common.musicbrainz_albumid?.[0] ?? null,
    embeddedPicture: picture ? { data: picture.data, format: picture.format } : null,
  };
}

module.exports = { read, isSupported, trackId, SUPPORTED };
