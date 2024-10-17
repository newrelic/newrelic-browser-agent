/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope, isWorkerScope, isBrowserScope } from '../constants/runtime'
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
 */
export function subscribeToEOL (cb, capturePhase) {
  if (isBrowserScope) {
    subscribeToVisibilityChange(cb, true, capturePhase) // when user switches tab or hides window, esp. mobile scenario
  } else if (isWorkerScope) {
    globalScope.cleanupTasks.push(cb) // close() should run these tasks before quitting thread
  }
  // By default (for other env), this fn has no effect.
}
