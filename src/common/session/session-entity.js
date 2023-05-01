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

export class SessionEntity {
  /**
   * Create a self-managing Session Entity. This entity is scoped to the agent identifier which triggered it, allowing for multiple simultaneous session objects to exist.
   * The key is inteded to be unique, if not, existing entities in the same agent ID will overlap and overwrite.
   * The value can be overridden in the constructor, but will default to a unique 16 character hex string
   * expiresMs and inactiveMs are used to "expire" the session, but can be overridden in the constructor. Pass 0 to disable expiration timers.
   */
  constructor ({ agentIdentifier, key, value = generateRandomHexString(16), expiresMs = DEFAULT_EXPIRES_MS, inactiveMs = DEFAULT_INACTIVE_MS, storageAPI = new LocalMemory() }) {
    if (!agentIdentifier || !key) throw new Error('Missing Required Fields')
    if (!isBrowserScope) this.storage = new LocalMemory()
    else this.storage = storageAPI

    // the abort controller is used to "reset" the event listeners and prevent them from duplicating when new sessions are created
    try {
      this.abortController = new AbortController()
    } catch (e) {
      // this try-catch can be removed when IE11 is completely unsupported & gone
    }

    this.agentIdentifier = agentIdentifier

    // key is intended to act as the k=v pair
    this.key = key
    // value is intended to act as the primary value of the k=v pair
    this.value = value

    wrapEvents(ee.get(agentIdentifier))

    // the first time the session entity class is instantiated, we check the storage API for an existing
    // object. If it exists, the values inside the object are used to inform the timers that run locally.
    // if the initial read is empty, it allows us to set a "fresh" "new" session immediately.
    // the local timers are used after the session is running to "expire" the session, allowing for pausing timers etc.
    // the timestamps stored in the storage API can be checked at initial run, and when the page is restored, otherwise we lean
    // on the local timers to expire the session
    const initialRead = this.read()

    // the set-up of the timer used to expire the session "naturally" at a certain time
    // this gets ignored if the value is falsy, allowing for session entities that do not expire
    this.expiresMs = expiresMs
    if (expiresMs) {
      this.expiresAt = initialRead?.expiresAt || this.getFutureTimestamp(expiresMs)
      this.expiresTimer = new Timer({
        onEnd: () => this.reset()
      }, expiresMs)
      // this.expiresTimer = new Timer(() => this.reset(), this.expiresAt - Date.now())
    } else {
      this.expiresAt = Infinity
    }

    // the set-up of the timer used to expire the session due to "inactivity" at a certain time
    // this gets ignored if the value is falsy, allowing for session entities that do not expire
    // this gets "refreshed" when "activity" is observed
    this.inactiveMs = inactiveMs
    if (inactiveMs) {
      this.inactiveAt = initialRead?.inactiveAt || this.getFutureTimestamp(inactiveMs)
      this.inactiveTimer = new InteractionTimer({
        onEnd: () => this.reset(),
        onRefresh: () => this.refresh(),
        ee: ee.get(agentIdentifier),
        refreshEvents: ['click', 'keydown', 'scroll'],
        abortController: this.abortController
      }, inactiveMs)
    } else {
      this.inactiveAt = Infinity
    }

    // The fact that the session is "new" or pre-existing is used in some places in the agent.  Session Replay and Trace
    // can use this info to inform whether to trust a new sampling decision vs continue a previous tracking effort.
    this.isNew = !Object.keys(initialRead).length
    // if its a "new" session, we write to storage API with the default values.  These values ,ay change over the lifespan of the agent run.
    if (this.isNew) this.write({ value, sessionReplayActive: false, sessionTraceActive: false, inactiveAt: this.inactiveAt, expiresAt: this.expiresAt }, true)
    else {
      Object.keys(initialRead).forEach(k => {
        this[k] = initialRead[k]
      })
    }

    this.initialized = true
  }

  // This is the actual key appended to the storage API
  get lookupKey () {
    return `${PREFIX}_${this.key}`
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
      if (this.isExpired(obj.expiresAt)) return this.reset()
      // if "inactive" timer is expired at "read" time -- esp. initial read -- reset
      if (this.isExpired(obj.inactiveAt)) return this.reset()

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
      Object.keys(data).forEach(k => {
        this[k] = data[k]
      })
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
      if (this.initialized) ee.get(this.agentIdentifier).emit('session-reset')
      this.storage.remove(this.lookupKey)
      this.abortController?.abort()
      this.inactiveTimer?.clear?.()
      this.expiresTimer?.clear?.()
      delete this.custom
      delete this.value
      const newSess = new SessionEntity({
        agentIdentifier: this.agentIdentifier,
        key: this.key,
        storageAPI: this.storage,
        expiresMs: this.expiresMs,
        inactiveMs: this.inactiveMs
        // value: value === '0' ? value : undefined // add this back in if we have to send '0' for disabled cookies
      })
      Object.assign(this, newSess)
      return newSess.read()
    } catch (e) {
      return {}
    }
  }

  /**
   * Refresh the inactivity timer data
   */
  refresh () {
    if (!this.expiresTimer.isValid()) this.reset()
    this.inactiveAt = this.getFutureTimestamp(this.inactiveMs)
    this.write({ ...this.read(), inactiveAt: this.inactiveAt })
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
    const requiredKeys = ['value', 'expiresAt', 'inactiveAt']
    return !requiredKeys.every(x => Object.keys(data).includes(x))
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
