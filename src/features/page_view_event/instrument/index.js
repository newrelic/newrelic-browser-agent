
import { handle } from '../../../common/event-emitter/handle'
import { now, getOffset, getLastTimestamp } from '../../../common/timing/now'
import { mark } from '../../../common/timing/stopwatch'
import { findStartTime } from '../../../common/timing/start-time'
import { InstrumentBase } from '../../utils/instrument-base'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'
import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { isBrowserScope } from '../../../common/util/global-scope'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor(agentIdentifier, aggregator, auto=true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return; // initial page view times non applicable outside web env

    findStartTime(agentIdentifier)
    mark(agentIdentifier, 'firstbyte', getLastTimestamp())

    onWindowLoad(() => { 
      this.measureWindowLoaded(); 
      if (isBrowserScope) this.importAggregator() 
    })
    onDOMContentLoaded(() => this.measureDomContentLoaded())
  }

  // should be called on window.load or window.onload, will not be called if agent is loaded after window load
  measureWindowLoaded() {
    var ts = now()
    mark(this.agentIdentifier, 'onload', ts + getOffset());
    handle('timing', ['load', ts], undefined, FEATURE_NAMES.pageViewTiming, this.ee)
  }

  // should be called on DOMContentLoaded, will not be called if agent is loaded after DOMContentLoaded
  measureDomContentLoaded() {
    mark(this.agentIdentifier, 'domContent', now() + getOffset());
  }
}
