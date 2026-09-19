// Playlist manager.
const crypto = require("node:crypto");
const db = require("./db.cjs");

function list() {
  const playlists = db.all("SELECT * FROM playlists ORDER BY created_at DESC");
  return playlists.map((p) => ({
    id: p.id,
    name: p.name,
    favorite: p.favorite === 1,
    createdAt: p.created_at,
    trackIds: db
      .all("SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position", [p.id])
      .map((r) => r.track_id),
  }));
}

function create(name) {
  const id = `pl-${crypto.randomUUID()}`;
  db.run("INSERT INTO playlists (id, name, favorite, created_at) VALUES (?, ?, 0, ?)", [
    id, name, Date.now(),
  ]);
  return list().find((p) => p.id === id);
}

const rename = (id, name) => db.run("UPDATE playlists SET name = ? WHERE id = ?", [name, id]);
const remove = (id) => {
  db.run("DELETE FROM playlist_tracks WHERE playlist_id = ?", [id]);
  db.run("DELETE FROM playlists WHERE id = ?", [id]);
};
const toggleFavorite = (id) => db.run("UPDATE playlists SET favorite = 1 - favorite WHERE id = ?", [id]);

function addTrack(playlistId, trackId) {
  const max = db.one("SELECT COALESCE(MAX(position), -1) AS m FROM playlist_tracks WHERE playlist_id = ?", [
    playlistId,
  ]);
  db.run(
    "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
    [playlistId, trackId, (max?.m ?? -1) + 1],
  );
}

const removeTrack = (playlistId, trackId) =>
  db.run("DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?", [playlistId, trackId]);

function reorder(playlistId, from, to) {
  const ids = db
    .all("SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position", [playlistId])
    .map((r) => r.track_id);
  const [moved] = ids.splice(from, 1);
  if (moved === undefined) return;
  ids.splice(to, 0, moved);
  ids.forEach((trackId, position) => {
    db.run("UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?", [
      position, playlistId, trackId,
    ]);
  });
}

module.exports = { list, create, rename, remove, toggleFavorite, addTrack, removeTrack, reorder };
