const fs = require('fs')
const browserslist = require('browserslist')
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

(async function () {
  // Fetch an unfiltered list of browser-platform definitions from Sauce Labs.
  console.log('contacting saucelabs API ...')
  const r = await fetch(
    'https://api.us-west-1.saucelabs.com/rest/v1/info/platforms/all',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  const json = await r.json()
  console.log(
    'Browser Types Found:',
    json.reduce((prev, next) => prev.add(next.api_name), new Set())
  )
  console.log(`fetched ${json.length} browsers from saucelabs`)

  // Filter list down to a sample of supported browsers and write metadata to a file for testing.
  fs.writeFileSync(
    './tools/jil/util/browsers-supported.json',
    JSON.stringify(getBrowsers(json), null, 2)
  )
  console.log('saved saucelabs browsers to browsers-supported.json')
})()

/**
 * A template object to be returned by {@link getBrowsers}.
 */
const browsers = {
  chrome: [],
  edge: [],
  safari: [],
  firefox: [],
  android: [], // no longer works with W3C commands.... need to change JIL or do deeper dive to get this to work
  ios: []
}

/**
 * Translates the name of a supported browser to the format used by SauceLabs browser-platform definitions.
 * @param {string} name - The name of a supported browser.
 * @returns {string} The SauceLabs `api_name` associated with the specified browser.
 */
const browserName = (name) => {
  switch (name) {
    case 'edge':
      return 'MicrosoftEdge'
    case 'ios':
      return 'iphone'
    default:
      return name
  }
}

/**
 * Uses browserslist to deterine the minimum supported version based on a particular query.
 * @param {string} query - A {@link https://browsersl.ist|properly formatted} browserslist query.
 * @returns {number} The smallest version number of browsers matching the specified query.
 */
const browserslistMinVersion = (query) => {
  const list = browserslist(query)
  const version = list[list.length - 1].split(' ')[1] // browserslist returns id version pairs like 'ios_saf 16.1'
  return Number(version.split('-')[0]) // versions might be a range (e.g. 14.0-14.4), and we want the low end.
}

/**
 * Returns the minimum version of each browser we support.
 * @param {string} apiName - a SauceLabs browser name (corresponding to the `api_name` property).
 * @returns {number} The minimum version we support of the specified browser name.
 */
const minSupportedVersion = (apiName) => {
  switch (apiName) {
    case 'chrome':
      return browserslistMinVersion('last 10 Chrome versions')
    case 'firefox':
      return browserslistMinVersion('last 10 Firefox versions')
    case 'edge':
    case 'MicrosoftEdge':
      return browserslistMinVersion('last 10 Edge versions')
    case 'safari':
      return Math.floor(browserslistMinVersion('last 10 Safari versions'))
    case 'android':
      // browserslist only ever provides the most recent ChromeAndroid version.
      // Sauce Labs provides only a single Chrome Android version (100) on all emulators.
      // Android version <= 9 on Sauce Labs uses the JSON Wire Protocol by default.
      // https://changelog.saucelabs.com/en/update-to-google-chrome-version-100-on-android-emulators
      return 9
    case 'ios':
    case 'iphone':
      return browserslistMinVersion('last 10 iOS versions')
  }
}

/**
 * Returns the maximum version of each browser we support.
 * @param {string} apiName - a SauceLabs browser name (corresponding to the `api_name` property).
 * @returns {number} The maximum version we support of the specified browser name.
 */
const maxSupportedVersion = (apiName) => {
  switch (apiName) {
    case 'ios':
    case 'iphone': // Sauce only uses Appium 2.0 for ios16 which requires W3C that we don't comply with yet
      return 15.9 // TO DO: this can be removed once that work is incorporated into JIL
    case 'android':
      return 9 // See min value above.
    default:
      return 9999
  }
}

/**
 * Reduces the full array of SauceLabs browser-platform definitions to at most 4 eligible versions for each browser we support.
 * @param {[Object]} sauceBrowsers - An array of SauceLabs browser-platform definitions.
 * @returns {Object} - A set of SauceLabs browser-platform definitions eligible for testing.
 */
function getBrowsers (sauceBrowsers) {
  Object.keys(browsers).forEach((browser) => {
    const name = browserName(browser)
    const versListForBrowser = sauceBrowsers.filter(
      platformSelector(
        name,
        minSupportedVersion(name),
        maxSupportedVersion(name)
      )
    )
    versListForBrowser.sort(
      (a, b) => Number(a.short_version) - Number(b.short_version)
    ) // in ascending version order

    // Remove duplicate version numbers.
    let uniques = []
    let versionsSeen = new Set()
    while (versListForBrowser.length) {
      let nextLatest = versListForBrowser.pop()
      if (versionsSeen.has(nextLatest.short_version)) continue
      uniques.push(nextLatest)
      versionsSeen.add(nextLatest.short_version)
    }

    // We only test 4 versions, so condense the array as needed.
    uniques = evenlySampleArray(uniques, 4)

    // Compose metadata for testing each filtered supported browser.
    uniques.forEach((sauceBrowser) => {
      const metadata = {
        browserName: mobileBrowserName(sauceBrowser),
        platform: mobilePlatformName(sauceBrowser),
        ...(!['safari', 'firefox'].includes(sauceBrowser.api_name) && {
          platformName: mobilePlatformName(sauceBrowser)
        }),
        version: sauceBrowser.short_version,
        ...(sauceBrowser.automation_backend !== 'appium' &&
          !['safari', 'firefox'].includes(sauceBrowser.api_name) && {
          browserVersion: sauceBrowser.short_version
        }),
        ...(sauceBrowser.device && { device: sauceBrowser.device }),
        ...(sauceBrowser.automation_backend === 'appium' && {
          'appium:deviceName': sauceBrowser.long_name
        }),
        ...(sauceBrowser.automation_backend === 'appium' && {
          'appium:platformVersion': sauceBrowser.short_version
        }),
        ...(sauceBrowser.automation_backend === 'appium' && {
          'appium:automationName':
            sauceBrowser.api_name === 'android' ? 'UiAutomator2' : 'XCUITest'
        }),
        ...(sauceBrowser.automation_backend === 'appium' && {
          'sauce:options': {
            appiumVersion: sauceBrowser.recommended_backend_version
          }
        })
      }
      if (metadata.browserName.toLowerCase() === 'safari')
      { metadata.acceptInsecureCerts = false }
      browsers[browser].push(metadata)
    })
  })
  return browsers
}

/**
 * Returns a filter function to include SauceLabs browser-platform definitions with versions only in a certain range, if specified.
 * @param {string} desiredBrowser - The name of the browser (e.g., `safari`).
 * @param {number} minVersion - The minimum browser version to include (e.g., `14`).
 * @param {number} maxVersion - The maximum browser version to include (e.g., `16`).
 * @returns {function} A filter function.
 */
function platformSelector (desiredBrowser, minVersion = 0, maxVersion = 9999) {
  return (sauceBrowser) => {
    if (sauceBrowser.api_name !== desiredBrowser) return false
    if (isNaN(Number(sauceBrowser.short_version))) return false
    if (sauceBrowser.short_version < minVersion) return false
    if (sauceBrowser.short_version > maxVersion) return false

    switch (desiredBrowser) {
      case 'iphone':
      case 'ipad':
      case 'android':
        if (sauceBrowser.automation_backend !== 'appium') return false
        break
      // NOTE: the following platform limitation per browser is FRAGILE -- will have to update this in the future!
      case 'firefox':
        if (sauceBrowser.os !== 'Windows 10') return false // we're only testing FF on Win10
        break
      case 'MicrosoftEdge':
      case 'chrome':
        if (!sauceBrowser.os.startsWith('Windows 1')) return false // exclude Linux, Mac, and pre-Win10
        break
      // 'safari' will only ever be on MacOS
      case 'safari':
        if (sauceBrowser.short_version == 12 && sauceBrowser.os == 'Mac 10.13')
        { return false } // this OS+safari combo has issues with functional/XHR tests
        break
    }
    return true
  }
}

/**
 * Returns a new array consisting of `n` or fewer evenly distributed elements from the input array, including the first and last elements.
 * @param {[]} arr - An input array.
 * @param {integer} n - The desired size of the returned array.
 * @returns {[]} A new array of size <= `n`.
 */
function evenlySampleArray (arr, n = 4) {
  if (arr.length < 2 || arr.length <= n) return arr
  if (n === 1) {
    return [arr[0]]
  }
  if (n === 0) {
    return []
  }

  const lastIndex = arr.length - 1
  const slicePercentage = 1 / (n - 1)
  const samples = []

  for (let i = 0; i < n; i++) {
    samples.push(arr[Math.round(slicePercentage * i * lastIndex)])
  }

  return samples
}

/**
 * Returns the name of the mobile browser associated with a particular SauceLabs browser-platform definition.
 * @param {Object} sauceBrowser - A SauceLabs browser-platform definition object containing the property `api_name` (e.g., `ipad`).
 * @returns {string} The name of the mobile browser used by the specified SauceLabs browser-platform definition (e.g., `Safari`).
 */
function mobileBrowserName (sauceBrowser) {
  switch (sauceBrowser.api_name) {
    case 'iphone':
    case 'ipad':
      return 'Safari'
    case 'android':
      return 'Chrome'
    default:
      return sauceBrowser.api_name
  }
}

/**
 * Returns the name of the mobile platform associated with a particular SauceLabs browser-platform definition.
 * @param {Object} sauceBrowser - A SauceLabs browser-platform definition object containing the property `api_name` (e.g., `ipad`).
 * @returns {string} The name of the mobile platform associated with the specified SauceLabs browser-platform definition (e.g., `iOS`).
 */
function mobilePlatformName (sauceBrowser) {
  switch (sauceBrowser.api_name) {
    case 'iphone':
    case 'ipad':
      return 'iOS'
    case 'safari':
      // return browser.os.replace('Mac', 'macOS')
      return sauceBrowser.os
    case 'android':
      return 'Android'
    default:
      return sauceBrowser.os
  }
}
