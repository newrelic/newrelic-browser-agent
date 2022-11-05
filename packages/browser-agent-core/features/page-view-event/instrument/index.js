
import { handle } from '../../../common/event-emitter/handle'
import { now, getOffset, getLastTimestamp } from '../../../common/timing/now'
import { mark } from '../../../common/timing/stopwatch'
import { findStartTime } from '../../../common/timing/start-time'
import { InstrumentBase } from '../../../common/util/feature-base'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'
import { isBrowserWindow } from '../../../common/window/win'
import { FEATURE_NAME } from '../constants'

export class Instrument extends InstrumentBase {
  constructor(agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    if (!isBrowserWindow) return; // initial page view times non applicable outside web env

    findStartTime(agentIdentifier)
    mark(agentIdentifier, 'firstbyte', getLastTimestamp())

    onWindowLoad(() => { this.measureWindowLoaded(); this.importAggregator() })
    onDOMContentLoaded(() => this.measureDomContentLoaded())
  }

  // should be called on window.load or window.onload, will not be called if agent is loaded after window load
  measureWindowLoaded() {
    var ts = now()
    mark(this.agentIdentifier, 'onload', ts + getOffset());
    handle('timing', ['load', ts], undefined, undefined, this.ee)
  }

  // should be called on DOMContentLoaded, will not be called if agent is loaded after DOMContentLoaded
  measureDomContentLoaded() {
    mark(this.agentIdentifier, 'domContent', now() + getOffset());
  }
}
