import { FeatureBase } from './feature-base'
import { isValid } from '../../common/config/info'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'
import { drain } from '../../common/drain/drain'
import { activatedFeatures } from '../../common/util/feature-flags'
import { Obfuscator } from '../../common/util/obfuscate'
import { EventBuffer } from './event-buffer'
import { EventManager } from './event-manager'

export class AggregateBase extends FeatureBase {
  /**
   * Create an AggregateBase instance.
   * @param {Object} agentRef The reference to the agent instance.
   * @param {string} featureName The name of the feature creating the instance.
   * @param {Function} eventStore A method to create a new data store.
   */
  constructor (agentRef, featureName, eventStore = () => new EventBuffer()) {
    super(agentRef.agentIdentifier, featureName)
    this.agentRef = agentRef

    /** use the config'd licenseKey and appId for the default */
    this.eventManager = new EventManager(eventStore, this.agentRef.info)

    /** The default event store points at the configuration target */
    this.events = this.eventManager.get()

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
    return this.eventManager.getAll().map(({ lookupKey, eventBuffer }) => {
      const { licenseKey, applicationID, entityGuid } = JSON.parse(lookupKey)
      const target = { licenseKey, applicationID, entityGuid }
      if (eventBuffer.isEmpty(opts)) return { target, payload: undefined }
      // Other conditions and things to do when preparing harvest that is required.
      if (this.preHarvestChecks && !this.preHarvestChecks()) return { target, payload: undefined }

      if (shouldRetryOnFail) eventBuffer.save(opts)
      const returnedData = eventBuffer.get(opts)
      // A serializer or formatter assists in creating the payload `body` from stored events on harvest when defined by derived feature class.
      const body = this.serializer ? this.serializer(returnedData, target) : returnedData
      eventBuffer.clear(opts)

      const payload = {
        body
      }
      // Constructs the payload `qs` for relevant features on harvest.
      if (this.queryStringsBuilder) payload.qs = this.queryStringsBuilder(returnedData, target)
      return { target, payload }
    })
  }

  /**
   * Cleanup task after a harvest.
   * @param {Boolean} harvestFailed - harvester flag to restore events in main buffer for retry later if request failed
   */
  postHarvestCleanup (harvestFailed = false, opts = {}) {
    const events = this.eventManager.get(opts?.target) // if undefined, will use the default target
    if (harvestFailed) events.reloadSave(opts)
    events.clearSave(opts)
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
