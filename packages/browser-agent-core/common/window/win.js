
const origWindowOrWorkerGlobScope = self
let curGlobScope = origWindowOrWorkerGlobScope

export function getWindowOrWorkerGlobScope() {
  return curGlobScope
}

export function setWindowOrWorkerGlobScope(x) {
  curGlobScope = x
}

export function resetWindowOrWorkerGlobScope() {
  curGlobScope = origWindowOrWorkerGlobScope
}

export const isBrowserWindow = Boolean(typeof window === 'object' && self.document);
export const isWebWorker = Boolean(typeof WorkerGlobalScope !== 'undefined' && self.navigator instanceof WorkerNavigator);