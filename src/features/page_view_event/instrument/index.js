
import { handle } from '../../../common/event-emitter/handle'
import { isiOS } from '../../../common/browser-version/ios-version'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { getRuntime } from '../../../common/config/config'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'
import { now } from '../../../common/timing/now'
import { wrapConsole } from '../../../common/wrap'
import { stringify } from '../../../common/util/stringify'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME, auto)

    if ((typeof PerformanceNavigationTiming === 'undefined' || isiOS) && typeof PerformanceTiming !== 'undefined') {
      // For majority browser versions in which PNT exists, we can get load timings later from the nav entry (in the aggregate portion). At minimum, PT should exist for main window.
      // *cli Mar'23 - iOS 15.2 & 15.4 testing in Sauce still fails with onTTFB. Hence, all iOS will fallback to this for now. Unknown if this is similar in nature to iOS_below16 bug.
      const agentRuntime = getRuntime(agentIdentifier)

      agentRuntime[CONSTANTS.TTFB] = Math.max(Date.now() - agentRuntime.offset, 0)
      onDOMContentLoaded(() => agentRuntime[CONSTANTS.FBTDC] = Math.max(now() - agentRuntime[CONSTANTS.TTFB], 0))
      onWindowLoad(() => {
        const timeNow = now()
        agentRuntime[CONSTANTS.FBTWL] = Math.max(timeNow - agentRuntime[CONSTANTS.TTFB], 0)
        handle('timing', ['load', timeNow], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
      })
    }
    // Else, inference: inside worker or some other env where these events are irrelevant. They'll get filled in with 0s in RUM call.

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

    this.importAggregator()
  }
}
