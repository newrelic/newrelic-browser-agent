
import { eventListenerOpts } from 'nr-browser-common/src/event-listener/event-listener-opts'
import { handle } from 'nr-browser-common/src/event-emitter/handle'
import { now, offset, getLastTimestamp } from 'nr-browser-common/src/timing/now'

const win = window
const doc = win.document
const ADD_EVENT_LISTENER = 'addEventListener'
const ATTACH_EVENT = 'attachEvent'
let listening = false

export function listenForLoad(cb) {
  if (listening) return
  if (doc.readyState === 'complete') {
    console.log('.... the document is already loaded before the loader script has been ran! ....')
    loaded()
    cb()
    return
  }
  listening = true

  if (doc[ADD_EVENT_LISTENER]) {
    console.log('top listeners')
    doc[ADD_EVENT_LISTENER]('DOMContentLoaded', loaded, eventListenerOpts(false))
    win[ADD_EVENT_LISTENER]('load', () => windowLoaded(cb), eventListenerOpts(false))
    // win[ADD_EVENT_LISTENER]('load', windowLoaded, eventListenerOpts(false))
  } else {
    console.log('bottom listeners')
    doc[ATTACH_EVENT]('onreadystatechange', stateChange)
    win[ATTACH_EVENT]('onload', () => windowLoaded(cb))
    // win[ATTACH_EVENT]('onload', windowLoaded)
  }

  handle('mark', ['firstbyte', getLastTimestamp()], null, 'api')
}

function stateChange () {
  console.log('stateChange...', doc.readyState)
  if (doc.readyState === 'complete') loaded()
}

function windowLoaded(cb) {
  var ts = now()
  handle('mark', ['onload', ts + offset], null, 'api')
  handle('timing', ['load', ts])
  cb()
}

function loaded (cb) {
  console.log('state change detected that it is LOADED!')
  handle('mark', ['domContent', now() + offset], null, 'api')
}
