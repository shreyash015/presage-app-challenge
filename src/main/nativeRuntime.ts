/**
 * Point the SmartSpectra SDK at its native library in a packaged app.
 *
 * In development the SDK finds its native library inside node_modules. In a packaged app,
 * node_modules lives inside the app.asar archive, and macOS cannot load a native library
 * from inside an archive, so the app would fail to start. electron-builder.yml copies the
 * library folder next to the archive (Resources/smartspectra/), as the SDK's README
 * describes, and SMARTSPECTRA_CAPI_PATH (the SDK's documented setting) tells it where.
 *
 * This must run before the SDK is first imported, so index.ts imports this file first.
 */
import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

const libraryName: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'libsmartspectra_capi.dylib',
  linux: 'libsmartspectra_capi.so',
  win32: 'smartspectra_capi.dll'
}

const name = libraryName[process.platform]
if (app.isPackaged && name && !process.env.SMARTSPECTRA_CAPI_PATH) {
  const bundled = join(process.resourcesPath, 'smartspectra', name)
  if (existsSync(bundled)) process.env.SMARTSPECTRA_CAPI_PATH = bundled
}
