import fs from 'fs'
import { BROWSER_LASTEST_VERSIONS_FILE_PATH, MOBILE_VERSIONS_FILE_PATH } from './constants.js'

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
  const lastVersions = JSON.parse(await fs.promises.readFile(BROWSER_LASTEST_VERSIONS_FILE_PATH))
  const mobileVersions = JSON.parse(await fs.promises.readFile(MOBILE_VERSIONS_FILE_PATH))

  const min = {}
  const max = {}

  for (let browser in lastVersions) {
    if (browser === 'safari_min') continue // only do 'safari' not both
    const curVersion = lastVersions[browser]
    max[browser] = Number(curVersion)
    // chromium & ff follows major versioning releases, while safari doesn't
    if (browser === 'safari') min[browser] = Number(lastVersions['safari_min'])
    else min[browser] = max[browser] - 10
  }

  for (let mobile in mobileVersions) {
    const specsArray = mobileVersions[mobile]
    max[mobile] = Number(specsArray[0].version)
    min[mobile] = specsArray[1] ? Number(specsArray[1].version) : max[mobile]
  }

  return { min, max }
}
