import browsersSupported from '../../browsers-lists/browsers-supported.json' assert { type: "json" }
import browsersAll from '../../browsers-lists/browsers-all.json' assert { type: "json" }
import browsersPolyfill from '../../browsers-lists/browsers-polyfill.json' assert { type: "json" }
import browsersList from '../../browsers-lists/browsers-list.mjs'
import jilArgs from '../args.mjs'
import {
  getSauceConnectTunnelName,
  getSauceLabsCreds
} from '../../saucelabs/utils.mjs'

/**
 * Generates an array of "desired capabilities" objects for spinning up instances in SauceLabs for each of the
 * available browser-platform combos that match the pattern provided in the command-line args.
 * @see {@link https://saucelabs.com/products/platform-configurator}
 *
 * @returns An object defining platform capabilities to be requested of SauceLabs.
 */
function sauceCapabilities () {
  let browsers = browsersSupported

  if (jilArgs.allBrowsers) {
    browsers = browsersAll
  } else if (jilArgs.polyfills) {
    browsers = browsersPolyfill
  }

  return browsersList(browsers, jilArgs.browsers)
    .map(sauceBrowser => ({
      ...sauceBrowser,
      platform: undefined,
      version: undefined,
      'sauce:options': !jilArgs.sauce
        ? {
            tunnelName: getSauceConnectTunnelName(),
            ...(() => {
              if (jilArgs.sauceExtendedDebugging && sauceBrowser.browserName === 'chrome') {
                return { extendedDebugging: true }
              }
            })()
          }
        : {}
    }))
}

export default function config () {
  if (jilArgs.selenium) {
    return {}
  } else {
    return {
      ...getSauceLabsCreds(),
      capabilities: sauceCapabilities(),
      services: [
        [
          'sauce',
          jilArgs.sauce
            ? {
                sauceConnect: true,
                sauceConnectOpts: {
                  noSslBumpDomains: 'all',
                  tunnelDomains: jilArgs.host || 'bam-test-1.nr-local.net'
                }
              }
            : {}
        ]
      ]
    }
  }
}
