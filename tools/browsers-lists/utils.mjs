import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const ELECTRON_PKG = path.resolve(url.fileURLToPath(new URL('.', import.meta.url)), '../local-browsers/electron/node_modules/electron/package.json')

/**
 * Electron sessions are chromedriver sessions that, to chromedriver, look like chrome (it rejects any other
 * browserName or a browserVersion that isn't the Chromium version). They are identified by the `--nr-mode`
 * launch arg tools/wdio/config/electron.conf.mjs gives the packaged Electron browser.
 * @param {object} capabilities WDIO capabilities of a session
 * @returns {string|undefined} The Electron app's security mode (`loose` or `strict`), undefined for any other browser
 */
export function getElectronMode (capabilities) {
  return capabilities?.['goog:chromeOptions']?.args?.find(arg => arg.startsWith('--nr-mode='))?.slice('--nr-mode='.length)
}

export function getBrowserName (capabilities) {
  if (getElectronMode(capabilities)) return 'electron'

  let { browserName, platformName } = capabilities
  if (!platformName) platformName = capabilities['LT:Options']?.platformName

  if (platformName?.toLowerCase() === 'ios') {
    return 'ios'
  }
  if (platformName?.toLowerCase() === 'android') {
    return 'android'
  }
  if (browserName.toLowerCase() === 'internet explorer') {
    return 'ie'
  }
  if (browserName.toLowerCase() === 'microsoftedge') {
    return 'edge'
  }

  return browserName.toLowerCase()
}

export function getBrowserVersion (capabilities) {
  if (getElectronMode(capabilities)) return JSON.parse(fs.readFileSync(ELECTRON_PKG, 'utf-8')).version

  return capabilities.browserVersion || capabilities['LT:Options']?.platformVersion
}
