// SQLite database module. Uses better-sqlite3 (native, synchronous), rebuilt
// against Electron's Node ABI at packaging time via electron-builder's
// npmRebuild step, so the shipped binary matches the runtime exactly.
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

let db = null;

function init(userDataDir) {
  fs.mkdirSync(userDataDir, { recursive: true });
  db = new Database(path.join(userDataDir, "sonora.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      path TEXT PRIMARY KEY,
      added_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT 'Unknown artist',
      album TEXT NOT NULL DEFAULT 'Unknown album',
      album_artist TEXT,
      genre TEXT,
      year TEXT,
      track_no INTEGER,
      duration REAL NOT NULL DEFAULT 0,
      bitrate INTEGER,
      codec TEXT,
      size INTEGER,
      mtime INTEGER,
      artwork TEXT,
      mb_recording_id TEXT,
      mb_release_id TEXT,
      play_count INTEGER NOT NULL DEFAULT 0,
      favorite INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tracks_artist ON tracks(artist);
    CREATE INDEX IF NOT EXISTS tracks_album ON tracks(album);

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, track_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (kind, value)
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id TEXT NOT NULL,
      played_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mb_cache (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);
  return db;
}

function get() {
  if (!db) throw new Error("Database not initialised");
  return db;
}

const all = (sql, params = []) => get().prepare(sql).all(...params);
const one = (sql, params = []) => get().prepare(sql).get(...params);
const run = (sql, params = []) => get().prepare(sql).run(...params);

module.exports = { init, get, all, one, run };
