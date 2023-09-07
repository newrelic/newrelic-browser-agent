import os from 'os'
import process from 'process'
import SauceLabs from 'saucelabs'

/**
 * Retrieves and provides credentials for accessing sauce labs from the process
 * environment variables.
 * @return {{user: string, key: string, region: 'us'}}
 */
export function getSauceLabsCreds () {
  let sauceLabsUsername = process.env.JIL_SAUCE_LABS_USERNAME
  let sauceLabsAccessKey = process.env.JIL_SAUCE_LABS_ACCESS_KEY

  if (!sauceLabsUsername || !sauceLabsAccessKey) {
    throw new Error(
      'Did not find Sauce Labs credentials in JIL_SAUCE_LABS_USERNAME and JIL_SAUCE_LABS_ACCESS_KEY environment variables. Please set them.'
    )
  }

  return {
    user: sauceLabsUsername,
    key: sauceLabsAccessKey,
    region: 'us'
  }
}

/**
 * Builds a deterministic sauce connect tunnel name
 * by using the computer user's name and hostname.
 * @returns {string}
 */
export function getSauceConnectTunnelName () {
  return process.env.USER + '@' + os.hostname()
}

/**
 * Builds out the connection options for use in starting a sauce labs connect tunnel.
 * @param cliArgs JIL cli arguments object parsed through yargs
 */
export function buildSauceConnectOptions (cliArgs) {
  const opts = {
    scVersion: '4.9.1',
    tunnelName: getSauceConnectTunnelName(),
    noSslBumpDomains: 'all',
    logger: console.log,
    tunnelDomains: cliArgs.host || 'bam-test-1.nr-local.net'
  }

  if (cliArgs.quiet) {
    opts.logger = undefined
  } else if (cliArgs.verbose) {
    opts.verbose = true
    opts.verboseDebugging = true
  }

  return opts
}

/**
 * Creates a new sauce connect connection. Once connected, the connection
 * is returned via promise.
 * @param cliArgs
 * @returns {Promise<SauceConnectInstance>}
 */
export async function startSauceConnect (cliArgs) {
  // eslint-disable-next-line new-cap
  const sauce = new SauceLabs.default(getSauceLabsCreds())
  return await sauce.startSauceConnect(buildSauceConnectOptions(cliArgs))
}
