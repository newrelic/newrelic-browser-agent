import semver from 'semver'
import browsersPolyfill from './browsers-polyfill.json' assert { type: "json" }
import browsersSupported from './browsers-supported.json' assert { type: "json" }
import browsersSelenium from 'jil/util/browsers-selenium.json' assert { type: "json" }
import jilArgs from '../args.mjs'

let allowedBrowsers = browsersSupported
const latestVersStringRe = /latest(?:-[1-9])?$/

if (jilArgs.polyfills) {
  allowedBrowsers = browsersPolyfill
} else if (jilArgs.seleniumServer) {
  allowedBrowsers = browsersSelenium
}

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
    var result = !!Array.from(list).filter((b) => this.same(b)).length
    return result
  }

  same (other) {
    return (
      this.desired.platformName === other.desired.platformName &&
      this.desired.platformVersion === other.desired.platformVersion &&
      this.desired.browserName === other.desired.browserName &&
      this.desired.platform === other.desired.platform &&
      this.desired.version === other.desired.version
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

export default function browserList (pattern = 'chrome@latest') {
  const requested = pattern
    .trim()
    .split(/\s*,\s*/)
    .map(parse)
    .reduce((a, b) => a.concat(b), [])

  const specs = requested.map((b) => new BrowserSpec(b))
  const specSet = new Set(specs)
  const sortedSpecs = Array.from(specSet).sort((a, b) => {
    if (a.browserName === b.browserName) {
      return semver.lt(cleanVersion(a.version), cleanVersion(b.version))
        ? -1
        : 1
    }
    return a.browserName < b.browserName ? -1 : 1
  })

  return sortedSpecs
}

function parse (pattern) {
  const [browserFull, platform] = pattern.split('/')
  const [browser, range] = browserFull.split('@')
  return getBrowsersFor(browser || 'chrome', range, platform)
}

function getBrowsersFor (browser, range, platform) {
  let list = []
  if (allowedBrowsers[browser]) list = allowedBrowsers[browser].slice()
  else if (browser === '*') { list = Object.keys(allowedBrowsers).reduce(
    (list, browser) => list.concat(allowedBrowsers[browser]),
    []
  ) }

  list.sort((a, b) =>
    semver.lt(cleanVersion(a.version), cleanVersion(b.version)) ? 1 : -1
  )

  if (!range && !platform) {
    return list
  } else if (range === 'beta') {
    return list.filter(
      (option) => option.platformVersion === 'beta' || option.version === 'beta'
    )
  } else if (latestVersStringRe.test(range)) {
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
      cleanVersion(option.platformVersion || option.version),
      range
    )
  })
}

function cleanVersion (version) {
  // assign to high number, so that it is high in the list when sorted (i.e. beta is highest)
  if (!version || latestVersStringRe.test(version)) {
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
