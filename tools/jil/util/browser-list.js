/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const browsers = require('./browsers.json')
const semver = require('semver')
const BrowserMatcher = require('./browser-matcher')

// list of pre-defined browsers = require(test matrix
var allowedBrowsers = browsers

class BrowserSpec {
  constructor (desired) {
    this.desired = desired
  }

  isPhantom () {
    return this.desired.browserName === 'phantom'
  }

  allowsExtendedDebugging () {
    return ['chrome', 'firefox'].includes(this.desired.browserName) && this.version === 'latest'
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

// used for testing
function setBrowserList(newBrowsers) {
  allowedBrowsers = newBrowsers
}

function resetBrowserList() {
  allowedBrowsers = browsers
}

function browserList (pattern = 'phantom@latest') {
  let requested = pattern.trim().split(/\s*,\s*/)
    .map(parse)
    .reduce((a, b) => a.concat(b), [])

  let specs = requested.map((b) => new BrowserSpec(b))
  let specSet = new Set(specs)
  let sortedSpecs = Array.from(specSet).sort((a, b) => {
    if (a.browserName === b.browserName) {
      return semver.lt(cleanVersion(a.version), cleanVersion(b.version)) ? -1 : 1
    }
    return a.browserName < b.browserName ? -1 : 1
  })

  return sortedSpecs
}

function parse (pattern) {
  let [browser, range] = pattern.split('@')
  return getBrowsersFor(browser || 'phantom', range)
}

function getBrowsersFor (browser, range) {
  let list = []
  if (allowedBrowsers[browser]) list = allowedBrowsers[browser].slice()
  else if (browser === '*') list = Object.keys(allowedBrowsers).reduce(merge, [])

  list.sort(byVersion)

  if (!range) {
    return list
  } else if (range === 'beta') {
    return list.filter(findBetaVersions)
  } else if (range === 'latest') {
    var latest = list.filter(findLatestVersions)
    return latest.length ? latest : list.slice(0, 1)
  }

  list = list.filter(inRange)
  return list

  function inRange (option) {
    if (option.platformVersion === 'beta' || option.version === 'beta') {
      return false
    }
    return semver.satisfies(cleanVersion(option.platformVersion || option.version), range)
  }

  function findBetaVersions (option) {
    return (option.platformVersion === 'beta' || option.version === 'beta')
  }

  function findLatestVersions (option) {
    return (option.version === 'latest')
  }
}

function byVersion (left, right) {
  return semver.lt(cleanVersion(left.version), cleanVersion(right.version)) ? 1 : -1
}

function cleanVersion (version) {
  // assign to high number, so that it is high in the list when sorted (i.e. beta is latest)
  if (!version || version === 'latest') version = '9999'
  if (!version || version === 'beta') version = '10000'
  version = version + '.0.0'
  return version.split('.', 3).join('.')
}

function merge (list, browser) {
  return list.concat(allowedBrowsers[browser])
}

module.exports = browserList
module.exports.BrowserSpec = BrowserSpec
module.exports.setBrowserList = setBrowserList
module.exports.resetBrowserList = resetBrowserList
