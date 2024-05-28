import url from 'url'
import path from 'path'
import child_process from 'child_process'
import browsersSupported from '../../browsers-lists/browsers-supported.json' assert { type: 'json' }
import browsersPolyfill from '../../browsers-lists/browsers-polyfill.json' assert { type: 'json' }
import browsersList from '../../browsers-lists/browsers-list.mjs'
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
  let browsers = browsersSupported

  if (args.polyfills) {
    browsers = browsersPolyfill
  }

  let revision
  try {
    revision = child_process.execSync('git rev-parse --short HEAD').toString().trim()
  } catch (error) {
    console.error(error)
    revision = '¯\\_(ツ)_/¯'
  }

  return browsersList(browsers, args.browsers)
    .map(testBrowser => {
      const capability = {
        'LT:Options': {
          tunnel: true,
          selenium_version: '4.0.0',
          w3c: true,
          build: `Browser Agent: ${testBrowser.browserName[0].toUpperCase()}${testBrowser.browserName.slice(1)} ${testBrowser.browserVersion} - ${testBrowser.platformName} [${revision}]`
        }
      }

      const parsedBrowserName = getBrowserName(testBrowser)
      if (parsedBrowserName !== 'ios' && parsedBrowserName !== 'android') {
        capability.browserName = testBrowser.browserName
        capability.browserVersion = testBrowser.browserVersion
        capability['LT:Options'].platformName = testBrowser.platformName

        if (parsedBrowserName === 'safari') {
          if (testBrowser.browserVersion === '17') {
            capability['LT:Options'].platformName = 'macOS Sonoma'
          }
          if (testBrowser.browserVersion === '16') {
            capability['LT:Options'].platformName = 'macOS Ventura'
          }
        }
      }

      return capability
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
            allowHosts: args.host || 'bam-test-1.nr-local.net',
            logFile: path.resolve(__dirname, '../../../.lambdatest')
          }
        }
      ]
    ]
  }
}
