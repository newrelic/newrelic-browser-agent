import { handle } from '../../../common/event-emitter/handle'
import { isiOS } from '../../../common/constants/runtime'
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

    this.importAggregator()
  }
}
