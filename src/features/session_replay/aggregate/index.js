import * as rrweb from 'rrweb'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
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
  }
}
