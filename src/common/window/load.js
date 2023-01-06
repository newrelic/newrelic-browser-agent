import { windowAddEventListener, documentAddEventListener } from '../event-listener/event-listener-opts'

function checkState (cb) {
  if (!document || document.readyState === 'complete') return cb() || true
}

export function onWindowLoad(cb) {
  if (checkState(cb)) return
  windowAddEventListener('load', cb);
}

export function onDOMContentLoaded(cb) {
  if (checkState(cb)) return
  documentAddEventListener('DOMContentLoaded', cb);
}

