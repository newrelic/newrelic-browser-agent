import { eventListenerOpts } from '../event-listener/event-listener-opts'

const win = window
const doc = win.document
const ADD_EVENT_LISTENER = 'addEventListener'
<<<<<<< HEAD

=======
const ATTACH_EVENT = 'attachEvent'
// TODO: how to handle document.readyState
>>>>>>> 7a6feff (set up worker build)
function checkState (cb) {
  if (!doc) return cb() || true
  if (doc.readyState === 'complete') return cb() || true
}

export function onWindowLoad(cb) {
<<<<<<< HEAD
  checkState(cb)
  win[ADD_EVENT_LISTENER]('load', cb, eventListenerOpts(false));
}

export function onDOMContentLoaded(cb) {
  checkState(cb)
  doc[ADD_EVENT_LISTENER]('DOMContentLoaded', cb, eventListenerOpts(false));
=======
  if (checkState(cb)) return
  if (doc[ADD_EVENT_LISTENER]) win[ADD_EVENT_LISTENER]('load', cb, eventListenerOpts(false))
  else win[ATTACH_EVENT]('onload', cb)
}

export function onDOMContentLoaded(cb) {
  if (checkState(cb)) return
  if (doc[ADD_EVENT_LISTENER]) doc[ADD_EVENT_LISTENER]('DOMContentLoaded', cb, eventListenerOpts(false))
  else doc[ATTACH_EVENT]('onreadystatechange', checkState)
>>>>>>> 7a6feff (set up worker build)
}

