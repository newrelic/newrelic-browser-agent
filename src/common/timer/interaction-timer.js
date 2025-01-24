/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Timer } from './timer'
import { subscribeToVisibilityChange } from '../window/page-visibility'
import { debounce } from '../util/invoke'
import { isBrowserScope } from '../constants/runtime'

export class InteractionTimer extends Timer {
  constructor (opts, ms) {
    super(opts, ms)
    this.onPause = typeof opts.onPause === 'function' ? opts.onPause : () => { /* noop */ }
    this.onRefresh = typeof opts.onRefresh === 'function' ? opts.onRefresh : () => { /* noop */ }
    this.onResume = typeof opts.onResume === 'function' ? opts.onResume : () => { /* noop */ }

    /** used to double-check LS state at resume time */
    this.readStorage = opts.readStorage

    // used by pause/resume
    this.remainingMs = undefined

    if (!opts.refreshEvents) opts.refreshEvents = ['click', 'keydown', 'scroll']

    // the abort controller is used to "reset" the event listeners and prevent them from duplicating when new sessions are created
    try {
      this.abortController = new AbortController()
    } catch (e) {
      // this try-catch can be removed when IE11 is completely unsupported & gone
    }

    if (isBrowserScope && opts.ee) {
      if (opts.ee) {
        this.ee = opts.ee
        const debouncedRefresh = debounce(this.refresh.bind(this), 500, { leading: true })
        this.refreshHandler = (evts) => {
          if (opts.refreshEvents.includes(evts?.[0]?.type)) {
            debouncedRefresh()
          }
        }
        opts.ee.on('fn-end', this.refreshHandler)
      }

      // watch for the vis state changing.  If the page is hidden, the local inactivity timer should be paused
      // if the page is brought BACK to visibility and the timer hasnt "naturally" expired, refresh the timer...
      // this is to support the concept that other tabs could be experiencing activity.  The thought would be that
      // "backgrounded" tabs would pause, while "closed" tabs that "reopen" will just instantiate a new SessionEntity class if restored
      // which will do a "hard" check of the timestamps.

      // NOTE -- this does not account for 2 browser windows open side by side, blurring/focusing between them
      // IF DEEMED necessary, more event handling would be needed to account for this.
      subscribeToVisibilityChange((state) => {
        if (state === 'hidden') this.pause()
        // vis change --> visible is treated like a new interaction with the page
        else this.resume()
      }, false, false, this.abortController?.signal)
    }
  }

  abort () {
    this.clear()
    this.abortController?.abort()

    if (this.refreshHandler) {
      this.ee.removeEventListener('fn-end', this.refreshHandler)
      this.refreshHandler = this.ee = null
    }
  }

  pause () {
    this.onPause()
    clearTimeout(this.timer)
    this.remainingMs = this.initialMs - (Date.now() - this.startTimestamp)
  }

  resume () {
    try {
      const lsData = this.readStorage()
      const obj = typeof lsData === 'string' ? JSON.parse(lsData) : lsData
      if (isExpired(obj.expiresAt) || isExpired(obj.inactiveAt)) this.end()
      else {
        this.refresh()
        this.onResume() // emit resume event after state updated
      }
    } catch (err) {
      this.end()
    }
    function isExpired (timestamp) {
      return Date.now() > timestamp
    }
  }

  refresh (cb, ms) {
    this.clear()
    this.timer = this.create(cb, ms)
    this.startTimestamp = Date.now()
    this.remainingMs = undefined
    this.onRefresh()
  }
}
