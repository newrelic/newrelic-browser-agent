import { Timer } from './timer'
import { subscribeToVisibilityChange } from '../window/page-visibility'
import { debounce } from '../util/invoke'
import { isBrowserScope } from '../util/global-scope'

export class InteractionTimer extends Timer {
  constructor (opts, ms) {
    super(opts, ms)
    this.onRefresh = opts.onRefresh

    if (!opts.refreshEvents) opts.refreshEvents = ['click', 'keydown', 'scroll']
    this.abortController = opts.abortController

    if (isBrowserScope && opts.ee) {
      if (opts.ee) {
        const debouncedRefresh = debounce(this.refresh.bind(this), 500, { leading: true })
        opts.ee.on('fn-end', (evts) => {
          if (opts.refreshEvents.includes(evts?.[0]?.type)) {
            debouncedRefresh()
          }
        })
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
