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
 * @see {@link https://www.lambdatest.com/capabilities-generator/}
 *
 * @returns An object defining platform capabilities to be requested of LambdaTest.
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
            capabilities['LT:Options'].app = 'lt://APP10160352241718733717577609'
          } else /* === 'ios' */ {
            capabilities['appium:platformName'] = 'ios'
            capabilities['LT:Options'].app = 'lt://APP10160352241718734672953481'
          }
        } else {
          capabilities['appium:platformName'] = testBrowser.device_name
          capabilities['LT:Options'].appiumVersion = '2.6.0'
        }
      }
      return capabilities
    })
}

export default function config () {
  const config = {
    user: process.env.LT_USERNAME || process.env.LAMBDA_USERNAME,
    key: process.env.LT_ACCESS_KEY || process.env.LAMBDA_ACCESS_KEY,
    capabilities: lambdaTestCapabilities(),
    services: [
      [
        'lambdatest',
        {
          tunnel: args.tunnel,
          sessionNameFormat: (config, capabilities, suiteTitle, testTitle) => suiteTitle,
          lambdatestOpts: {
            // allowHosts: args.host || 'bam-test-1.nr-local.net', // @phousley LT `allowHost` has issues with CORs in firefox
            logFile: path.resolve(__dirname, '../../../.lambdatest'),
            verbose: true
          }
        }
      ]
    ]
  }
  if (args.webview) { // LT app automation requires these to be specified
    config.hostname = 'mobile-hub.lambdatest.com'
    config.path = '/wd/hub'
  }
  return config
}
