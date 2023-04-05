import { InstrumentBase } from '../../utils/instrument-base'
import { insertSupportMetrics } from './workers-helper'
import { FEATURE_NAME, SUPPORTABILITY_METRIC_CHANNEL } from '../constants'
import { handle } from '../../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { wrapConsole } from '../../../common/wrap'
import { stringify } from '../../../common/util/stringify'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    insertSupportMetrics(tag => handle(SUPPORTABILITY_METRIC_CHANNEL, [tag], undefined, FEATURE_NAMES.metrics, this.ee))

    this.addConsoleSupportabilityMetrics()

    this.importAggregator()
  }

  addConsoleSupportabilityMetrics () {
    // For now we are just capturing supportability metrics on `console` usage to assess log forwarding feature.
    const consoleEE = wrapConsole(this.ee)

    for (const method of ['Debug', 'Error', 'Info', 'Log', 'Warn', 'Trace']) {
      consoleEE.on(`${method.toLowerCase()}-console-start`, function (args, target) {
        // Parsing the args individually into a new array ensures that functions and Error objects are represented with
        // useful string values. By default, functions stringify to null and Error objects stringify to empty objects.
        // Note that stack traces printed by the console.trace method are not captured.
        let parsedArgs = []
        for (const arg of args) {
          if (typeof arg === 'function' ||
            (arg && arg.message && arg.stack) // Duck typing for Error objects
          ) {
            parsedArgs.push(arg.toString())
          } else {
            parsedArgs.push(arg)
          }
        }
        const parsedArgsJSON = stringify(parsedArgs)
        handle(SUPPORTABILITY_METRIC_CHANNEL, [`Console/${method}/Seen`, parsedArgsJSON.length], undefined, FEATURE_NAMES.metrics, consoleEE)
      })
    }
  }
}
