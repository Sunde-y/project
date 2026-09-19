// File scanner + chokidar watcher for user-selected music folders.
const path = require("node:path");
const fs = require("node:fs/promises");
const chokidar = require("chokidar");
const db = require("./db.cjs");
const metadata = require("./metadata.cjs");
const library = require("./library.cjs");
const artwork = require("./artwork.cjs");
const enrich = require("./enrich.cjs");

let emit = () => {};
const watchers = new Map();

function setEmitter(fn) {
  emit = fn;
}

const listFolders = () => db.all("SELECT path, added_at FROM folders ORDER BY added_at");

async function ingest(filePath) {
  if (!metadata.isSupported(filePath)) return null;
  const meta = await metadata.read(filePath);
  let cover = null;
  if (meta.embeddedPicture) {
    cover = await artwork.saveEmbedded(`${meta.artist}::${meta.album}`, meta.embeddedPicture);
  }
  delete meta.embeddedPicture;
  library.upsertTrack(meta, cover);
  enrich.schedule(meta.id);
  return meta;
}

async function walk(dir, out = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (metadata.isSupported(full)) out.push(full);
  }
  return out;
}

async function scanFolder(folder) {
  const files = await walk(folder);
  let done = 0;
  for (const file of files) {
    await ingest(file);
    done += 1;
    if (done % 10 === 0 || done === files.length) {
      emit("scan:progress", { folder, done, total: files.length });
    }
  }
  emit("library:changed", { reason: "scan", folder });
  return { folder, count: files.length };
}

function watch(folder) {
  if (watchers.has(folder)) return;
  const watcher = chokidar.watch(folder, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 200 },
  });
  const onChange = async (file) => {
    if (!metadata.isSupported(file)) return;
    await ingest(file);
    emit("library:changed", { reason: "update", file });
  };
  watcher.on("add", onChange);
  watcher.on("change", onChange);
  watcher.on("unlink", (file) => {
    library.removeByPath(file);
    emit("library:changed", { reason: "remove", file });
  });
  watchers.set(folder, watcher);
}

async function addFolder(folder) {
  db.run("INSERT OR IGNORE INTO folders (path, added_at) VALUES (?, ?)", [folder, Date.now()]);
  watch(folder);
  return scanFolder(folder);
}

async function removeFolder(folder) {
  db.run("DELETE FROM folders WHERE path = ?", [folder]);
  db.run("DELETE FROM tracks WHERE path LIKE ?", [`${folder}%`]);
  const watcher = watchers.get(folder);
  if (watcher) {
    await watcher.close();
    watchers.delete(folder);
  }
  emit("library:changed", { reason: "folder-removed", folder });
}

async function rescanAll() {
  const folders = listFolders();
  for (const f of folders) await scanFolder(f.path);
  return folders.length;
}

function startWatchers() {
  for (const f of listFolders()) watch(f.path);
}

async function stopAll() {
  for (const w of watchers.values()) await w.close();
  watchers.clear();
}

module.exports = { setEmitter, listFolders, addFolder, removeFolder, scanFolder, rescanAll, startWatchers, stopAll };
