import { windowAddEventListener, documentAddEventListener } from '../event-listener/event-listener-opts'

function checkState () {
  return (typeof document === 'undefined' || document.readyState === 'complete')
}

export function onWindowLoad(cb) {
  if (checkState()) return cb()
  windowAddEventListener('load', cb);
}

export function onDOMContentLoaded(cb) {
  if (checkState()) return cb()
  documentAddEventListener('DOMContentLoaded', cb);
}

