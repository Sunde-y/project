// Library queries: tracks, favorites, history, settings.
const db = require("./db.cjs");

function upsertTrack(meta, artworkPath) {
  const existing = db.one("SELECT id, play_count, favorite, added_at FROM tracks WHERE id = ?", [meta.id]);
  db.run(
    `INSERT INTO tracks (id, path, title, artist, album, album_artist, genre, year, track_no,
        duration, bitrate, codec, size, mtime, artwork, mb_recording_id, mb_release_id,
        play_count, favorite, added_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       path=excluded.path, title=excluded.title, artist=excluded.artist, album=excluded.album,
       album_artist=excluded.album_artist, genre=excluded.genre, year=excluded.year,
       track_no=excluded.track_no, duration=excluded.duration, bitrate=excluded.bitrate,
       codec=excluded.codec, size=excluded.size, mtime=excluded.mtime,
       artwork=COALESCE(excluded.artwork, tracks.artwork),
       mb_recording_id=COALESCE(excluded.mb_recording_id, tracks.mb_recording_id),
       mb_release_id=COALESCE(excluded.mb_release_id, tracks.mb_release_id)`,
    [
      meta.id, meta.path, meta.title, meta.artist, meta.album, meta.album_artist, meta.genre,
      meta.year, meta.track_no, meta.duration, meta.bitrate, meta.codec, meta.size, meta.mtime,
      artworkPath ?? null, meta.mb_recording_id, meta.mb_release_id,
      existing?.play_count ?? 0, existing?.favorite ?? 0, existing?.added_at ?? Date.now(),
    ],
  );
}

const removeByPath = (p) => db.run("DELETE FROM tracks WHERE path = ?", [p]);
const listTracks = () => db.all("SELECT * FROM tracks ORDER BY artist, album, track_no, title");
const trackByPath = (p) => db.one("SELECT * FROM tracks WHERE path = ?", [p]);

function updateTrack(id, patch) {
  const fields = ["title", "artist", "album", "album_artist", "genre", "year", "artwork"].filter(
    (k) => patch[k] !== undefined,
  );
  if (!fields.length) return;
  db.run(
    `UPDATE tracks SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`,
    [...fields.map((f) => patch[f]), id],
  );
}

function toggleTrackFavorite(id) {
  db.run("UPDATE tracks SET favorite = 1 - favorite WHERE id = ?", [id]);
  return db.one("SELECT favorite FROM tracks WHERE id = ?", [id])?.favorite === 1;
}

function toggleFavorite(kind, value) {
  const hit = db.one("SELECT 1 AS x FROM favorites WHERE kind = ? AND value = ?", [kind, value]);
  if (hit) db.run("DELETE FROM favorites WHERE kind = ? AND value = ?", [kind, value]);
  else db.run("INSERT INTO favorites (kind, value) VALUES (?, ?)", [kind, value]);
  return !hit;
}

const listFavorites = () => db.all("SELECT kind, value FROM favorites");

const recordPlay = (trackId) => {
  db.run("INSERT INTO history (track_id, played_at) VALUES (?, ?)", [trackId, Date.now()]);
  db.run("UPDATE tracks SET play_count = play_count + 1 WHERE id = ?", [trackId]);
};
const listHistory = (limit = 200) =>
  db.all("SELECT track_id, played_at FROM history ORDER BY played_at DESC LIMIT ?", [limit]);
const clearHistory = () => db.run("DELETE FROM history");

function getSettings() {
  const rows = db.all("SELECT key, value FROM settings");
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}
function setSettings(patch) {
  for (const [key, value] of Object.entries(patch)) {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, JSON.stringify(value)]);
  }
  return getSettings();
}

module.exports = {
  upsertTrack, removeByPath, listTracks, trackByPath, updateTrack, toggleTrackFavorite,
  toggleFavorite, listFavorites, recordPlay, listHistory, clearHistory, getSettings, setSettings,
};
