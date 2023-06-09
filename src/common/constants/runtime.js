/**
 * @file Contains constants about the environment the agent is running
 * within. These values are derived at the time the agent is first loaded.
 * @copyright 2023 New Relic Corporation. All rights reserved.
 * @license Apache-2.0
 */

/**
 * Indicates if the agent is running within a normal browser window context.
 */
export const isBrowserScope =
  typeof window !== 'undefined' &&
    !!window.document

/**
 * Indicates if the agent is running within a worker context.
 */
export const isWorkerScope =
  typeof WorkerGlobalScope !== 'undefined' &&
    (
      (
        typeof self !== 'undefined' &&
        self instanceof WorkerGlobalScope &&
        self.navigator instanceof WorkerNavigator
      ) ||
    (
      (
        typeof globalThis !== 'undefined' &&
        globalThis instanceof WorkerGlobalScope &&
        globalThis.navigator instanceof WorkerNavigator
      )
    )
    )

export const globalScope = isBrowserScope
  ? window
  : typeof WorkerGlobalScope !== 'undefined' && ((
    typeof self !== 'undefined' &&
      self instanceof WorkerGlobalScope &&
      self
  ) || (
    typeof globalThis !== 'undefined' &&
      globalThis instanceof WorkerGlobalScope &&
      globalThis
  ))

export const initialLocation = '' + globalScope?.location

export const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

// Shared Web Workers introduced in iOS 16.0+ and n/a in 15.6-
export const iOS_below16 = (isiOS && typeof SharedWorker === 'undefined')

export const ffVersion = (() => {
  const match = navigator.userAgent.match(/Firefox[/\s](\d+\.\d+)/)
  if (Array.isArray(match) && match.length >= 2) {
    return +match[1]
  }

  return 0
})()

export const supportsSendBeacon = !!navigator.sendBeacon
