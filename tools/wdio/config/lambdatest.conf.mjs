import module from 'node:module'
import url from 'node:url'
import path from 'node:path'
import child_process from 'node:child_process'
import browsersList from '../../browsers-lists/lt-browsers-list.mjs'
import args from '../args.mjs'
import { getBrowserName } from '../../browsers-lists/utils.mjs'
import webviewAssetIds from '../../lambda-test/webview-asset-ids.mjs'

const require = module.createRequire(import.meta.url)
const supportedDesktop = require('../../browsers-lists/lt-desktop-supported.json')
const supportedMobile = require('../../browsers-lists/lt-mobile-supported.json')

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

/**
 * Generates an array of "desired capabilities" objects for spinning up instances in LambdaTest for each of the
 * available browser-platform combos that match the pattern provided in the command-line args.
 * @see {@link https://www.lambdatest.com/capabilities-generator/}
 *
 * @returns An object defining platform capabilities to be requested of LambdaTest.
 */
function lambdaTestCapabilities () {
  let revision
  try {
    revision = child_process.execSync('git rev-parse --short HEAD').toString().trim()
  } catch (error) {
    console.error(error)
    revision = '¯\\_(ツ)_/¯'
  }

  return browsersList(supportedDesktop, supportedMobile, args.browsers)
    .map(testBrowser => {
      const capabilities = {
        'LT:Options': {
          tunnel: true, // this is always needed as true to prevent conn refusal errors in tests regardless if using underpass (app) tunnel or new on-the-fly tunnel
          w3c: true,
          build: `Browser Agent: ${testBrowser.browserName || testBrowser.device_name} ${testBrowser.browserVersion || testBrowser.version} ${testBrowser.platformName} [${revision}]`,
          idleTimeout: Math.floor(args.sessionTimeout / 1000),
          ...(args.extendedDebugging
            ? {
                console: true,
                network: true,
                terminal: true
              }
            : null),
          platformName: testBrowser.platformName
        }
      }

      const parsedBrowserName = getBrowserName(testBrowser)
      if (parsedBrowserName !== 'ios' && parsedBrowserName !== 'android') { // the 4 desktop browsers
        capabilities.browserName = testBrowser.browserName
        capabilities.browserVersion = testBrowser.browserVersion
        capabilities['LT:Options'].selenium_version = '4.22.0'
      } else {
        capabilities['LT:Options'].deviceName = testBrowser.device_name
        capabilities['LT:Options'].platformVersion = testBrowser.version
        if (args.webview) { // btw, LT has different capabilities array for mobile app automation!
          // Note: Since their available devices for app differs, we'll let default pick apply.
          // Caution: LT does not support android@9 for app; we should only be testing webview for latest ios & android.
          capabilities['LT:Options'].deviceName = '.*'
          capabilities['LT:Options'].isRealMobile = false
          // Note: LT expires app every 60 days, so the .zip/.apk needs to be re-uploaded then and these url updated to point to new url.
          // Important: ensure the uploaded apps are set to "team" visibility.
          if (parsedBrowserName === 'android') {
            capabilities['appium:platformName'] = 'android'
            capabilities['LT:Options'].app = webviewAssetIds.androidID
          } else /* === 'ios' */ {
            capabilities['appium:platformName'] = 'ios'
            capabilities['LT:Options'].app = webviewAssetIds.iosID
          }
        } else {
          capabilities['LT:Options'].browserName = testBrowser.browserName
        }
      }
      return capabilities
    })
}

export default function config () {
  const config = {
    protocol: 'https',
    hostname: 'hub.lambdatest.com',
    path: '/wd/hub',
    port: 443,
    user: process.env.LT_USERNAME || process.env.LAMBDA_USERNAME,
    key: process.env.LT_ACCESS_KEY || process.env.LAMBDA_ACCESS_KEY,
    capabilities: lambdaTestCapabilities(),
    ltErrorRemark: true,
    services: [
      [
        'lambdatest',
        {
          tunnel: args.tunnel,
          sessionNameFormat: (config, capabilities, suiteTitle, testTitle) => suiteTitle,
          lambdatestOpts: {
            logFile: path.resolve(__dirname, '../../../.lambdatest'),
            verbose: true
          }
        }
      ]
    ]
  }
  if (args.webview) {
    // LT app automation requires a different hostname
    config.hostname = 'mobile-hub.lambdatest.com'
  }
  return config
}
