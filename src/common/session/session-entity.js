import { generateRandomHexString } from '../ids/unique-id'
import { warn } from '../util/console'
import { stringify } from '../util/stringify'
import { ee } from '../event-emitter/contextual-ee'
import { Timer } from '../timer/timer'
import { isBrowserScope } from '../util/global-scope'
import { DEFAULT_EXPIRES_MS, DEFAULT_INACTIVE_MS, PREFIX } from './constants'
import { LocalMemory } from '../storage/local-memory'
import { InteractionTimer } from '../timer/interaction-timer'
import { wrapEvents } from '../wrap'
import { getModeledObject } from '../config/state/configurable'
import { handle } from '../event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { FEATURE_NAMES } from '../../loaders/features/features'

// this is what can be stored in local storage (not enforced but probably should be)
// these values should sync between local storage and the parent class props
const model = {
  value: '',
  inactiveAt: 0,
  expiresAt: 0,
  updatedAt: Date.now(),
  sessionReplayActive: false,
  sessionTraceActive: false,
  custom: {}
}

export const SESSION_EVENTS = {
  PAUSE: 'session-pause',
  RESET: 'session-reset',
  RESUME: 'session-resume'
}

export class SessionEntity {
  /**
   * Create a self-managing Session Entity. This entity is scoped to the agent identifier which triggered it, allowing for multiple simultaneous session objects to exist.
   * There is one "namespace" an agent can store data in LS -- NRBA_{key}. If there are two agents on one page, and they both use the same key, they could overwrite each other since they would both use the same namespace in LS by default.
   * The value can be overridden in the constructor, but will default to a unique 16 character hex string
   * expiresMs and inactiveMs are used to "expire" the session, but can be overridden in the constructor. Pass 0 to disable expiration timers.
   */
  constructor (opts) {
    this.state = {}
    this.setup(opts)
  }

  setup ({ agentIdentifier, key, value = generateRandomHexString(16), expiresMs = DEFAULT_EXPIRES_MS, inactiveMs = DEFAULT_INACTIVE_MS, storageAPI = new LocalMemory() }) {
    if (!agentIdentifier || !key) throw new Error('Missing Required Fields')
    if (!isBrowserScope) this.storage = new LocalMemory()
    else this.storage = storageAPI // new LocalStorage()

    this.sync(model)

    this.agentIdentifier = agentIdentifier
    // key is intended to act as the k=v pair
    this.key = key
    // value is intended to act as the primary value of the k=v pair
    this.state.value = value

    this.expiresMs = expiresMs
    this.inactiveMs = inactiveMs

    this.ee = ee.get(agentIdentifier)

    wrapEvents(this.ee)

    // the first time the session entity class is instantiated, we check the storage API for an existing
    // object. If it exists, the values inside the object are used to inform the timers that run locally.
    // if the initial read is empty, it allows us to set a "fresh" "new" session immediately.
    // the local timers are used after the session is running to "expire" the session, allowing for pausing timers etc.
    // the timestamps stored in the storage API can be checked at initial run, and when the page is restored, otherwise we lean
    // on the local timers to expire the session
    const initialRead = this.read()

    // the set-up of the timer used to expire the session "naturally" at a certain time
    // this gets ignored if the value is falsy, allowing for session entities that do not expire
    if (expiresMs) {
      this.state.expiresAt = initialRead?.expiresAt || this.getFutureTimestamp(expiresMs)
      this.expiresTimer = new Timer({
        // When the inactive timer ends, collect a SM and reset the session
        onEnd: () => {
          this.collectSM('expired', this)
          this.collectSM('duration', this)
          this.reset()
        }
      }, this.state.expiresAt - Date.now())
    } else {
      this.state.expiresAt = Infinity
    }

    // the set-up of the timer used to expire the session due to "inactivity" at a certain time
    // this gets ignored if the value is falsy, allowing for session entities that do not expire
    // this gets "refreshed" when "activity" is observed
    if (inactiveMs) {
      this.state.inactiveAt = initialRead?.inactiveAt || this.getFutureTimestamp(inactiveMs)
      this.inactiveTimer = new InteractionTimer({
        // When the inactive timer ends, collect a SM and reset the session
        onEnd: () => {
          this.collectSM('inactive', this)
          this.collectSM('duration', this)
          this.reset()
        },
        // When the inactive timer refreshes, it will update the storage values with an update timestamp
        onRefresh: this.refresh.bind(this),
        onResume: () => { this.ee.emit(SESSION_EVENTS.RESUME) },
        // When the inactive timer pauses, update the storage values with an update timestamp
        onPause: () => {
          if (this.initialized) this.ee.emit(SESSION_EVENTS.PAUSE)
          this.write(getModeledObject(this.state, model))
        },
        ee: this.ee,
        refreshEvents: ['click', 'keydown', 'scroll']
      }, this.state.inactiveAt - Date.now())
    } else {
      this.state.inactiveAt = Infinity
    }

    // The fact that the session is "new" or pre-existing is used in some places in the agent.  Session Replay and Trace
    // can use this info to inform whether to trust a new sampling decision vs continue a previous tracking effort.
    if (this.isNew === undefined) this.isNew = !Object.keys(initialRead).length
    // if its a "new" session, we write to storage API with the default values.  These values may change over the lifespan of the agent run.
    // we can use a modeled object here to help us know and manage what values are being used. -- see "model" above
    if (this.isNew) this.write(getModeledObject(this.state, model), true)
    else this.sync(initialRead)

    this.initialized = true
  }

