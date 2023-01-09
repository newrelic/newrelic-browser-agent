/* global globalThis, WorkerGlobalScope, WorkerNavigator */

export const isBrowserScope =
  Boolean(typeof window !== 'undefined' && window.document);

export const isWorkerScope =
  Boolean(typeof WorkerGlobalScope !== 'undefined' && self.navigator instanceof WorkerNavigator);

export let globalScope = (() => {
  if (isBrowserScope) {
    return window;
  } else if (isWorkerScope) {
    if (typeof globalThis !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
      return globalThis;
    } else if (self instanceof WorkerGlobalScope) {
      return self;
    }
  }

  throw new Error('New Relic browser agent shutting down due to error: Unable to locate global scope. This is possibly due to code redefining browser global variables like `self` and `window`.');
})();
export default globalScope;

/**
 * The below methods are only used for testing and should be removed once the
 * reliant tests are moved to Jest.
 * tests/browser/protocol.browser.js
 * tests/browser/obfuscate.browser.js
 */
export function setScope(obj) {
  globalScope = { ...obj };
}
export function resetScope() {
  if (isBrowserScope) {
    return window;
  } else if (isWorkerScope) {
    if (typeof globalThis !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
      return globalThis;
    } else if (self instanceof WorkerGlobalScope) {
      return self;
    }
  }

  throw new Error('New Relic browser agent shutting down due to error: Unable to locate global scope. This is possibly due to code redefining browser global variables like `self` and `window`.');
}
export function getGlobalScope() {
  return globalScope;
}
