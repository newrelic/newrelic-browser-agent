import { Timer } from './timer'
import { documentAddEventListener } from '../event-listener/event-listener-opts'
import { subscribeToVisibilityChange } from '../window/page-visibility'
import { debounce } from '../util/invoke'
import { isBrowserScope } from '../util/global-scope'

export class InteractionTimer extends Timer {
  constructor (opts, ms) {
    super(opts, ms)
    this.onRefresh = opts.onRefresh

    if (!opts.refreshEvents) opts.refreshEvents = ['click', 'keydown', 'scroll']
    this.abortController = opts.abortController

    if (isBrowserScope) {
      opts.refreshEvents.forEach(evt => {
        documentAddEventListener(evt, debounce(this.refresh.bind(this), 500, { leading: true }), false, this.abortController?.signal)
      })

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

  refresh (cb, ms) {
    this.clear()
    this.timer = this.create(cb, ms)
    this.startTimestamp = Date.now()
    this.remainingMs = undefined
    this.onRefresh()
  }
}
