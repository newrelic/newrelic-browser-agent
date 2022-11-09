import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { isBrowserWindow } from './win'

const win = isBrowserWindow && window
const doc = win && win.document
const ADD_EVENT_LISTENER = 'addEventListener'

function checkState (cb) {
  if (!doc || doc.readyState === 'complete') return cb() || true
}

export function onWindowLoad(cb) {
  if (checkState(cb)) return
  win[ADD_EVENT_LISTENER]('load', cb, eventListenerOpts(false));
}

export function onDOMContentLoaded(cb) {
  if (checkState(cb)) return
  doc[ADD_EVENT_LISTENER]('DOMContentLoaded', cb, eventListenerOpts(false));
}

