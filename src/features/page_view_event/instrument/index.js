
import { handle } from '../../../common/event-emitter/handle'
import { isiOS } from '../../../common/browser-version/ios-version'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { getRuntime } from '../../../common/config/config'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'
import { now } from '../../../common/timing/now'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME, auto)

    if (typeof PerformanceNavigationTiming !== 'undefined' && !isiOS) {
      /* This block has been moved to the aggregate portion which is fetched and executed after page
          load in an effort to reduce loader bundle size.
      */
    } else if (typeof PerformanceTiming !== 'undefined') {
      // This is the predecessor to PerfNavTiming, needed because that isn't supported on pre v15 safari and v15.2 ios, which are problematic with onTTFB using that API.
      // Timings here are calculated on a best-effort basis.
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

    this.importAggregator()
  }
}