  // This is the actual key appended to the storage API
  get lookupKey () {
    return `${PREFIX}_${this.key}`
  }

  sync (data) {
    Object.assign(this.state, data)
  }

  /**
   * Fetch the stored values from the storage API tied to this entity
   * @returns {Object}
   */
  read () {
    try {
      const val = this.storage.get(this.lookupKey)
      if (!val) return {}
      // TODO - decompression would need to happen here if we decide to do it
      const obj = typeof val === 'string' ? JSON.parse(val) : val
      if (this.isInvalid(obj)) return {}
      // if the session expires, collect a SM count before resetting
      if (this.isExpired(obj.expiresAt)) {
        this.collectSM('expired', this)
        this.collectSM('duration', obj, true)
        return this.reset()
      }
      // if "inactive" timer is expired at "read" time -- esp. initial read -- reset
      // collect a SM count before resetting
      if (this.isExpired(obj.inactiveAt)) {
        this.collectSM('inactive', this)
        this.collectSM('duration', obj, true)
        return this.reset()
      }

      return obj
    } catch (e) {
      warn('Failed to read from storage API', e)
      // storage is inaccessible
      return {}
    }
  }

  /**
   * Store data to the storage API tied to this entity
   * To preseve existing attributes, the output of ...session.read()
   * should be appended to the data argument
   * @param {Object} data
   * @returns {Object}
   */
  write (data) {
    try {
      if (!data || typeof data !== 'object') return
      // everytime we update, we can update a timestamp for sanity
      data.updatedAt = Date.now()
      this.sync(data) // update the parent class "state" properties with the local storage values
      //
      // TODO - compression would need happen here if we decide to do it
      this.storage.set(this.lookupKey, stringify(data))
      return data
    } catch (e) {
      // storage is inaccessible
      warn('Failed to write to the storage API', e)
      return null
    }
  }

  reset () {
    // this method should set off a chain of actions across the features by emitting 'new-session'
    // * send off pending payloads
    // * stop recording (stn and sr)...
    // * delete the session and start over
    try {
      if (this.initialized) this.ee.emit(SESSION_EVENTS.RESET)
      this.state = {}
      this.storage.remove(this.lookupKey)
      this.inactiveTimer?.abort?.()
      this.expiresTimer?.clear?.()
      delete this.value
      delete this.isNew

      this.setup({
        agentIdentifier: this.agentIdentifier,
        key: this.key,
        storageAPI: this.storage,
        expiresMs: this.expiresMs,
        inactiveMs: this.inactiveMs
      })
      return this.read()
    } catch (e) {
      return {}
    }
  }

  /**
   * Refresh the inactivity timer data
   */
  refresh () {
    // read here & invalidate
    const existingData = this.read()
    this.write({ ...existingData, inactiveAt: this.getFutureTimestamp(this.inactiveMs) })
  }

  /**
   * @param {number} timestamp
   * @returns {boolean}
   */
  isExpired (timestamp) {
    return Date.now() > timestamp
  }

  /**
   * @param {Object} data
   * @returns {boolean}
   */
  isInvalid (data) {
    const requiredKeys = Object.keys(model)
    return !requiredKeys.every(x => Object.keys(data).includes(x))
  }

  collectSM (type, data, useUpdatedAt) {
    let value, tag
    if (type === 'duration') {
      const startingTimestamp = data.expiresAt - data.expiresMs
      const endingTimestamp = useUpdatedAt ? data.updatedAt : Date.now()
      value = endingTimestamp - startingTimestamp
      tag = 'Session/Duration/Ms'
    }
    if (type === 'expired') tag = 'Session/Expired/Seen'
    if (type === 'inactive') tag = 'Session/Inactive/Seen'

    if (tag) handle(SUPPORTABILITY_METRIC_CHANNEL, [tag, value], undefined, FEATURE_NAMES.metrics, this.ee)
  }

  /**
   * @param {number} futureMs - The number of ms to use to generate a future timestamp
   * @returns {number}
   */
  getFutureTimestamp (futureMs) {
    return Date.now() + futureMs
  }

  syncCustomAttribute (key, value) {
    if (!isBrowserScope) return
    if (value === null) {
      const curr = this.read()
      if (curr.custom) {
        delete curr.custom[key]
        this.write({ ...curr })
      }
    } else {
      const curr = this.read()
      this.custom = { ...(curr?.custom || {}), [key]: value }
      this.write({ ...curr, custom: this.custom })
    }
  }
}
