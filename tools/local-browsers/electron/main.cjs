/*
 * A packaged Electron "browser" for the wdio test runner. It opens one blank window and does nothing
 * else: tests drive it through chromedriver (`browser.url(...)`) exactly like a LambdaTest browser, so
 * whatever the testing server serves is what runs in Electron's Chromium.
 *
 * The `--nr-mode=<loose|strict>` launch argument picks the security posture of the window:
 * - loose: a legacy-style app. Node integration on, no context isolation, no sandbox, no CSP.
 * - strict: a hardened app. Sandboxed, context isolated, no Node in the renderer, and a locked-down
 *   Content-Security-Policy added to every page it loads. Pages are expected to nonce their inline
 *   scripts with the nonce given by `--nr-csp-nonce=<nonce>` (the testing server does this for a
 *   `nonce` query param, which it also answers with its own CSP header that is replaced here).
 *   Specs that don't know about the nonce should use loose mode.
 */
const { app, BrowserWindow, session } = require('electron')

const launchArg = (name) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const mode = launchArg('nr-mode') === 'strict' ? 'strict' : 'loose'
const nonce = launchArg('nr-csp-nonce')

const WEB_PREFERENCES = {
  loose: { nodeIntegration: true, contextIsolation: false, sandbox: false },
  strict: { nodeIntegration: false, contextIsolation: true, sandbox: true }
}

/*
 * Beyond 'self' and the nonce, the agent needs to reach its collector (connect-src; the test servers
 * are *.nr-local.net) and to run its compression/replay workers from blobs (worker-src).
 */
const STRICT_CSP = [
  "default-src 'none'",
  `script-src 'self' 'nonce-${nonce}'`,
  "style-src 'self'",
  "img-src 'self' data:",
  'connect-src http://*.nr-local.net:*',
  'worker-src blob:'
].join('; ')

app.whenReady().then(() => {
  if (mode === 'strict') {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders }
      if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
        /*
         * The testing server answers a `nonce` query param with its own, much narrower script-src. Both
         * policies would be enforced together, so drop whatever the page came with (header names are
         * case-insensitive) and apply this app's policy alone.
         */
        Object.keys(responseHeaders)
          .filter(name => name.toLowerCase() === 'content-security-policy')
          .forEach(name => delete responseHeaders[name])
        responseHeaders['Content-Security-Policy'] = [STRICT_CSP]
      }
      callback({ responseHeaders })
    })
  }

  const win = new BrowserWindow({ width: 800, height: 600, title: 'Electron', webPreferences: WEB_PREFERENCES[mode] })
  // Pages set the window title through their <title> on every navigation (e.g. a framework app's
  // "Vite Template"), which made it unclear which window belongs to the test run
  win.on('page-title-updated', (event) => event.preventDefault())
  win.loadURL('about:blank')
})

app.on('window-all-closed', () => app.quit())
