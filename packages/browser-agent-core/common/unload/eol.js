/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ffVersion } from '../browser-version/firefox-version'
import { single } from '../util/single'
import { addE } from '../event-listener/add-e'
import { isBrowserWindow, isWebWorker } from '../window/win'

if (isWebWorker) {
  self.cleanupTasks = []; // create new list on WorkerGlobalScope to track funcs to run before exiting thread

  const origClose = self.close;
  self.close = () => {  // on worker's EoL signal, execute all "listeners", e.g. final harvests
    for (let task of self.cleanupTasks) {
      task();
    }
    origClose();
  }
}

/**
 * Subscribes a provided callback to the time/event when the agent should treat it as end-of-life. 
 * This is used, for example, to submit a final harvest and send all remaining data on best-effort.
 * @param {func} cb - func to run before or during the last reliable event or time of an env's life span
 */
export function subscribeToEOL (cb) {
  if (isBrowserWindow) {
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
      addE('pagehide', oneCall)
    } else {
      addE('beforeunload', oneCall)
    }
    addE('unload', oneCall)
  }
  else if (isWebWorker) {
    self.cleanupTasks.push(cb); // close() should run these tasks before quitting thread
  }
  // By default (for other env), this fn has no effect.
}
