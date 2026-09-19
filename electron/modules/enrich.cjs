// Background enrichment: fills missing metadata from MusicBrainz and caches
// Cover Art Archive artwork on disk. Runs one track at a time to stay polite.
const db = require("./db.cjs");
const mbClient = require("./musicbrainz.cjs");
const artwork = require("./artwork.cjs");

const pending = [];
let running = false;
let emit = () => {};

function setEmitter(fn) {
  emit = fn;
}

function schedule(trackId) {
  if (!pending.includes(trackId)) pending.push(trackId);
  void drain();
}

function needsWork(t) {
  return (
    !t.artwork ||
    !t.mb_recording_id ||
    !t.year ||
    t.artist === "Unknown artist" ||
    t.album === "Unknown album"
  );
}

async function process(trackId) {
  const track = db.one("SELECT * FROM tracks WHERE id = ?", [trackId]);
  if (!track || !needsWork(track)) return;

  let releaseId = track.mb_release_id;
  try {
    if (!track.mb_recording_id || !releaseId) {
      const match = await mbClient.lookupRecording({
        title: track.title,
        artist: track.artist,
        album: track.album === "Unknown album" ? undefined : track.album,
      });
      if (match) {
        releaseId = match.releaseId ?? releaseId;
        db.run(
          `UPDATE tracks SET mb_recording_id = COALESCE(mb_recording_id, ?),
             mb_release_id = COALESCE(mb_release_id, ?),
             artist = CASE WHEN artist = 'Unknown artist' AND ? IS NOT NULL THEN ? ELSE artist END,
             album = CASE WHEN album = 'Unknown album' AND ? IS NOT NULL THEN ? ELSE album END,
             year = COALESCE(year, ?)
           WHERE id = ?`,
          [
            match.recordingId, match.releaseId ?? null,
            match.artist ?? null, match.artist ?? null,
            match.album ?? null, match.album ?? null,
            match.year ?? null, trackId,
          ],
        );
      }
    }
    if (!track.artwork && releaseId) {
      const file = await artwork.fetchCoverArt(releaseId, `${track.artist}::${track.album}`);
      if (file) db.run("UPDATE tracks SET artwork = ? WHERE id = ?", [file, trackId]);
    }
    emit("library:changed", { reason: "enriched", trackId });
  } catch {
    /* network/no-match: leave the track as-is */
  }
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (pending.length) {
      await process(pending.shift());
    }
  } finally {
    running = false;
  }
}

module.exports = { schedule, setEmitter };
