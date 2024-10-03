import { FeatureBase } from './feature-base'
import { getInfo, isValid } from '../../common/config/info'
import { getRuntime } from '../../common/config/runtime'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'
import { deregisterDrain, drain } from '../../common/drain/drain'
import { activatedFeatures } from '../../common/util/feature-flags'
import { Obfuscator } from '../../common/util/obfuscate'
import { EventBuffer2 } from './event-buffer'

export class AggregateBase extends FeatureBase {
  constructor (...args) {
    super(...args)
    this.events = new EventBuffer2()
    this.checkConfiguration()
    this.obfuscator = getRuntime(this.agentIdentifier).obfuscator
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
   * Return harvest payload. A "serializer" function can be defined on a derived class to format the payload.
   * @param {Boolean} shouldRetryOnFail - harvester flag to backup payload for retry later if harvest request fails; this should be moved to harvester logic
   * @returns final payload, or undefined if there are no pending events
   */
  makeHarvestPayload (shouldRetryOnFail = false) {
    if (this.events.isEmpty()) return

    if (shouldRetryOnFail) this.events.save()
    const payload = this.serializer ? this.serializer(this.events.get()) : this.events.get()
    this.events.clear()

    return {
      body: payload
    }
  }

  /**
   * Cleanup task after a harvest.
   * @param {Boolean} harvestFailed - harvester flag to restore events in main buffer for retry later if request failed
   */
  postHarvestCleanup (harvestFailed = false) {
    if (harvestFailed) this.events.reloadSave()
    this.events.clearSave()
  }

  /**
   * Checks for additional `jsAttributes` items to support backward compatibility with implementations of the agent where
   * loader configurations may appear after the loader code is executed.
   */
  checkConfiguration () {
    // NOTE: This check has to happen at aggregator load time
    if (!isValid(this.agentIdentifier)) {
      const cdn = gosCDN()
      let jsAttributes = { ...cdn.info?.jsAttributes }
      try {
        jsAttributes = {
          ...jsAttributes,
          ...getInfo(this.agentIdentifier)?.jsAttributes
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
        runtime: getRuntime(this.agentIdentifier)
      })
    }

    const runtime = getRuntime(this.agentIdentifier)
    if (!runtime.obfuscator) {
      runtime.obfuscator = new Obfuscator(this.agentIdentifier)
    }
  }
}
