// Preload: the only bridge between the renderer and Node. Context-isolated.
const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("sonora", {
  isDesktop: true,

  folders: {
    list: () => invoke("folders:list"),
    pick: () => invoke("folders:pick"),
    add: (folder) => invoke("folders:add", folder),
    remove: (folder) => invoke("folders:remove", folder),
    rescan: () => invoke("folders:rescan"),
  },

  library: {
    tracks: () => invoke("library:tracks"),
    update: (id, patch) => invoke("library:update", { id, patch }),
    toggleTrackFavorite: (id) => invoke("library:toggleTrackFavorite", id),
    toggleFavorite: (kind, value) => invoke("library:toggleFavorite", { kind, value }),
    favorites: () => invoke("library:favorites"),
    recordPlay: (id) => invoke("library:recordPlay", id),
    history: () => invoke("library:history"),
    clearHistory: () => invoke("library:clearHistory"),
  },

  playlists: {
    list: () => invoke("playlists:list"),
    create: (name) => invoke("playlists:create", name),
    rename: (id, name) => invoke("playlists:rename", { id, name }),
    remove: (id) => invoke("playlists:remove", id),
    toggleFavorite: (id) => invoke("playlists:toggleFavorite", id),
    addTrack: (playlistId, trackId) => invoke("playlists:addTrack", { playlistId, trackId }),
    removeTrack: (playlistId, trackId) => invoke("playlists:removeTrack", { playlistId, trackId }),
    reorder: (playlistId, from, to) => invoke("playlists:reorder", { playlistId, from, to }),
  },

  playback: {
    state: () => invoke("playback:state"),
    setQueue: (trackIds, startIndex) => invoke("playback:setQueue", { trackIds, startIndex }),
    update: (patch) => invoke("playback:update", patch),
    jump: (index) => invoke("playback:jump", index),
    next: () => invoke("playback:next"),
    prev: () => invoke("playback:prev"),
    savePosition: (trackId, time) => invoke("playback:savePosition", { trackId, time }),
    resumePoint: () => invoke("playback:resumePoint"),
  },

  settings: {
    get: () => invoke("settings:get"),
    set: (patch) => invoke("settings:set", patch),
  },

  metadata: {
    searchRecordings: (q, limit) => invoke("mb:searchRecordings", { q, limit }),
    searchReleases: (q, limit) => invoke("mb:searchReleases", { q, limit }),
    searchArtists: (q, limit) => invoke("mb:searchArtists", { q, limit }),
    clearCache: () => invoke("mb:clearCache"),
  },

  on: (event, handler) => {
    const listener = (_e, payload) => handler(payload);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  },
});
