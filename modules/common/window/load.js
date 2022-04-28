import { eventListenerOpts } from '../event-listener/event-listener-opts'

const win = window
const doc = win.document
const ADD_EVENT_LISTENER = 'addEventListener'
const ATTACH_EVENT = 'attachEvent'

function stateChange (cb) {
  if (doc.readyState === 'complete') cb()
}

export function onWindowLoad(cb) {
  if (doc[ADD_EVENT_LISTENER]) win[ADD_EVENT_LISTENER]('load', cb, eventListenerOpts(false))
  else win[ATTACH_EVENT]('onload', cb)
}

export function onDOMContentLoaded(cb) {
  if (doc[ADD_EVENT_LISTENER]) doc[ADD_EVENT_LISTENER]('DOMContentLoaded', cb, eventListenerOpts(false))
  else doc[ATTACH_EVENT]('onreadystatechange', stateChange)
}

