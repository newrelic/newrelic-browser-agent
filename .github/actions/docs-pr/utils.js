import fs from 'fs'
import { BROWSER_SUPPORT_LIST_FILE_PATH } from './constants.js'

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
 * @returns {string} The min and max browser versions
 */
export async function getBrowserVersions () {
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

  return { min, max }
}
