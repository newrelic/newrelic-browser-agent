import { generateRandomHexString } from '../ids/unique-id'
import { warn } from '../util/console'
import { globalScope } from '../util/global-scope'
import { stringify } from '../util/stringify'
import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { ee } from '../event-emitter/contextual-ee'

export class SessionEntity {
  constructor ({ agentIdentifier, key, value = generateRandomHexString(16), sessionReplayActive = false, sessionTraceActive = false, expiresMs = 14400000, inactiveMs = 1800000 }) {
    try {
      this.storage = globalScope.localStorage
    } catch (e) {
      // storage is inaccessible
      warn('Storage API is unavailable. Session information will not operate correctly.')
      return Object.assign(this, { key, value, sessionReplayActive, sessionTraceActive, isNew: true })
    }

    this.ee = ee.get(agentIdentifier)

    this.key = key
    this.expiresAt = this.read()?.expiresAt || new Date().setMilliseconds(new Date().getMilliseconds() + expiresMs)
    this.expire = this.waitForExpire()
    this.inactiveMs = inactiveMs
    this.inactive = this.waitForInactive()
    this.isNew = !this.read()
    if (this.isNew) this.save({ value, sessionReplayActive, sessionTraceActive })

    try { this.abortController = new AbortController() } // this try-catch can be removed when IE11 is completely unsupported & gone
    catch (e) {}

    // for browsers that do not support PO, fallback to simple event listeners
    document.addEventListener('scroll', this.refresh.bind(this), eventListenerOpts(false, this.abortController?.signal))
    document.addEventListener('keypress', this.refresh.bind(this), eventListenerOpts(false, this.abortController?.signal))
    document.addEventListener('click', this.refresh.bind(this), eventListenerOpts(false, this.abortController?.signal))

    console.log('session', this.key, this.value, 'expires at ', this.expiresAt, 'which is in ', (this.expiresAt - Date.now()) / 1000 / 60, 'minutes')
  }

  get value () {
    return this.read()?.value
  }

  set value (v) {
    const obj = this.read() || {}
    return this.save({ ...obj, value: v })
  }

  get sessionReplayActive () {
    return this.read()?.sessionReplayActive
  }

  set sessionReplayActive (v) {
    const obj = this.read() || {}
    return this.save({ ...obj, sessionReplayActive: v })
  }

  get sessionTraceActive () {
    return this.read()?.sessionTraceActive
  }

  set sessionTraceActive (v) {
    const obj = this.read() || {}
    return this.save({ ...obj, sessionTraceActive: v })
  }

  read () {
    try {
      const val = this.storage.getItem(this.key)
      if (!val) return
      const obj = JSON.parse(val)
      if (this.isExpired(obj.expiresAt)) return this.reset().read()
      return obj
    } catch (e) {
      console.error(e)
      // storage is inaccessible
      return null
    }
  }

  save ({ value, sessionReplayActive, sessionTraceActive }) {
    try {
      const data = {
        value,
        expiresAt: this.expiresAt,
        sessionReplayActive,
        sessionTraceActive
      }
      this.storage.setItem(this.key, stringify(data))
      return data
    } catch (e) {
      // storage is inaccessible
      return null
    }
  }

  refresh (e) {
    console.log('refresh the inactive timer', e)
    clearTimeout(this.inactive)
    this.inactive = this.waitForInactive()
  }

  reset () {
    try {
      console.log('resetting the session...')
      this.ee.emit('new-session')
      this.storage.removeItem(this.key)
      this.abortController?.abort()
      return Object.assign(this, new SessionEntity({ key: this.key }))
    } catch (e) {
      return null
    }
  }

  waitForInactive () {
    return setTimeout(() => {
      console.log('INACTIVE!!!')
      // send pending payloads
      // stop recording...
      // delete and start over
      this.reset()
    }, this.inactiveMs)
  }

  waitForExpire () {
    return setTimeout(() => {
      console.log('SESSION EXPIRED!!!!')
      // send pending payloads
      // stop recording...
      // delete and start over
      this.reset()
    }, this.expiresAt - Date.now())
  }

  isExpired (timestamp) {
    if (Date.now() > timestamp) console.log('SESSION EXPIRED!!!!')
    return Date.now() > timestamp
  }
}
