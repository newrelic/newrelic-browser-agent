import browserList from '../util/browser-list.mjs'
import jilArgs from '../args.mjs'
import {
  getSauceConnectTunnelName,
  getSauceLabsCreds
} from '../util/saucelabs.mjs'

function sauceCapabilities () {
  return browserList(jilArgs.browsers).map((browserSpec) => {
    const capability = {
      browserName: browserSpec.desired.browserName,
      platformName: browserSpec.desired.platformName,
      browserVersion: browserSpec.desired.browserVersion
    }

    if (!jilArgs.sauce) {
      capability['sauce:options'] = {
        tunnelName: getSauceConnectTunnelName()
      }
    }

    return capability
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
