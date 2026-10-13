import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { ensureBuilt, packagedExecutable } from './build.mjs'

/*
 * Opens the packaged Electron browser by hand to play around with, building it first if needed:
 *
 *   node tools/local-browsers/electron/open.mjs [url] [--mode=loose|strict] [--no-devtools]
 *
 * Point it at a page from the test server (`npm run test-server`) to see the agent running in
 * Electron. DevTools is open by default. Strict mode applies its CSP, which a test-server page only
 * satisfies when it was served with `nonce=manual` in its query string.
 */
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: 'string', default: 'loose' },
    devtools: { type: 'boolean', default: true }
  },
  allowNegative: true
})
if (!['loose', 'strict'].includes(values.mode)) throw new Error(`Unknown mode "${values.mode}", expected loose or strict`)

ensureBuilt()

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-electron-open-'))
// Electron-hosted terminals (e.g. VS Code) export ELECTRON_RUN_AS_NODE, which stops the app from opening a window
const { ELECTRON_RUN_AS_NODE, ...env } = process.env
const child = spawn(packagedExecutable(), [
  `--nr-mode=${values.mode}`,
  `--user-data-dir=${userDataDir}`,
  ...(values.mode === 'strict' ? ['--nr-csp-nonce=manual'] : []),
  ...(values.devtools ? ['--nr-devtools'] : []),
  ...(positionals[0] ? [`--nr-url=${positionals[0]}`] : [])
], { stdio: 'inherit', env })

child.on('exit', (code) => {
  fs.rmSync(userDataDir, { recursive: true, force: true })
  process.exit(code ?? 0)
})
process.on('SIGINT', () => child.kill())
