// Playback service: audio decoding happens in the renderer (HTMLAudioElement),
// while the main process owns the authoritative queue/session state and history.
const db = require("./db.cjs");
const library = require("./library.cjs");

let emit = () => {};
const state = {
  queue: [],
  index: -1,
  isPlaying: false,
  position: 0,
  shuffle: false,
  repeat: "off",
  volume: 0.8,
};

function setEmitter(fn) {
  emit = fn;
}

function snapshot() {
  return { ...state, current: state.queue[state.index] ?? null };
}

function publish() {
  emit("playback:state", snapshot());
  return snapshot();
}

function setQueue(trackIds, startIndex = 0) {
  state.queue = trackIds;
  state.index = trackIds.length ? Math.min(startIndex, trackIds.length - 1) : -1;
  if (state.queue[state.index]) library.recordPlay(state.queue[state.index]);
  return publish();
}

function update(patch) {
  Object.assign(state, patch);
  return publish();
}

function jump(index) {
  if (!state.queue[index]) return snapshot();
  state.index = index;
  library.recordPlay(state.queue[index]);
  return publish();
}

function next() {
  if (!state.queue.length) return snapshot();
  if (state.repeat === "one") return jump(state.index);
  let n = state.shuffle ? Math.floor(Math.random() * state.queue.length) : state.index + 1;
  if (n >= state.queue.length) {
    if (state.repeat !== "all") return update({ isPlaying: false });
    n = 0;
  }
  return jump(n);
}

function prev() {
  if (!state.queue.length) return snapshot();
  const p = state.index - 1 < 0 ? (state.repeat === "all" ? state.queue.length - 1 : 0) : state.index - 1;
  return jump(p);
}

function savePosition(trackId, time) {
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('resume', ?)", [
    JSON.stringify({ trackId, time }),
  ]);
}

function resumePoint() {
  const row = db.one("SELECT value FROM settings WHERE key = 'resume'");
  return row ? JSON.parse(row.value) : null;
}

module.exports = { setEmitter, snapshot, setQueue, update, jump, next, prev, savePosition, resumePoint };
