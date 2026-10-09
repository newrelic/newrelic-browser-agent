/* Hands the test bootstrap config (see main.cjs) to the renderer's main world as `window.nrBootstrap`. */
const { contextBridge, ipcRenderer } = require('electron')

const bootstrap = ipcRenderer.sendSync('nr-bootstrap')
if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('nrBootstrap', bootstrap)
} else {
  window.nrBootstrap = bootstrap
}
