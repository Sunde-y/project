// Artwork cache: stores embedded covers and Cover Art Archive downloads on disk.
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const crypto = require("node:crypto");

let dir = null;

function init(userDataDir) {
  dir = path.join(userDataDir, "artwork");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function keyFor(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 24);
}

function fileFor(key, ext = "jpg") {
  return path.join(dir, `${key}.${ext}`);
}

async function saveEmbedded(albumKey, picture) {
  if (!picture?.data) return null;
  const ext = (picture.format || "image/jpeg").includes("png") ? "png" : "jpg";
  const target = fileFor(keyFor(albumKey), ext);
  if (!fs.existsSync(target)) await fsp.writeFile(target, Buffer.from(picture.data));
  return target;
}

async function fetchCoverArt(releaseId, albumKey) {
  const target = fileFor(keyFor(albumKey || releaseId));
  if (fs.existsSync(target)) return target;
  try {
    const res = await fetch(`https://coverartarchive.org/release/${releaseId}/front-500`, {
      headers: { "User-Agent": "Sonora/1.0 (desktop music player)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    await fsp.writeFile(target, Buffer.from(await res.arrayBuffer()));
    return target;
  } catch {
    return null;
  }
}

module.exports = { init, saveEmbedded, fetchCoverArt, keyFor };
