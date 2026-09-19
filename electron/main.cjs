// Electron main process for Sonora.
const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, protocol, net } = require("electron");

const db = require("./modules/db.cjs");
const artwork = require("./modules/artwork.cjs");
const scanner = require("./modules/scanner.cjs");
const enrich = require("./modules/enrich.cjs");
const playback = require("./modules/playback.cjs");
const ipc = require("./modules/ipc.cjs");

const DEV_URL = process.env.SONORA_DEV_URL;

// Explicit app identity: keeps the %APPDATA% folder name clean and gives
// Windows the right AppUserModelId for taskbar grouping / notifications.
app.setName("Sonora");
if (process.platform === "win32") app.setAppUserModelId("com.sonora.app");

// Only one instance should ever own the SQLite database / folder watchers.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let win = null;
const getWindow = () => win;

// Local audio files and cached artwork are served through a dedicated scheme
// instead of loosening web security.
protocol.registerSchemesAsPrivileged([
  { scheme: "sonora-media", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const RENDERER_DIR = path.join(__dirname, "..", "dist-electron");

function broadcast(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0e1113",
    title: "Sonora",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadURL("app://sonora/");
}

if (gotLock) {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    const userData = app.getPath("userData");
    db.init(userData);
    artwork.init(userData);

    scanner.setEmitter(broadcast);
    enrich.setEmitter(broadcast);
    playback.setEmitter(broadcast);

    protocol.handle("sonora-media", (request) => {
      const filePath = decodeURIComponent(new URL(request.url).pathname);
      const resolved = process.platform === "win32" ? filePath.replace(/^\//, "") : filePath;
      if (!fs.existsSync(resolved)) return new Response("Not found", { status: 404 });
      return net.fetch(`file://${resolved}`);
    });

    // Serve the client-only renderer bundle; unknown paths fall back to
    // index.html so TanStack Router can handle client-side navigation.
    protocol.handle("app", async (request) => {
      const { pathname } = new URL(request.url);
      const candidate = path.join(RENDERER_DIR, decodeURIComponent(pathname));
      const file = candidate.startsWith(RENDERER_DIR) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
        ? candidate
        : path.join(RENDERER_DIR, "index.html");
      return net.fetch(`file://${file}`);
    });

    ipc.register(getWindow);
    scanner.startWatchers();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", async () => {
    await scanner.stopAll();
    if (process.platform !== "darwin") app.quit();
  });
}
