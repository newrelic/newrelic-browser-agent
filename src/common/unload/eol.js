/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ffVersion } from '../browser-version/firefox-version'
import { windowAddEventListener } from '../event-listener/event-listener-opts'
import { single } from '../util/single'
import { globalScope, isWorkerScope, isBrowserScope } from '../util/global-scope'
import { subscribeToVisibilityChange } from '../window/page-visibility'

if (isWorkerScope) {
  globalScope.cleanupTasks = [] // create new list on WorkerGlobalScope to track funcs to run before exiting thread

  const origClose = globalScope.close
  globalScope.close = () => { // on worker's EoL signal, execute all "listeners", e.g. final harvests
    for (let task of globalScope.cleanupTasks) {
      task()
    }
    origClose()
  }
}

/**
 * Subscribes a provided callback to the time/event when the agent should treat it as end-of-life.
 * This is used, for example, to submit a final harvest and send all remaining data on best-effort.
 * @param {function} cb - func to run before or during the last reliable event or time of an env's life span
 * @param {boolean} allowBFCache - (temp) feature flag to gate new v1222 BFC support
 */
export function subscribeToEOL (cb, allowBFCache) {
  if (isBrowserScope) {
    if (allowBFCache) {
      subscribeToVisibilityChange(cb, true) // when user switches tab or hides window, esp. mobile scenario
      windowAddEventListener('pagehide', cb) // when user navigates away, and because safari iOS v14.4- doesn't fully support vis change
      // --this ought to be removed once support for version below 14.5 phases out
    } else {
      var oneCall = single(cb)

      // Firefox has a bug wherein a slow-loading resource loaded from the 'pagehide'
      // or 'unload' event will delay the 'load' event firing on the next page load.
      // In Firefox versions that support sendBeacon, this doesn't matter, because
      // we'll use it instead of an image load for our final harvest.
      //
      // Some Safari versions never fire the 'unload' event for pages that are being
      // put into the WebKit page cache, so we *need* to use the pagehide event for
      // the final submission from Safari.
      //
      // Generally speaking, we will try to submit our final harvest from either
      // pagehide or unload, whichever comes first, but in Firefox, we need to avoid
      // attempting to submit from pagehide to ensure that we don't slow down loading
      // of the next page.
      if (!ffVersion || navigator.sendBeacon) {
        windowAddEventListener('pagehide', oneCall)
      } else {
        windowAddEventListener('beforeunload', oneCall)
      }
      windowAddEventListener('unload', oneCall)
    }
  } else if (isWorkerScope) {
    globalScope.cleanupTasks.push(cb) // close() should run these tasks before quitting thread
  }
  // By default (for other env), this fn has no effect.
}
