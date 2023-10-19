import fs from 'fs'
import path from 'path'
import url from 'url'
import { BROWSER_SUPPORT_LIST_FILE_PATH, ANDROID_CHROME_VERSION } from './constants.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

/**
 * Strips the conventional commit prefix and Jira issue suffix from a title.
 *
 * @param {string} rawTitle - A PR title.
 * @returns {string} A title string ready for release notes.
 */
export function cleanTitle (rawTitle) {
  return rawTitle
    .replaceAll(/^feat:\s*|^fix:\s*|^security:\s*/gi, '')
    .replaceAll(/(?:[ \-(]*)(?:NR|NEWRELIC)-\d+(?:[, \-)]*)/gi, '')
    .trim()
}

/**
 * Extracts the supported browser versions from the specified JSON file and creates a support string.
 * @param {string} agentVersion The new agent version.
 * @returns {string} The formatted browser target statement.
 */
export async function getBrowserTargetStatement (agentVersion) {
  const browserData = JSON.parse(await fs.promises.readFile(BROWSER_SUPPORT_LIST_FILE_PATH))

  const min = {}
  const max = {}

  for (let browser in browserData) {
    const browserVersions = browserData[browser]
    min[browser] = Infinity
    max[browser] = -Infinity
    for (let browserVersion of browserVersions) {
      const versionNumber = Number(browserVersion.version)
      min[browser] = min[browser] > versionNumber ? versionNumber : min[browser]
      max[browser] = max[browser] < versionNumber ? versionNumber : max[browser]
    }
  }

  return (
    'Consistent with our [browser support policy](https://docs.newrelic.com/docs/browser/new-relic-browser/getting-started/compatibility-requirements-browser-monitoring/#browser-types), ' +
    `${agentVersion} of the Browser agent was built for and tested against these browsers and version ranges: ` +
    `Chrome ${min.chrome}-${max.chrome}, Edge ${min.edge}-${max.edge}, Safari ${min.safari}-${max.safari}, and Firefox ${min.firefox}-${max.firefox}. ` +
    `For mobile devices, ${agentVersion} was built and tested for Android Chrome ${ANDROID_CHROME_VERSION}-${max.chrome} and iOS Safari ${min.ios}-${max.ios}.`
  )
}
