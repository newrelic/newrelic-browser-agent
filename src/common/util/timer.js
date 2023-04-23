import { documentAddEventListener } from '../event-listener/event-listener-opts'
import { subscribeToVisibilityChange } from '../window/page-visibility'
import { debounce } from './debounce'
import { isBrowserScope } from './global-scope'

export class Timer {
  constructor (opts, ms) {
    if (!opts.onEnd) throw new Error('onEnd handler is required')
    if (!ms) throw new Error('ms duration is required')
    this.onEnd = opts.onEnd
    this.onRefresh = opts.onRefresh
    this.initialMs = ms
    this.startTimestamp = Date.now()
    // used by pause/resume
    this.remainingMs = undefined

    try { this.abortController = opts.abortController || new AbortController() } catch (e) {}

    this.timer = this.create(this.onEnd, ms)

    if (isBrowserScope && opts.onRefresh) {
      documentAddEventListener('scroll', debounce(this.refresh.bind(this)), false, this.abortController?.signal)
      documentAddEventListener('keydown', debounce(this.refresh.bind(this)), false, this.abortController?.signal)
      documentAddEventListener('click', debounce(this.refresh.bind(this)), false, this.abortController?.signal)

      // watch for the vis state changing.  If the page is hidden, the local inactivity timer should be paused
      // if the page is brought BACK to visibility and the timer hasnt "naturally" expired, refresh the timer...
      // this is to support the concept that other tabs could be experiencing activity.  The thought would be that
      // "backgrounded" tabs would pause, while "closed" tabs that "reopen" will just instantiate a new SessionEntity class if restored
      // which will do a "hard" check of the timestamps.
      subscribeToVisibilityChange((state) => {
        if (state === 'hidden') this.pause()
        else this.refresh()
      }, false, false, this.abortController?.signal)
    }
  }

  create (cb, ms) {
    if (this.timer) this.clear()
    return setTimeout(() => cb ? cb() : this.onEnd(), ms || this.initialMs)
  }

  refresh (cb, ms) {
    this.clear()
    this.timer = this.create(cb, ms)
    this.startTimestamp = Date.now()
    this.remainingMs = undefined
    this.onRefresh()
  }

  pause () {
    clearTimeout(this.timer)
    this.remainingMs = this.initialMs - (Date.now() - this.startTimestamp)
  }

  // resume is not currently used.  "resuming" currently means setting a new fresh timer
  // resume () {
  //   if (!this.remainingMs || !this.isValid()) return
  //   this.timer = this.create(this.cb, this.remainingMs)
  //   this.remainingMs = undefined
  // }

  clear () {
    clearTimeout(this.timer)
    this.timer = null
  }

  end () {
    this.clear()
    this.onEnd()
  }

  isValid () {
    return this.initialMs - (Date.now() - this.startTimestamp) > 0
  }
}
