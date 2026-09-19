// IPC surface: every backend capability the renderer is allowed to call.
const { ipcMain, dialog } = require("electron");
const library = require("./library.cjs");
const playlists = require("./playlists.cjs");
const playback = require("./playback.cjs");
const scanner = require("./scanner.cjs");
const mbClient = require("./musicbrainz.cjs");

function register(getWindow) {
  const handle = (channel, fn) => ipcMain.handle(channel, (_e, payload) => fn(payload));

  handle("folders:list", () => scanner.listFolders());
  handle("folders:pick", async () => {
    const win = getWindow();
    const res = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "multiSelections"],
      title: "Select music folders",
    });
    if (res.canceled) return [];
    for (const folder of res.filePaths) await scanner.addFolder(folder);
    return res.filePaths;
  });
  handle("folders:add", (folder) => scanner.addFolder(folder));
  handle("folders:remove", (folder) => scanner.removeFolder(folder));
  handle("folders:rescan", () => scanner.rescanAll());

  handle("library:tracks", () => library.listTracks());
  handle("library:update", ({ id, patch }) => library.updateTrack(id, patch));
  handle("library:toggleTrackFavorite", (id) => library.toggleTrackFavorite(id));
  handle("library:toggleFavorite", ({ kind, value }) => library.toggleFavorite(kind, value));
  handle("library:favorites", () => library.listFavorites());
  handle("library:recordPlay", (id) => library.recordPlay(id));
  handle("library:history", () => library.listHistory());
  handle("library:clearHistory", () => library.clearHistory());

  handle("playlists:list", () => playlists.list());
  handle("playlists:create", (name) => playlists.create(name));
  handle("playlists:rename", ({ id, name }) => playlists.rename(id, name));
  handle("playlists:remove", (id) => playlists.remove(id));
  handle("playlists:toggleFavorite", (id) => playlists.toggleFavorite(id));
  handle("playlists:addTrack", ({ playlistId, trackId }) => playlists.addTrack(playlistId, trackId));
  handle("playlists:removeTrack", ({ playlistId, trackId }) =>
    playlists.removeTrack(playlistId, trackId));
  handle("playlists:reorder", ({ playlistId, from, to }) => playlists.reorder(playlistId, from, to));

  handle("playback:state", () => playback.snapshot());
  handle("playback:setQueue", ({ trackIds, startIndex }) => playback.setQueue(trackIds, startIndex));
  handle("playback:update", (patch) => playback.update(patch));
  handle("playback:jump", (index) => playback.jump(index));
  handle("playback:next", () => playback.next());
  handle("playback:prev", () => playback.prev());
  handle("playback:savePosition", ({ trackId, time }) => playback.savePosition(trackId, time));
  handle("playback:resumePoint", () => playback.resumePoint());

  handle("settings:get", () => library.getSettings());
  handle("settings:set", (patch) => library.setSettings(patch));

  handle("mb:searchRecordings", ({ q, limit }) => mbClient.searchRecordings(q, limit));
  handle("mb:searchReleases", ({ q, limit }) => mbClient.searchReleases(q, limit));
  handle("mb:searchArtists", ({ q, limit }) => mbClient.searchArtists(q, limit));
  handle("mb:clearCache", () => mbClient.clearCache());
}

module.exports = { register };
