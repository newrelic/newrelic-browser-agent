
import { handle } from '../../../common/event-emitter/handle'
import { onTTFB } from 'web-vitals'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { getRuntime } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/util/global-scope'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME, auto)

    // The following uses native APIs that do not exist outside the main UI context.
    if (isBrowserScope) {
      this.alreadySent = false // we don't support timings on BFCache restores
      const agentRuntime = getRuntime(agentIdentifier) // we'll store these timing values on the runtime obj to be read by the aggregate module

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
    }

    this.importAggregator() // the measureWindowLoaded cb should run *before* the page_view_event agg runs
  }
}
