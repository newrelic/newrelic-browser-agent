import { registerHandler } from '../../common/event-emitter/register-handler'
import { FeatureBase } from './feature-base'
import { getInfo, isConfigured, getRuntime } from '../../common/config/config'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'

export class AggregateBase extends FeatureBase {
  constructor (...args) {
    super(...args)
    this.checkConfiguration()
  }

  /**
   * New handler for waiting for multiple flags. Useful when expecting multiple flags simultaneously (ex. stn vs sr)
   * @param {string[]} flagNames
   * @returns
   */
  waitForFlags (flagNames = []) {
    return Promise.all(
      flagNames.map(fName =>
        new Promise((resolve) => {
          registerHandler(`rumresp-${fName}`, isOn => resolve(isOn), this.featureName, this.ee)
        })
      )
    )
  }

  /**
   * Checks for additional `jsAttributes` items to support backward compatibility with implementations of the agent where
   * loader configurations may appear after the loader code is executed.
   */
  checkConfiguration () {
    // NOTE: This check has to happen at aggregator load time
    if (!isConfigured(this.agentIdentifier)) {
      let jsAttributes = { ...gosCDN().info?.jsAttributes }
      try {
        jsAttributes = {
          ...jsAttributes,
          ...getInfo(this.agentIdentifier)?.jsAttributes
        }
      } catch (err) {
        // do nothing
      }
      configure(this.agentIdentifier, {
        ...gosCDN(),
        info: {
          ...gosCDN().info,
          jsAttributes
        },
        runtime: getRuntime(this.agentIdentifier)
      })
    }
  }
}
