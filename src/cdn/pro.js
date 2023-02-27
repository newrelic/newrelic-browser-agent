import { Agent } from '../loaders/agent'

import { Instrument as InstrumentPageViewEvent } from '../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../features/session_trace/instrument'
import { Instrument as InstrumentPageAction } from '../features/page_action/instrument'

import * as rrweb from 'rrweb'

let events = []

rrweb.record({
  emit (event) {
    // push event into the events array
    events.push(event)
  }
})

// this function will send events to the backend and reset the events array
function save () {
  const body = JSON.stringify({ events })
  events = []
  fetch('/session-replay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })
}

// save events every 10 seconds
setInterval(save, 10 * 1000)

new Agent({
  features: [
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentSessionTrace,
    InstrumentXhr,
    InstrumentMetrics,
    InstrumentPageAction,
    InstrumentErrors
  ],
  loaderType: 'pro'
})
