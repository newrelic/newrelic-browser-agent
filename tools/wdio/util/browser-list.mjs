import semver from 'semver'
import browsersPolyfill from './browsers-polyfill.json' assert { type: "json" }
import browsersSupported from './browsers-supported.json' assert { type: "json" }
import browsersSelenium from '../../jil/util/browsers-selenium.json' assert { type: "json" }
import jilArgs from '../args.mjs'

let allowedBrowsers = browsersSupported
const LATEST_VERSION_PATTERN = /latest(?:-[1-9])?$/

if (jilArgs.polyfills) {
  allowedBrowsers = browsersPolyfill
} else if (jilArgs.seleniumServer) {
  allowedBrowsers = browsersSelenium
}

/**
 * Represents a specification for a browser and its platform.
 * @class
 * @param {object} desired - An object specifying the desired browser and platform.
 */
export class BrowserSpec {
  constructor (desired) {
    this.desired = desired
  }

  allowsExtendedDebugging () {
    return (
      ['chrome', 'firefox'].includes(this.desired.browserName) &&
      this.version === 'latest'
    )
  }

  toString () {
    return `${this.browserName}@${this.version} (${this.platformName})`
  }

  match (specString) {
    let list = browserList(specString)
    return !!Array.from(list).filter((b) => this.same(b)).length
  }

  same (other) {
    return (
      this.platformName === other.platformName &&
      this.browserName === other.browserName &&
      this.browserVersion === other.browserVersion
    )
  }

  hasFeature (feature) {
    let matcher = BrowserMatcher.withFeature(feature)
    return matcher.match(this)
  }

  get isMobile () {
    return !!(this.desired.platformName && this.desired.platformVersion)
  }

  get platformName () {
    if (this.desired.platformName) {
      return this.desired.platformName.toLowerCase()
    }
    if (this.desired.platform) {
      return this.desired.platform.toLowerCase()
    }
    return ''
  }

  get platformVersion () {
    return this.desired.platformVersion
  }

  get browserName () {
    return this.isMobile ? this.platformName : this.desired.browserName
  }

  get version () {
    return this.isMobile ? this.platformVersion : this.desired.version
  }
}

/**
 * Accepts a comma-delimited list of browsers and parses and filters it into an array of BrowserSpec objects.
 * Excludes any browsers not supported or not available.
 *
 * @param {*} pattern - A comma-separated list of browsers in the format `<browser>@<version>` and an optional `/<platform>`.
 * @returns {Array} - A sorted array of supported/available browsers matching the pattern.
 */
export default function browserList (pattern = 'chrome@latest') {
  const requested = pattern
    .trim()
    .split(/\s*,\s*/)
    .map(parseRequestedBrowser)
    .reduce((a, b) => a.concat(b), [])

  const specs = requested.map((b) => new BrowserSpec(b))
  const specSet = new Set(specs)
  return Array.from(specSet).sort((a, b) => {
    if (a.browserName === b.browserName) {
      return semver.lt(formatVersionString(a.version), formatVersionString(b.version))
        ? -1
        : 1
    }
    return a.browserName < b.browserName ? -1 : 1
  })
}

/**
 * Parses a string pattern representing a requested browser and returns an array of browser objects
 * matching the requested criteria.
 *
 * @param {string} pattern - The string pattern to parse, in the format "browser[@version]/platform".
 * @returns {Array<Object>} An array of browser objects matching the requested criteria.
 */
function parseRequestedBrowser (pattern) {
  const [browserFull, platform] = pattern.split('/')
  const [browser, range] = browserFull.split('@')
  return getBrowsersFor(browser || 'chrome', range, platform)
}

/**
 * Returns an array of browser objects that match the specified criteria. Excludes unavailable or
 * unsupported browsers.
 *
 * @param {string} browser - The name of the browser to get, or '*' to get all supported browsers.
 * @param {string} [range] - The version range to match, or 'beta' to match only beta releases. Defaults to all.
 * @param {string} [platform] - The name of the platform to match (e.g. "Windows", "Mac"). Defaults to all.
 * @returns {Array<Object>|false} An array of browser objects that match the specified criteria, or `false` if none
 *     are found. Each browser object has three string properties: name, version, and platform.
 */
function getBrowsersFor (browser, range, platform) {
  let list = []
  if (allowedBrowsers[browser]) list = allowedBrowsers[browser].slice()
  else if (browser === '*') {
    list = Object.keys(allowedBrowsers).reduce(
      (list, browser) => list.concat(allowedBrowsers[browser]),
      []
    )
  }

  list.sort((a, b) =>
    semver.lt(formatVersionString(a.version), formatVersionString(b.version)) ? 1 : -1
  )

  if (!range && !platform) {
    return list
  } else if (range === 'beta') {
    return list.filter(
      (option) => option.platformVersion === 'beta' || option.version === 'beta'
    )
  } else if (LATEST_VERSION_PATTERN.test(range)) {
    const latestX = list.filter(
      (option) => option.version === range.valueOf() // 'this' should be bound to the lastest version string (object)
    )
    return latestX.length ? latestX : list.slice(0, 1) // default to the highest version if latest-# cannot be found
  }
  if (platform && option.platform.toLowerCase() !== platform.toLowerCase()) {
    return false
  }

  return list.filter((option) => {
    if (option.platformVersion === 'beta' || option.version === 'beta') {
      return false
    }
    // NOTE: 'range' itself needs to be sanitized as semver will not accept "latest - 73" or even "9999 - 73"
    return semver.satisfies(
      formatVersionString(option.platformVersion || option.version),
      range
    )
  })
}

/**
 * Formats a version string in semver style for evaluating against semver ranges. Returns a semver-style string,
 * assigning arbitrary high values for "latest" or "beta". Empty version defaults to latest.
 *
 * @param {string} version - The version string to clean up.
 *   - If `null`, `undefined`, or matches the `LATEST_VERSION_PATTERN` regular expression, returns `'9999.0.0'`.
 *   - If `'beta'`, returns `'10000.0.0'`.
 *   - Otherwise, returns a three-part semver string, adding '.0' segments as needed.
 *
 * @returns {string} A semver-formatted string.
 */
function formatVersionString (version) {
  // assign to high number, so that it is high in the list when sorted (i.e. beta is highest)
  if (!version || LATEST_VERSION_PATTERN.test(version)) {
    const prevVersionOffset = version?.split('-')[1]
    if (prevVersionOffset) {
      version = '9999' - prevVersionOffset
    } else {
      version = '9999' // undefined 'version' (e.g., mobile) will be set to 'latest' too
    }
  } else if (version === 'beta') {
    version = '10000'
  }
  version = version + '.0.0'
  return version.split('.', 3).join('.')
}
