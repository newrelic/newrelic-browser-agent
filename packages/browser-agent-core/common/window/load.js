import { eventListenerOpts } from '../event-listener/event-listener-opts'
import { isBrowserWindow } from './win'

const win = isBrowserWindow && window
const doc = win && win.document
const ADD_EVENT_LISTENER = 'addEventListener'
function checkState (cb) {
  if (doc.readyState === 'complete') cb()
}

export function onWindowLoad(cb) {
  checkState(cb)
  win[ADD_EVENT_LISTENER]('load', cb, eventListenerOpts(false));
}

export function onDOMContentLoaded(cb) {
  checkState(cb)
  doc[ADD_EVENT_LISTENER]('DOMContentLoaded', cb, eventListenerOpts(false));
}

