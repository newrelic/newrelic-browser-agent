import browserList from '../util/browser-list.mjs'
import jilArgs from '../args.mjs'
import {
  getSauceConnectTunnelName,
  getSauceLabsCreds
} from '../util/saucelabs.mjs'

/**
 * Generates an array of "desired capabilities" objects for spinning up instances in SauceLabs for each of the
 * available browser-platform combos that match the pattern provided in the command-line args.
 * @see {@link https://saucelabs.com/products/platform-configurator}
 *
 * @returns An object defining platform capabilities to be requested of SauceLabs.
 */
function sauceCapabilities () {
  return browserList(jilArgs.browsers).map((browserSpec) => {
    const capabilities = {
      browserName: browserSpec.desired.browserName,
      platformName: browserSpec.desired.platformName,
      browserVersion: browserSpec.desired.browserVersion, // ignored for mobile platforms; appium:platformVersion used instead
      'sauce:options': {}
    }

    if (!jilArgs.sauce) {
      capabilities['sauce:options'].tunnelName = getSauceConnectTunnelName()
    }

    if (['iOS', 'Android'].includes(browserSpec.desired.platformName)) {
      capabilities['appium:deviceName'] = browserSpec.desired['appium:deviceName']
      capabilities['appium:platformVersion'] = browserSpec.desired['appium:platformVersion']
      capabilities['appium:automationName'] = browserSpec.desired['appium:automationName'] || browserSpec.desired['XCUITest']
      capabilities['sauce:options']['appiumVersion'] = browserSpec.desired['sauce:options']['appiumVersion']
    }

    return capabilities
  })
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
