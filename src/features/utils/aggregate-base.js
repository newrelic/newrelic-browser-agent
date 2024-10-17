import { FeatureBase } from './feature-base'
import { isValid } from '../../common/config/info'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'
import { deregisterDrain, drain } from '../../common/drain/drain'
import { activatedFeatures } from '../../common/util/feature-flags'
import { Obfuscator } from '../../common/util/obfuscate'

export class AggregateBase extends FeatureBase {
  constructor (agentRef, featureName) {
    super(agentRef.agentIdentifier, featureName)
    this.agentRef = agentRef
    this.checkConfiguration(agentRef)
    this.obfuscator = agentRef.runtime.obfuscator
  }

  /**
   * New handler for waiting for multiple flags. Useful when expecting multiple flags simultaneously (ex. stn vs sr)
   * @param {string[]} flagNames
   * @returns {Promise}
   */
  waitForFlags (flagNames = []) {
    const flagsPromise = new Promise((resolve, reject) => {
      if (activatedFeatures[this.agentIdentifier]) {
        resolve(buildOutput(activatedFeatures[this.agentIdentifier]))
      } else {
        this.ee.on('rumresp', (resp = {}) => {
          resolve(buildOutput(resp))
        })
      }
      function buildOutput (ref) {
        return flagNames.map(flag => {
          if (!ref[flag]) return 0
          return ref[flag]
        })
      }
    })
    return flagsPromise.catch(err => {
      this.ee.emit('internal-error', [err])
      this.blocked = true
      deregisterDrain(this.agentIdentifier, this.featureName)
    })
  }

  drain () {
    drain(this.agentIdentifier, this.featureName)
    this.drained = true
  }

  /**
   * Checks for additional `jsAttributes` items to support backward compatibility with implementations of the agent where
   * loader configurations may appear after the loader code is executed.
   */
  checkConfiguration (existingAgent) {
    // NOTE: This check has to happen at aggregator load time
    if (!isValid(this.agentIdentifier)) {
      const cdn = gosCDN()
      let jsAttributes = { ...cdn.info?.jsAttributes }
      try {
        jsAttributes = {
          ...jsAttributes,
          ...existingAgent.info?.jsAttributes
        }
      } catch (err) {
        // do nothing
      }
      configure({ agentIdentifier: this.agentIdentifier }, {
        ...cdn,
        info: {
          ...cdn.info,
          jsAttributes
        },
        runtime: existingAgent.runtime
      })
    }

    if (!existingAgent.runtime.obfuscator) {
      existingAgent.runtime.obfuscator = new Obfuscator(this.agentIdentifier)
    }
  }
}
