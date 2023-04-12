import { generateRandomHexString } from '../ids/unique-id'
import { warn } from '../util/console'
import { stringify } from '../util/stringify'
import { documentAddEventListener } from '../event-listener/event-listener-opts'
import { ee } from '../event-emitter/contextual-ee'
import { subscribeToVisibilityChange } from '../window/page-visibility'
import { Timer } from '../timer/timer'
import LocalStorage from '../storage/local-storage'
import FPC from '../storage/first-party-cookies'
import { getConfiguration } from '../config/config'

const PREFIX = 'NRBA'
export class SessionEntity {
  constructor ({ agentIdentifier, key, value = generateRandomHexString(16), sessionReplayActive = false, sessionTraceActive = false, expiresMs = 14400000, inactiveMs = 1800000 }) {
    try {
      const sessionConfig = getConfiguration(agentIdentifier).session
      if (sessionConfig.subdomains) {
        FPC.setDomain(sessionConfig.domain)
        this.storage = FPC
      } else {
        this.storage = LocalStorage
      }
    } catch (e) {
      console.log(e)
      // storage is inaccessible
      warn('Storage API is unavailable. Session information will not operate correctly.', e)
      return Object.assign(this, { key, value, sessionReplayActive, sessionTraceActive, isNew: true, read: () => this, write: (vals) => Object.assign(this, vals), reset: () => new SessionEntity(this) })
    }

    this.agentIdentifier = agentIdentifier
    this.ee = ee.get(agentIdentifier)

    this.value = value
    this.key = key

    const initialRead = this.read()
    this.expiresAt = initialRead?.expiresAt || this.getFutureTimestamp(expiresMs)
    this.expireTimer = new Timer(() => this.reset(), this.expiresAt - Date.now())

    this.inactiveMs = inactiveMs
    this.inactiveAt = initialRead?.inactiveAt || this.getFutureTimestamp(inactiveMs)
    this.inactiveTimer = new Timer(() => this.reset(), inactiveMs)

    this.isNew = !Object.keys(initialRead).length
    if (this.isNew) this.write({ value, sessionReplayActive, sessionTraceActive, inactiveAt: this.inactiveAt, expiresAt: this.expiresAt }, true)

    try { this.abortController = new AbortController() } // this try-catch can be removed when IE11 is completely unsupported & gone
    catch (e) {}

    // for browsers that do not support PO, fallback to simple event listeners
    documentAddEventListener('scroll', this.refresh.bind(this), false, this.abortController?.signal)
    documentAddEventListener('keypress', this.refresh.bind(this), false, this.abortController?.signal)
    documentAddEventListener('click', this.refresh.bind(this), false, this.abortController?.signal)

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

  get lookupKey () {
    return `${PREFIX}_${this.key}_${this.agentIdentifier}`
  }

  read () {
    try {
      const val = this.storage.get(this.lookupKey)
      if (!val) return {}
      const obj = this.decompress(JSON.parse(val))
      if (this.isInvalid(obj)) return {}
      // if (this.isInvalid(obj)) return this.reset()
      if (this.isExpired(obj.expiresAt)) return this.reset()
      // if "inactive" timer is expired at "page load time" -- reset
      // otherwise, if page is "unhidden" and the expire time
      if (this.isExpired(obj.inactiveAt)) return this.reset()
      Object.keys(obj).forEach(k => {
        this[k] = obj[k]
      })
      return obj
    } catch (e) {
      warn('Failed to read from storage API', e)
      // storage is inaccessible
      return null
    }
  }

  write (data) {
    try {
      console.log('WRITE DATA', data)
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
      this.storage?.remove(this.key)
      this.abortController?.abort()
      this.inactiveTimer?.end()
      this.expireTimer?.end()
      if (this.initialized) setTimeout(() => this.ee.emit('new-session'), 1)
      const newSess = new SessionEntity({ agentIdentifier: this.agentIdentifier, key: this.key })
      Object.assign(this, newSess)
      return newSess.read()
    } catch (e) {
      console.log('RESET ERROR', e)
      return null
    }
  }

  refresh () {
    this.inactiveTimer.refresh()
    this.inactiveAt = this.getFutureTimestamp(this.inactiveMs)
  }

  isExpired (timestamp) {
    console.log('isExpired?', Date.now() > timestamp)
    return Date.now() > timestamp
  }

  isInvalid (data) {
    const requiredKeys = ['value', 'expiresAt', 'inactiveAt']
    console.log('isInvalid?', data, !requiredKeys.every(x => Object.keys(data).includes(x)))
    return !requiredKeys.every(x => Object.keys(data).includes(x))
  }

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
}
