const path = require("node:path");
const { pathToFileURL } = require("node:url");

const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  net,
  protocol,
  shell,
} = require("electron");
const { autoUpdater } = require("electron-updater");

const { resolveAsset } = require("./paths.cjs");
const metadata = require("./package.json");

const APP_URL = "excalidraw://app/";
const RELEASES_URL = "https://github.com/davidgcorr/excalidraw/releases";
let mainWindow;
let checking = false;
let quitting = false;
let updateReady = false;

async function offerInstall() {
  const { response } = await dialog.showMessageBox({
    message: "The update is ready",
    detail: "Save your drawing before restarting.",
    buttons: ["Restart and Install", "Later"],
    cancelId: 1,
  });
  if (response === 0) {
    autoUpdater.quitAndInstall();
  }
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "excalidraw",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

async function checkForUpdates() {
  if (!app.isPackaged || !metadata.desktopUpdatesEnabled) {
    const { response } = await dialog.showMessageBox({
      type: "info",
      message: "Download updates from GitHub Releases",
      detail:
        "This local build uses manual upgrades. Install a signed release to enable automatic updates.",
      buttons: ["Open Releases", "Cancel"],
      cancelId: 1,
    });
    if (response === 0) {
      await shell.openExternal(RELEASES_URL);
    }
    return;
  }
  if (checking) {
    return;
  }
  checking = true;
  try {
    if (updateReady) {
      await offerInstall();
      return;
    }
    const result = await autoUpdater.checkForUpdates();
    if (!result?.isUpdateAvailable) {
      await dialog.showMessageBox({
        message: "You are up to date.",
        detail: `Version ${app.getVersion()}`,
      });
      return;
    }
    const { response } = await dialog.showMessageBox({
      message: `Version ${result.updateInfo.version} is available`,
      detail:
        "Download the update now? You can keep drawing while it downloads.",
      buttons: ["Download", "Later"],
      cancelId: 1,
    });
    if (response === 0) {
      await autoUpdater.downloadUpdate();
    }
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      message: "Could not update the app",
      detail: error.message,
    });
  } finally {
    checking = false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 800,
    minHeight: 600,
    title: "Excalidraw Animation",
    backgroundColor: "#ffffff",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  const contents = mainWindow.webContents;
  const openExternal = (url) => {
    if (["https:", "http:", "mailto:"].includes(new URL(url).protocol)) {
      shell.openExternal(url).catch(console.error);
    }
  };
  contents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  const guardNavigation = (event, url) => {
    if (
      new URL(url).origin !== new URL(APP_URL).origin ||
      !url.startsWith(APP_URL)
    ) {
      event.preventDefault();
      openExternal(url);
    }
  };
  contents.on("will-navigate", guardNavigation);
  contents.on("will-redirect", guardNavigation);
  contents.on("will-attach-webview", (event) => event.preventDefault());
  contents.session.setPermissionRequestHandler(
    (_contents, permission, callback) => {
      callback(permission === "clipboard-sanitized-write");
    },
  );
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", (event) => {
    if (process.platform === "darwin" && !quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  contents.on(
    "did-fail-load",
    (_event, code, description, _url, isMainFrame) => {
      if (isMainFrame && code !== -3) {
        dialog.showErrorBox("Unable to open the editor", description);
      }
    },
  );
  mainWindow.loadURL(APP_URL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  app
    .whenReady()
    .then(() => {
      const webRoot = app.isPackaged
        ? path.join(process.resourcesPath, "web")
        : path.join(__dirname, "web");
      protocol.handle("excalidraw", async (request) => {
        try {
          const file = resolveAsset(webRoot, request.url);
          const response = await net.fetch(pathToFileURL(file).href);
          const headers = new Headers(response.headers);
          headers.set(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; worker-src 'self' blob:; frame-src 'self' https: about:; media-src 'self' blob: data: https:; object-src 'none'; base-uri 'self'",
          );
          return new Response(response.body, {
            status: response.status,
            headers,
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      });
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      // Always attach an error listener, including errors emitted during download.
      autoUpdater.on("error", (error) => console.error("Updater:", error));
      autoUpdater.on("update-downloaded", async () => {
        updateReady = true;
        await offerInstall();
      });
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: process.platform === "darwin" ? app.name : "File",
            submenu: [
              { role: "about" },
              { label: "Check for Updates…", click: checkForUpdates },
              { type: "separator" },
              ...(process.platform === "darwin"
                ? [
                    { role: "services" },
                    { type: "separator" },
                    { role: "hide" },
                    { role: "hideOthers" },
                    { role: "unhide" },
                  ]
                : []),
              { type: "separator" },
              { role: "quit" },
            ],
          },
          { role: "editMenu" },
          { role: "viewMenu" },
          { role: "windowMenu" },
          {
            role: "help",
            submenu: [
              {
                label: "GitHub Releases",
                click: () => shell.openExternal(RELEASES_URL),
              },
            ],
          },
        ]),
      );
      createWindow();
      app.on("activate", () => {
        mainWindow.show();
      });
    })
    .catch((error) => {
      dialog.showErrorBox(
        "Unable to start Excalidraw Animation",
        error.message,
      );
      app.quit();
    });
}
app.on("before-quit", () => {
  quitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
