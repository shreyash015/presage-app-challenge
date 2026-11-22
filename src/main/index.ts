// Tells the SmartSpectra SDK where its native library is in a packaged app
import './nativeRuntime'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { session } from 'electron'

/*
 * The SDK loads its native library as soon as it is imported. The bundler moves static
 * imports of packages above everything else, which would run before nativeRuntime has set
 * the library path, so the SDK is imported on demand (loadSmartSpectra) instead.
 */
type SmartSpectraMain = typeof import('@smartspectra/node-sdk/main')
let smartSpectra: SmartSpectraMain | null = null

async function loadSmartSpectra(): Promise<void> {
  try {
    smartSpectra = await import('@smartspectra/node-sdk/main')
  } catch (e) {
    // The window still opens; starting the camera then fails with an error message there
    console.error('Aurae: SmartSpectra SDK failed to load', e)
    return
  }
  watchTeardowns(smartSpectra.SmartSpectraSDK)
}

/*
 * Clean quit while the SDK is (or was) running.
 *
 * Closing the window makes the SDK tear its native session down on a worker thread, and that
 * thread reports back to JavaScript when it finishes. If the app exits before then, the report
 * arrives while Node is shutting down and the process aborts ("FATAL ERROR ... napi_throw").
 * So on quit we close the windows first, wait for every SDK teardown to finish, then exit.
 *
 * The SDK's IPC glue (bindSmartSpectraIpc) starts these teardowns itself and does not expose
 * them, so we observe destroy() to know what to wait for. Its behaviour is unchanged.
 */
const pendingTeardowns = new Set<Promise<void>>()
function watchTeardowns(SDK: SmartSpectraMain['SmartSpectraSDK']): void {
  const sdkDestroy = SDK.prototype.destroy
  SDK.prototype.destroy = function (this: InstanceType<typeof SDK>): Promise<void> {
    const done = sdkDestroy.call(this)
    pendingTeardowns.add(done)
    done.catch(() => {}).finally(() => pendingTeardowns.delete(done))
    return done
  }
}

const QUIT_WAIT_LIMIT_MS = 8000 // never hang on quit if a teardown stalls
let teardownFinished = false

app.on('before-quit', (event) => {
  if (teardownFinished) return
  event.preventDefault()
  void (async () => {
    for (const w of BrowserWindow.getAllWindows()) w.destroy()
    // Let the closed windows' SDK connections notice and start their teardowns
    await new Promise((r) => setTimeout(r, 100))
    const limit = new Promise((r) => setTimeout(r, QUIT_WAIT_LIMIT_MS))
    while (pendingTeardowns.size > 0) {
      const settled = await Promise.race([
        Promise.allSettled([...pendingTeardowns]).then(() => true),
        limit.then(() => false)
      ])
      if (!settled) break
    }
    teardownFinished = true
    app.quit()
  })()
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 360,
    minHeight: 560,
    show: false,
    backgroundColor: '#f2f0eb', // --c-canvas: no white flash before the first paint or on resize
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  smartSpectra?.bindSmartSpectraIpc(mainWindow)

  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => {
    const url = details?.requestingUrl || wc.getURL()
    const ownPage = url.startsWith('file://') || url.startsWith('http://localhost')
    cb(permission === 'media' && ownPage) // camera only, only for our own page
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  await loadSmartSpectra()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.shreyash.aurae')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
