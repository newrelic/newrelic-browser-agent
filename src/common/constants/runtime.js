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
