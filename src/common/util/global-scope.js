/* global globalThis, WorkerGlobalScope, WorkerNavigator */

export const isBrowserScope =
  Boolean(typeof window !== 'undefined' && window.document)

export const isWorkerScope =
  Boolean(typeof WorkerGlobalScope !== 'undefined' && self.navigator instanceof WorkerNavigator)

export let globalScope = (() => {
  if (isBrowserScope) {
    return window
  } else if (isWorkerScope) {
    if (typeof globalThis !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
      return globalThis
    } else if (self instanceof WorkerGlobalScope) {
      return self
    }
  }

  throw new Error('New Relic browser agent shutting down due to error: Unable to locate global scope. This is possibly due to code redefining browser global variables like "self" and "window".')
})()

export const initialLocation = '' + globalScope.location
