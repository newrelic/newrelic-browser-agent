import { generateRandomHexString } from '../ids/unique-id'
import { warn } from '../util/console'
import { globalScope } from '../util/global-scope'
import { stringify } from '../util/stringify'
import { documentAddEventListener } from '../event-listener/event-listener-opts'
import { ee } from '../event-emitter/contextual-ee'
import { subscribeToVisibilityChange } from '../window/page-visibility'
import { Timer } from '../timer/timer'

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

    this.value = value

    this.key = key
    const initialRead = this.read()
    this.expiresAt = initialRead?.expiresAt || this.getFutureTimestamp(expiresMs)
    this.expireTimer = new Timer(() => {
      console.log('SESSION EXPIRED!!!!')
      // send pending payloads
      // stop recording...
      // delete and start over
      this.reset()
    }, this.expiresAt - Date.now())

    this.inactiveMs = inactiveMs
    this.inactiveAt = initialRead?.inactiveAt || this.getFutureTimestamp(inactiveMs)
    this.inactiveTimer = new Timer(() => {
      console.log('INACTIVE!!!')
      // send pending payloads
      // stop recording...
      // delete and start over
      this.reset()
    }, inactiveMs)

    this.isNew = !initialRead
    if (this.isNew) this.setValues({ value, sessionReplayActive, sessionTraceActive, inactiveAt: this.inactiveAt, expiresAt: this.expiresAt }, true)

    try { this.abortController = new AbortController() } // this try-catch can be removed when IE11 is completely unsupported & gone
    catch (e) {}

    // for browsers that do not support PO, fallback to simple event listeners
    documentAddEventListener('scroll', this.refresh.bind(this), false, this.abortController?.signal)
    documentAddEventListener('keypress', this.refresh.bind(this), false, this.abortController?.signal)
    documentAddEventListener('click', this.refresh.bind(this), false, this.abortController?.signal)

    subscribeToVisibilityChange((state) => {
      console.log('vis change', state)
      if (state === 'hidden') {
        this.inactiveTimer.pause()
        this.inactiveAt = this.getFutureTimestamp(inactiveMs)
        this.setValues({ inactiveAt: this.inactiveAt })
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
    console.log('session_entity', this)
  }

  read () {
    try {
      console.log('read...', this.key)
      const val = this.storage.getItem(this.key)
      console.log('raw', val)
      if (!val) return
      const obj = JSON.parse(val)
      if (this.isInvalid(obj)) return this.reset().read()
      if (this.isExpired(obj.expiresAt)) return this.reset().read()
      // if "inactive" timer is expired at "page load time" -- reset
      // otherwise, if page is "unhidden" and the expire time
      if (this.isExpired(obj.inactiveAt)) return this.reset().read()
      Object.keys(obj).forEach(k => {
        this[k] = obj[k]
      })
      return obj
    } catch (e) {
      console.error(e)
      // storage is inaccessible
      return null
    }
  }

  setValues (data, force) {
    try {
      console.log('read before saving...')
      if (!data || typeof data !== 'object') return
      const existing = !force && this.read() || {}
      const saveObj = {}
      const allKeys = Object.keys(existing).concat(Object.keys(data))
      allKeys.forEach(k => {
        saveObj[k] = data[k] !== undefined ? data[k] : existing[k]
        console.log('set this', k, 'to', saveObj[k])
        this[k] = saveObj[k]
      })
      console.log('save ', saveObj, 'to storage API')
      this.storage.setItem(this.key, stringify(saveObj))
      return data
    } catch (e) {
      // storage is inaccessible
      return null
    }
  }

  reset () {
    try {
      console.log('resetting the session...')
      console.log('remove ', this.key)
      this.storage.removeItem(this.key)
      this.abortController?.abort()
      this.inactiveTimer.end()
      this.expireTimer.end()
      setTimeout(() => this.ee.emit('new-session'), 1)
      return Object.assign(this, new SessionEntity({ key: this.key }))
    } catch (e) {
      return null
    }
  }

  refresh () {
    this.inactiveTimer.refresh()
    this.inactiveAt = this.getFutureTimestamp(this.inactiveMs)
  }

  isExpired (timestamp) {
    if (Date.now() > timestamp) console.log('SESSION EXPIRED!!!!')
    return Date.now() > timestamp
  }

  isInvalid (data) {
    const requiredKeys = ['value', 'expiresAt', 'inactiveAt']
    console.log('isInvalid?', !requiredKeys.every(x => Object.keys(data).includes(x)))
    return !requiredKeys.every(x => Object.keys(data).includes(x))
  }

  getFutureTimestamp (futureMs) {
    return new Date().setMilliseconds(new Date().getMilliseconds() + futureMs)
  }
}
