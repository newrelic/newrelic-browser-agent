/*
 * Electron main process for the framework informational test app. The built renderer (dist/, from
 * `vite build`) is loaded straight from the app package over file:// like a production Electron app,
 * in one of two security modes picked by the `--nr-mode=<loose|strict>` launch argument:
 *
 * - loose: a legacy-style app. Node integration on, no context isolation, no sandbox, no CSP.
 * - strict: a hardened app. Sandboxed, context isolated, no Node in the renderer, and a locked-down
 *   CSP (the <meta> tag in index.strict.html).
 *
 * The one test-only seam is the agent config. A real app would bake its NREUM `info`/`init` into the
 * renderer bundle, but the wdio suite needs each test's testId/beacon settings from the testing server,
 * which only exist after the app has launched. So the spec writes them as JSON to the file named by
 * `--nr-bootstrap-file=<path>` and reloads the window; the preload script asks this process for the
 * contents on every page load. With no file present the renderer simply doesn't start the agent.
 */
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow, ipcMain } = require('electron')

const launchArg = (name) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const mode = launchArg('nr-mode') === 'strict' ? 'strict' : 'loose'
const bootstrapFile = launchArg('nr-bootstrap-file')

ipcMain.on('nr-bootstrap', (event) => {
  try {
    event.returnValue = JSON.parse(fs.readFileSync(bootstrapFile, 'utf-8'))
  } catch (error) {
    event.returnValue = null
  }
})

const WEB_PREFERENCES = {
  loose: { nodeIntegration: true, contextIsolation: false, sandbox: false },
  strict: { nodeIntegration: false, contextIsolation: true, sandbox: true }
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      ...WEB_PREFERENCES[mode]
    }
  })
  win.loadFile(path.join(__dirname, 'dist', mode === 'strict' ? 'index.strict.html' : 'index.html'))
})

app.on('window-all-closed', () => app.quit())
