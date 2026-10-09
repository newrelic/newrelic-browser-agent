import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const APP_DIR = path.dirname(url.fileURLToPath(import.meta.url))
const SOURCES = ['main.cjs', 'package.json'].map(file => path.join(APP_DIR, file))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

/**
 * Finds the executable electron-packager produces for this platform and architecture.
 * @returns {string} Absolute path where the packaged app's executable is expected to be.
 */
export function packagedExecutable () {
  const root = path.join(APP_DIR, 'out', `electron-browser-${process.platform}-${process.arch}`)
  if (process.platform === 'darwin') return path.join(root, 'electron-browser.app/Contents/MacOS/electron-browser')
  if (process.platform === 'win32') return path.join(root, 'electron-browser.exe')
  return path.join(root, 'electron-browser')
}

const mtime = (file) => fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0

function run (args) {
  const result = spawnSync(npm, args, { cwd: APP_DIR, stdio: 'inherit', env: process.env })
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed in ${APP_DIR}`)
}

/**
 * Installs and packages the Electron browser, but only when it is missing or older than its sources.
 * Electron's ~100MB download and the packaging step only happen on runs that actually test against
 * Electron (`-b electron`); no other build or test run touches this folder. Must be awaited once,
 * from the main wdio process before any workers start, so concurrent workers never race on the build.
 */
export function ensureBuilt () {
  const newestSource = Math.max(...SOURCES.map(mtime))
  if (mtime(packagedExecutable()) > newestSource) return

  if (mtime(path.join(APP_DIR, 'node_modules/electron/package.json')) < mtime(path.join(APP_DIR, 'package.json'))) {
    run(['install', '--no-progress'])
  }
  run(['run', 'package'])
}

if (process.argv[1] === url.fileURLToPath(import.meta.url)) ensureBuilt()
