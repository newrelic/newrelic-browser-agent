import { FeatureBase } from './feature-base'
import { isValid } from '../../common/config/info'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'
import { drain } from '../../common/drain/drain'
import { activatedFeatures } from '../../common/util/feature-flags'
import { Obfuscator } from '../../common/util/obfuscate'
import { EventBuffer } from './event-buffer'
import { FEATURE_NAMES } from '../../loaders/features/features'

export class AggregateBase extends FeatureBase {
  constructor (agentRef, featureName) {
    super(agentRef.agentIdentifier, featureName)
    this.agentRef = agentRef
    // Jserror and Metric features uses a singleton EventAggregator instead of a regular EventBuffer.
    if ([FEATURE_NAMES.jserrors, FEATURE_NAMES.metrics].includes(this.featureName)) this.events = agentRef.sharedAggregator
    // PVE has no need for eventBuffer, and SessionTrace has its own storage mechanism.
    else if (![FEATURE_NAMES.pageViewEvent, FEATURE_NAMES.sessionTrace].includes(this.featureName)) this.events = new EventBuffer()
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
      this.deregisterDrain()
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
  makeHarvestPayload (shouldRetryOnFail = false, opts = {}) {
    if (this.events.isEmpty(opts)) return
    // Other conditions and things to do when preparing harvest that is required.
    if (this.preHarvestChecks && !this.preHarvestChecks()) return

    if (shouldRetryOnFail) this.events.save(opts)
    const returnedData = this.events.get(opts)
    // A serializer or formatter assists in creating the payload `body` from stored events on harvest when defined by derived feature class.
    const body = this.serializer ? this.serializer(returnedData) : returnedData
    this.events.clear(opts)

    const payload = {
      body
    }
    // Constructs the payload `qs` for relevant features on harvest.
    if (this.queryStringsBuilder) payload.qs = this.queryStringsBuilder(returnedData)
    return payload
  }

  /**
   * Cleanup task after a harvest.
   * @param {Boolean} harvestFailed - harvester flag to restore events in main buffer for retry later if request failed
   */
  postHarvestCleanup (harvestFailed = false, opts = {}) {
    if (harvestFailed) this.events.reloadSave(opts)
    this.events.clearSave(opts)
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
