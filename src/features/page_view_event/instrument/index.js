
import { handle } from '../../../common/event-emitter/handle'
import { isiOS } from '../../../common/util/user-agent'
import { onTTFB } from 'web-vitals'
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
    const agentRuntime = getRuntime(agentIdentifier) // we'll store timing values on the runtime obj to be read by the aggregate module

    if (typeof PerformanceNavigationTiming !== 'undefined' && !isiOS) {
      this.alreadySent = false // we don't support timings on BFCache restores

      /* Time To First Byte
        This listener subscribes to the window load event and must record these values *before* PVE's aggregate sends RUM. */
      onTTFB(({ value, entries }) => {
        if (this.alreadySent) return
        this.alreadySent = true

        agentRuntime[CONSTANTS.TTFB] = Math.round(value) // this is our "backend" duration; web-vitals will ensure it's lower bounded at 0

        // Similar to what vitals does for ttfb, we have to factor in activation-start when calculating relative timings:
        const navEntry = entries[0]
        const respOrActivStart = Math.max(navEntry.responseStart, navEntry.activationStart || 0)
        agentRuntime[CONSTANTS.FBTWL] = Math.max(Math.round(navEntry.loadEventEnd - respOrActivStart), 0) // our "frontend" duration
        handle('timing', ['load', Math.round(navEntry.loadEventEnd)], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
        agentRuntime[CONSTANTS.FBTDC] = Math.max(Math.round(navEntry.domContentLoadedEventEnd - respOrActivStart), 0) // our "dom processing" duration
      })
    } else if (typeof PerformanceTiming !== 'undefined') {
      // This is the predecessor to PerfNavTiming, needed because that isn't supported on pre v15 safari and v15.2 ios, which are problematic with onTTFB using that API.
      // Timings here are calculated on a best-effort basis.
      // *cli Mar'23 - iOS 15.2 & 15.4 testing in Sauce still fails with onTTFB. Hence, all iOS will fallback to this for now.
      agentRuntime[CONSTANTS.TTFB] = Math.max(Date.now() - agentRuntime.offset, 0)
      onDOMContentLoaded(() => agentRuntime[CONSTANTS.FBTDC] = Math.max(now() - agentRuntime[CONSTANTS.TTFB], 0))
      onWindowLoad(() => {
        const timeNow = now()
        agentRuntime[CONSTANTS.FBTWL] = Math.max(timeNow - agentRuntime[CONSTANTS.TTFB], 0)
        handle('timing', ['load', timeNow], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
      })
    }
    // Else, this is executing in a worker or some other env where these events are irrelevant. They'll get filled in with 0s in RUM call.

    this.importAggregator() // the measureWindowLoaded cb should run *before* the page_view_event agg runs
  }
}
