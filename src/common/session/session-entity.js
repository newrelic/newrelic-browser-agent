import { generateRandomHexString } from '../ids/unique-id'
import { warn } from '../util/console'
import { stringify } from '../util/stringify'
import { documentAddEventListener } from '../event-listener/event-listener-opts'
import { ee } from '../event-emitter/contextual-ee'
import { subscribeToVisibilityChange } from '../window/page-visibility'
import { Timer } from '../timer/timer'
import LocalStorage from '../storage/local-storage.js'
import FPC from '../storage/first-party-cookies'
import { getConfiguration } from '../config/config'
import { isBrowserScope, isWorkerScope } from '../util/global-scope'

const PREFIX = 'NRBA'

export class SessionEntity {
  /**
   * Create a self-managing Session Entity. This entity is scoped to the agent identifier which triggered it, allowing for mutliple simultaneous session objects to exist.
   * The key is inteded to be unique, if not, existing entities in the same agent ID will overlap and overwrite.
   * The value can be overridden in the constructor, but will default to a unique 16 character hex string
   * expiresMs and inactiveMs are used to "expire" the session, but can be overridden in the constructor. Pass 0 to disable expiration timers.
   */
  constructor ({ agentIdentifier, key, value = generateRandomHexString(16), expiresMs = 14400000, inactiveMs = 1800000 }) {
    try {
      if (isWorkerScope) return this.fallback(key, value)
      // session options configured by the customer
      const sessionConfig = getConfiguration(agentIdentifier).session
      // subdomains is a boolean that can be specified by customer.
      // only way to keep the session object across subdomains is using first party cookies
      if (sessionConfig.subdomains) {
        // easiest way to get the root domain to store to the cookie is through user input
        // TODO -- need a way to set the root level domain on the cookie in an elegant way
        this.storage = FPC
      } else {
        this.storage = LocalStorage
      }
    } catch (e) {
      // storage is inaccessible
      warn('Storage API is unavailable. Session information will not operate correctly.', e)
      return this.fallback(key, value)
    }

    this.agentIdentifier = agentIdentifier
    this.ee = ee.get(agentIdentifier)

    // key is intended to act as the k=v pair
    this.key = key
    // value is intended to act as value of a k=v pair
    this.value = value

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
      this.expiresAt = initialRead?.expiresAt || this.getFutureTimestamp(expiresMs)
      this.expireTimer = new Timer(() => this.reset(), this.expiresAt - Date.now())
    }

    // the set-up of the timer used to expire the session due to "inactivity" at a certain time
    // this gets ignored if the value is falsy, allowing for session entities that do not expire
    // this gets "refreshed" when "activity" is observed
    this.inactiveMs = inactiveMs
    if (inactiveMs) {
      this.inactiveAt = initialRead?.inactiveAt || this.getFutureTimestamp(inactiveMs)
      this.inactiveTimer = new Timer(() => this.reset(), inactiveMs)
    }

    // The fact that the session is "new" or pre-existing is used in some places in the agent.  Session Replay and Trace
    // can use this info to inform whether to trust a new sampling decision vs continue a previous tracking effort.
    this.isNew = !Object.keys(initialRead).length
    // if its a "new" session, we write to storage API with the default values.  These values ,ay change over the lifespan of the agent run.
    if (this.isNew) this.write({ value, sessionReplayActive: false, sessionTraceActive: false, inactiveAt: this.inactiveAt, expiresAt: this.expiresAt }, true)

    // the abort controller is used to "reset" the event listeners and prevent them from duplicating when new sessions are created
    try { this.abortController = new AbortController() } // this try-catch can be removed when IE11 is completely unsupported & gone
    catch (e) {}

    // listen for "activity", if seen, "refresh" the inactivty timer
    // "activity" also includes "page visibility - visible", but that is handled below in a different event sub
    documentAddEventListener('scroll', this.refresh.bind(this), false, this.abortController?.signal)
    documentAddEventListener('keypress', this.refresh.bind(this), false, this.abortController?.signal)
    documentAddEventListener('click', this.refresh.bind(this), false, this.abortController?.signal)

    // watch for the vis state changing.  If the page is hidden, the local inactivity timer should be paused
    // if the page is brought BACK to visibility and the timer hasnt "naturally" expired, refresh the timer...
    // this is to support the concept that other tabs could be experiencing activity.  The thought would be that
    // "backgrounded" tabs would pause, while "closed" tabs that "reopen" will just instantiate a new SessionEntity class if restored
    // which will do a "hard" check of the timestamps.
    subscribeToVisibilityChange((state) => {
      if (state === 'hidden') {
        this.inactiveTimer.pause()
        this.inactiveAt = this.getFutureTimestamp(inactiveMs)
        this.write({ ...this.read(), inactiveAt: this.inactiveAt })
      }
      else {
        if (this.expireTimer.isValid()) {
          this.refresh()
        } else {
          this.reset()
        }
      }
    }, false, false, this.abortController?.signal)

    console.log('session', this.key, this.value, 'expires at ', this.expiresAt, 'which is in ', (this.expiresAt - Date.now()) / 1000 / 60, 'minutes')
    this.initialized = true
  }

  fallback (key, value) {
    return Object.assign(this, { key, value, sessionReplayActive: false, sessionTraceActive: false, isNew: true, read: () => this, write: (vals) => Object.assign(this, vals), reset: () => Object.assign(this, new SessionEntity(this)) })
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
      const obj = this.decompress(JSON.parse(val))
      if (this.isInvalid(obj)) return {}
      if (this.isExpired(obj.expiresAt)) return this.reset()
      // if "inactive" timer is expired at "read" time -- esp. initial read -- reset
      if (this.isExpired(obj.inactiveAt)) return this.reset()
      Object.keys(obj).forEach(k => {
        this[k] = obj[k]
      })
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
      this.storage.set(this.lookupKey, stringify(this.compress(data)))
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
      this.storage.remove(this.lookupKey)
      this.abortController?.abort()
      this.inactiveTimer?.end()
      this.expireTimer?.end()
      if (this.initialized) setTimeout(() => this.ee.emit('new-session'), 1)
      const newSess = new SessionEntity({ agentIdentifier: this.agentIdentifier, key: this.key })
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
    this.inactiveTimer.refresh()
    this.inactiveAt = this.getFutureTimestamp(this.inactiveMs)
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
   * @returns {Date}
   */
  getFutureTimestamp (futureMs) {
    return new Date().setMilliseconds(new Date().getMilliseconds() + futureMs)
  }

  compress (obj) {
    // no compression applied at this time
    // could use bel-serializer encoding here if prioritized
    return obj
  }

  decompress (obj) {
    // no need to decompress if we aren't compressing
    return obj
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
      this.write({ ...curr, custom: { ...curr?.custom || {}, [key]: value } })
    }
  }
}
