import url from 'url'
import path from 'path'
import child_process from 'child_process'
import desktopBrowsers from '../../browsers-lists/lt-desktop-supported.json' assert { type: 'json' }
import mobileBrowsers from '../../browsers-lists/lt-mobile-supported.json' assert { type: 'json' }
import browsersPolyfill from '../../browsers-lists/lt-polyfill.json' assert { type: 'json' }
import browsersList from '../../browsers-lists/lt-browsers-list.mjs'
import args from '../args.mjs'
import { getBrowserName } from '../../browsers-lists/utils.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

/**
 * Generates an array of "desired capabilities" objects for spinning up instances in LambdaTest for each of the
 * available browser-platform combos that match the pattern provided in the command-line args.
 * @see {@link https://saucelabs.com/products/platform-configurator}
 *
 * @returns An object defining platform capabilities to be requested of SauceLabs.
 */
function lambdaTestCapabilities () {
  let supportedDesktop, supportedMobile
  if (args.polyfills) {
    supportedDesktop = browsersPolyfill // just IE11
  } else {
    supportedDesktop = desktopBrowsers
    supportedMobile = mobileBrowsers
  }

  let revision
  try {
    revision = child_process.execSync('git rev-parse --short HEAD').toString().trim()
  } catch (error) {
    console.error(error)
    revision = '¯\\_(ツ)_/¯'
  }

  const processed = browsersList(supportedDesktop, supportedMobile, args.browsers)
  processed.forEach(testBrowser => console.log(testBrowser))
  throw new Error('stop here')

  return browsersList(supportedDesktop, supportedMobile, args.browsers)
    .map(testBrowser => {
      const capabilities = {
        'LT:Options': {
          tunnel: true,
          w3c: true,
          build: `Browser Agent: ${testBrowser.browserName || testBrowser.device_name} ${testBrowser.browserVersion || testBrowser.version} ${testBrowser.platformName} [${revision}]`
        }
      }

      const parsedBrowserName = getBrowserName(testBrowser)
      if (parsedBrowserName !== 'ios' && parsedBrowserName !== 'android') { // the 4 desktop browsers
        capabilities.browserName = testBrowser.browserName
        capabilities.browserVersion = testBrowser.browserVersion
        capabilities['LT:Options'].selenium_version = '4.0.0'
        capabilities['LT:Options'].platformName = testBrowser.platformName
      } else {
        capabilities['LT:Options'].deviceName = testBrowser.device_name
        capabilities['LT:Options'].platformVersion = testBrowser.version
        capabilities['LT:Options'].platformName = parsedBrowserName
      }
      return capabilities
    })
}

export default function config () {
  return {
    user: process.env.LT_USERNAME,
    key: process.env.LT_ACCESS_KEY,
    capabilities: lambdaTestCapabilities(),
    services: [
      [
        'lambdatest',
        {
          tunnel: true,
          sessionNameFormat: (config, capabilities, suiteTitle, testTitle) => suiteTitle,
          lambdatestOpts: {
            // allowHosts: args.host || 'bam-test-1.nr-local.net',
            logFile: path.resolve(__dirname, '../../../.lambdatest')
          }
        }
      ]
    ]
  }
}
