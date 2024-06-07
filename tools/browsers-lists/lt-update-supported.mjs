import fs from 'fs-extra'
import url from 'url'
import path from 'path'
import browserslist from 'browserslist'
import fetch from 'node-fetch'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

;(async function () {
  console.log('Fetching platforms from LambdaTest API ...')
  const r = await fetch('https://api.lambdatest.com/automation/api/v1/platforms', {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const { platforms } = await r.json()
  console.log(`Found ${platforms.Desktop.length} desktop platforms and ${platforms.Mobile.length} mobile platforms.`)

  // Filter list down to desired testing specs for mobile. For desktop, we only need the latest LT versions which is what we always test against.
  await fs.writeJSON(path.resolve(__dirname, 'lt-desktop-latest-vers.json'), updateLatestVersions(platforms.Desktop), { spaces: 2 })
  await fs.writeJSON(path.resolve(__dirname, 'lt-mobile-supported.json'), updateMobileVersions(platforms.Mobile), { spaces: 2 })
  console.log('Updated supported browsers jsons in tools/browsers-lists.')
})()

function updateLatestVersions (deskPlatforms) {
  const latestVersionsJson = {}

  const win11 = deskPlatforms.find(p => p.platform === 'Windows 11')
  if (!win11) throw new Error('Windows 11 could not be found in API response.')
  // Assume: json returned by API lists in descending version order for each browser (string comparison).
  const findLatestStableFor = (browserName) => Number(win11.browsers.find(spec => spec.type === 'stable' && spec.browser_name === browserName).version)
  latestVersionsJson.chrome = findLatestStableFor('Chrome')
  latestVersionsJson.edge = findLatestStableFor('MicrosoftEdge')
  latestVersionsJson.firefox = findLatestStableFor('Firefox')

  const macOSes = deskPlatforms.filter(p => p.platform.startsWith('macOS'))
  const safaris = macOSes.map(p => p.browsers.find(spec => spec.browser_name === 'Safari'))
  safaris.sort((a, b) => Number(a.version) - Number(b.version))
  latestVersionsJson.safari = Number(safaris.pop().version)

  return latestVersionsJson
}

/**
 * Reduces the json of LT browser-platform definitions to the latest and the oldest-supported versions for ios & android.
 */
function updateMobileVersions (mobilePlatforms) {
  const MIN_SUPPORTED_IOS = Math.floor(browserslistMinVersion('last 10 iOS versions')) // LT ios versions don't align exactly with browserlist
  const MIN_SUPPORTED_ANDROID = 9.0 // LT should have at least 1 android 9 spec
  const testedMobileVersionsJson = {}

  const iosDevices = mobilePlatforms.find(p => p.platform === 'ios')?.devices
  const androidDevices = mobilePlatforms.find(p => p.platform === 'android')?.devices
  if (!iosDevices || !androidDevices) throw new Error('iOS or Android mobile could not be found in API response.')

  // iOS versions should already be sorted in descending; the built list should also be in desc order.
  const latestiOSVersion = Number(iosDevices[0].version)
  const testediOSVersions = [
    iosDevices.find(spec => Number(spec.version) === latestiOSVersion),
    iosDevices.findLast(spec => Number(spec.version) >= MIN_SUPPORTED_IOS)
  ]
  testediOSVersions.forEach(ltFormatSpec => { ltFormatSpec.platformName = 'ios' })
  testedMobileVersionsJson.ios = testediOSVersions

  const versionIndexedSpecs = {}
  androidDevices.forEach(spec => {
    versionIndexedSpecs[spec.version] = (versionIndexedSpecs[spec.version] || [])
    versionIndexedSpecs[spec.version].push(spec)
  })
  const ascOrderVersions = Object.keys(versionIndexedSpecs).map(verStr => Number(verStr)).sort((a, b) => a - b)
  const testedAndroidVersions = [
    versionIndexedSpecs[ascOrderVersions.pop()][0], // grab first device spec off latest version
    versionIndexedSpecs[MIN_SUPPORTED_ANDROID][0]
  ]
  testedAndroidVersions.forEach(ltFormatSpec => { ltFormatSpec.platformName = 'android' })
  testedMobileVersionsJson.android = testedAndroidVersions

  return testedMobileVersionsJson
}

/**
 * Uses browserslist to determine the minimum supported version based on a particular query.
 * @param {string} query - A {@link https://browsersl.ist|properly formatted} browserslist query.
 * @returns {number} The smallest version number of browsers matching the specified query.
 */
const browserslistMinVersion = query => {
  const list = browserslist(query)
  const version = list[list.length - 1].split(' ')[1] // browserslist returns id version pairs like 'ios_saf 16.1'
  return Number(version.split('-')[0]) // versions might be a range (e.g. 14.0-14.4), and we want the low end.
}
