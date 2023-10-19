import fs from 'fs-extra'
import url from 'url'
import path from 'path'
import browserslist from 'browserslist'
import fetch from 'node-fetch'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const supportedBrowsers = ['chrome', 'edge', 'firefox', 'safari', 'android', 'ios']

;(async function () {
  // Fetch an unfiltered list of browser-platform definitions from Sauce Labs.
  console.log('contacting saucelabs API ...')
  const r = await fetch('https://api.us-west-1.saucelabs.com/rest/v1/info/platforms/all', {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const json = await r.json()
  console.log('Browser Types Found:', json.reduce((prev, next) => prev.add(next.api_name), new Set()))
  console.log(`Fetched ${json.length} browsers from saucelabs.`)

  // Filter list down to a sample of supported browsers and write metadata to a file for testing.
  await fs.writeJSON(path.resolve(__dirname, 'browsers-supported.json'), getBrowsers(json), { spaces: 2 })
  console.log('Saved browsers to tools/browsers-lists.')
})()

/**
 * Translates the name of a supported browser to the format used by SauceLabs browser-platform definitions.
 * @param {string} name - The name of a supported browser.
 * @returns {string} The SauceLabs `api_name` associated with the specified browser.
 */
const browserName = name => {
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
const browserslistMinVersion = query => {
  const list = browserslist(query)
  const version = list[list.length - 1].split(' ')[1] // browserslist returns id version pairs like 'ios_saf 16.1'
  return Number(version.split('-')[0]) // versions might be a range (e.g. 14.0-14.4), and we want the low end.
}

/**
 * Returns the minimum version of each browser we support.
 * @param {string} apiName - a SauceLabs browser name (corresponding to the `api_name` property).
 * @returns {number} The minimum version we support of the specified browser name.
 */
const minSupportedVersion = apiName => {
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
const maxSupportedVersion = apiName => {
  if (apiName === 'android') {
    // Android version 13 does not currently work with WDIO/SauceLabs and version 9 through 12 all have
    // the same version of chrome 100.
    // https://changelog.saucelabs.com/en/update-to-google-chrome-version-100-on-android-emulators
    return 13
  }

  return 9999
}

/**
 * Reduces the full array of SauceLabs browser-platform definitions to at most 4 eligible versions for each browser we support.
 * @param {[Object]} sauceBrowsers - An array of SauceLabs browser-platform definitions.
 * @returns {Object} - A set of SauceLabs browser-platform definitions eligible for testing.
 */
function getBrowsers (sauceBrowsers, sample = 4) {
  return supportedBrowsers.reduce((aggregator, name) => {
    const desiredBrowserName = browserName(name)
    const filteredBrowsersList = sauceBrowsers
      // Filter browsers lists for the browsers we want in this iteration
      .filter(sample === Infinity
        ? platformSelector(desiredBrowserName)
        : platformSelector(desiredBrowserName, minSupportedVersion(desiredBrowserName), maxSupportedVersion(desiredBrowserName))
      )
      // Order browsers list by version number in ascending order
      .sort((a, b) => Number(a.short_version) - Number(b.short_version))
      // Remove duplicate version numbers.
      .reduce((aggregator, sauceBrowser) => {
        if (!aggregator[sauceBrowser.short_version]) {
          aggregator[sauceBrowser.short_version] = sauceBrowser
        } else {
          aggregator[sauceBrowser.short_version] = comparePreferredPlatform(aggregator[sauceBrowser.short_version], sauceBrowser)
        }

        return aggregator
      }, {})

    // Sample the version numbers
    aggregator[name] = evenlySampleArray(Object.values(filteredBrowsersList), sample)
      // Construct the metadata needed for the connection to saucelabs
      .map(sauceBrowser => {
        const browserName = mobileBrowserName(sauceBrowser)
        const platformName = mobilePlatformName(sauceBrowser)
        return {
          browserName,
          platformName,
          platform: platformName,
          version: sauceBrowser.short_version,
          ...(sauceBrowser.automation_backend !== 'appium' && {
            browserVersion: sauceBrowser.short_version
          }),
          ...(sauceBrowser.device && { device: sauceBrowser.device }),
          ...(sauceBrowser.automation_backend === 'appium' && { 'appium:deviceName': sauceBrowser.long_name }),
          ...(sauceBrowser.automation_backend === 'appium' && { 'appium:platformVersion': sauceBrowser.short_version }),
          ...(sauceBrowser.automation_backend === 'appium' && { 'appium:automationName': sauceBrowser.api_name === 'android' ? 'UiAutomator2' : 'XCUITest' }),
          ...(sauceBrowser.automation_backend === 'appium' && {
            'sauce:options': {
              appiumVersion: sauceBrowser.recommended_backend_version
            }
          }),
          ...(browserName.toLowerCase() === 'safari' && { acceptInsecureCerts: false }),
          ...(platformName === 'iOS' && { device: 'iPhone Simulator', 'appium:deviceName': 'iPhone Simulator' }),
          ...(platformName === 'Android' && { device: 'Android GoogleAPI Emulator', 'appium:deviceName': 'Android GoogleAPI Emulator' })
        }
      })

    return aggregator
  }, {})
}

/**
 * Returns a filter function to include SauceLabs browser-platform definitions with versions only in a certain range, if specified.
 * @param {string} desiredBrowser - The name of the browser (e.g., `safari`).
 * @param {number} minVersion - The minimum browser version to include (e.g., `14`).
 * @param {number} maxVersion - The maximum browser version to include (e.g., `16`).
 * @returns {function} A filter function.
 */
function platformSelector (desiredBrowser, minVersion = 0, maxVersion = Infinity) {
  return (sauceBrowser) => {
    if (hasKnownConnectionIssue(sauceBrowser)) return false
    if (sauceBrowser.api_name !== desiredBrowser) return false
    if (isNaN(Number(sauceBrowser.short_version))) return false
    if (sauceBrowser.short_version < minVersion) return false
    if (sauceBrowser.short_version > maxVersion) return false

    switch (desiredBrowser) {
      case 'iphone':
      case 'ipad':
        if (sauceBrowser.automation_backend !== 'appium') return false
        break
      // Android 9-12 all have Chrome 100 so there is no sense in testing all of them
      // and JIL cannot use Android > 9.0 due to element selector errors
      case 'android':
        if (sauceBrowser.automation_backend !== 'appium') return false
        if (!['9.0', '13.0'].includes(sauceBrowser.short_version)) return false
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
        if (sauceBrowser.short_version === '15' && sauceBrowser.os !== 'Mac 10.15') return false // Safari 15 has DNS issues on other versions of Mac
        if (sauceBrowser.short_version === '12' && sauceBrowser.os === 'Mac 10.13') return false // this OS+safari combo has issues with functional/XHR tests
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
  if (n === 1) { return [arr[0]] }
  if (n === 0) { return [] }

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
    case 'android':
      return 'Android'
    default:
      return sauceBrowser.os
  }
}

/**
 * May be used to exclude browsers known to have SauceLabs connection issues. For example, for a problem browser the
 * Sauce Connect Proxy might report "The environment you requested was unavailable. Infrastructure Error -- The Sauce
 * VMs failed to start the browser or device."
 * @param {*} sauceBrowser - A SauceLabs browser-platform definition object.
 * @returns {boolean} `true` if SauceLabs has a known issue connecting to the given browser.
 */
function hasKnownConnectionIssue (sauceBrowser) {
  if (sauceBrowser.api_name === 'firefox') {
    return ['59', '57', '49', '47'].includes(sauceBrowser.short_version)
  }

  return false
}

/**
 * Compares two SauceLabs browser definitions and returns the one
 * with the more preferred platform.
 */
function comparePreferredPlatform (sbA, sbB) {
  // Android

  // Prefer newest version with default GoogleAPI Emulator
  if (sbA.api_name?.toLowerCase() === 'android' && sbB.api_name?.toLowerCase() === 'android') {
    return (Number(sbA.version || 0) > Number(sbB.version || 0) || Number(sbA.version || 0) === Number(sbB.version || 0)) &&
      (sbA.device?.toLowerCase() === 'android googleapi emulator' || sbA.long_version?.toLowerCase() === 'android googleapi emulator')
      ? sbA
      : sbB
  }

  // Chrome, Firefox, Edge

  // Windows 11
  if (sbA.os?.toLowerCase() === 'windows 11') {
    return sbA
  } else if (sbB.os?.toLowerCase() === 'windows 11') {
    return sbB
  }

  // Windows 10
  if (sbA.os?.toLowerCase() === 'windows 10') {
    return sbA
  } else if (sbB.os?.toLowerCase() === 'windows 10') {
    return sbB
  }

  // Safari Mac & iOS

  // Mac OS X 13
  if (sbA.os?.toLowerCase() === 'mac 13') {
    return sbA
  } else if (sbB.os?.toLowerCase() === 'mac 13') {
    return sbB
  }

  // Mac OS X 12
  if (sbA.os?.toLowerCase() === 'mac 12') {
    return sbA
  } else if (sbB.os?.toLowerCase() === 'mac 12') {
    return sbB
  }

  // Mac OS X 11
  if (sbA.os?.toLowerCase() === 'mac 11') {
    return sbA
  } else if (sbB.os?.toLowerCase() === 'mac 11') {
    return sbB
  }

  return sbB
}
