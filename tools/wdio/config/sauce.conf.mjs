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
    .map(sauceBrowser => ({
      ...sauceBrowser,
      platform: undefined,
      version: undefined,
      ...getMobileCapabilities(sauceBrowser),
      'sauce:options': {
        ...(sauceBrowser['sauce:options'] || {}),
        ...(!args.sauce ? { tunnelName: getSauceConnectTunnelName() } : {}),
        ...(args.sauceExtendedDebugging && browserSupportsExtendedDebugging(sauceBrowser) ? { extendedDebugging: true } : {})
      }
    }))
}

function getMobileCapabilities (sauceBrowser) {
  if (getBrowserName(sauceBrowser) === 'ios') {
    return {
      device: undefined,
      acceptInsecureCerts: undefined,
      'appium:autoAcceptAlerts': true,
      'appium:safariAllowPopups': true,
      'appium:safariIgnoreFraudWarning': true,
      'appium:safariOpenLinksInBackground': true
    }
  }

  if (getBrowserName(sauceBrowser) === 'android') {
    return {
      device: undefined,
      acceptInsecureCerts: undefined
    }
  }

  return {}
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
