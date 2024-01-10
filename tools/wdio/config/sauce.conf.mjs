import browsersSupported from '../../browsers-lists/browsers-supported.json' assert { type: 'json' }
import browsersPolyfill from '../../browsers-lists/browsers-polyfill.json' assert { type: 'json' }
import browsersList from '../../browsers-lists/browsers-list.mjs'
import browserSupportsExtendedDebugging from '../../browsers-lists/extended-debugging.mjs'
import args from '../args.mjs'
import {
  getSauceConnectTunnelName,
  getSauceLabsCreds
} from '../../saucelabs/utils.mjs'
import { getBrowserName } from '../../browsers-lists/utils.mjs'

/**
 * Generates an array of "desired capabilities" objects for spinning up instances in SauceLabs for each of the
 * available browser-platform combos that match the pattern provided in the command-line args.
 * @see {@link https://saucelabs.com/products/platform-configurator}
 *
 * @returns An object defining platform capabilities to be requested of SauceLabs.
 */
function sauceCapabilities () {
  let browsers = browsersSupported

  if (args.polyfills) {
    browsers = browsersPolyfill
  }

  return browsersList(browsers, args.browsers)
    .map(sauceBrowser => {
      const capability = {
        platformName: sauceBrowser.platformName,
        'sauce:options': {
          tunnelName: getSauceConnectTunnelName()
        }
      }

      const parsedBrowserName = getBrowserName(sauceBrowser)
      if (parsedBrowserName !== 'ios' && parsedBrowserName !== 'android') {
        capability.browserName = sauceBrowser.browserName
        capability.browserVersion = sauceBrowser.browserVersion
      } else {
        capability['appium:deviceName'] = sauceBrowser['appium:deviceName']
        capability['appium:platformVersion'] = sauceBrowser['appium:platformVersion']
        capability['appium:automationName'] = sauceBrowser['appium:automationName']

        if (!args.webview) {
          capability.browserName = sauceBrowser.browserName
        }
      }

      if (parsedBrowserName === 'ios') {
        capability['appium:autoAcceptAlerts'] = true
        capability['appium:safariAllowPopups'] = true
        capability['appium:safariIgnoreFraudWarning'] = true
        capability['appium:safariOpenLinksInBackground'] = true

        if (args.webview) {
          capability['appium:app'] = 'storage:filename=NRTestApp.zip'
        }
      } else if (parsedBrowserName === 'android' && args.webview) {
        capability['appium:app'] = 'storage:filename=app-debug.apk'
      }

      if (typeof sauceBrowser['sauce:options'] === 'object') {
        capability['sauce:options'] = {
          ...sauceBrowser['sauce:options'],
          ...capability['sauce:options']
        }
      }

      if (args.sauceExtendedDebugging && browserSupportsExtendedDebugging(sauceBrowser)) {
        capability['sauce:options'].extendedDebugging = true
      }

      if (typeof sauceBrowser.acceptInsecureCerts === 'boolean') {
        capability.acceptInsecureCerts = sauceBrowser.acceptInsecureCerts
      }

      return capability
    })
}

export default function config () {
  return {
    ...getSauceLabsCreds(),
    capabilities: sauceCapabilities(),
    services: [
      [
        'sauce',
        {
          setJobName: (config, capabilities, suiteTitle) => `Browser Agent: ${suiteTitle}`,
          ...(args.sauce
            ? {
                sauceConnect: true,
                sauceConnectOpts: {
                  scVersion: '4.9.0',
                  noSslBumpDomains: 'all',
                  tunnelDomains: args.host || 'bam-test-1.nr-local.net'
                }
              }
            : {}
          )
        }
      ]
    ]
  }
}
