
import { handle } from '../../../common/event-emitter/handle'
import { now, getOffset, getLastTimestamp } from '../../../common/timing/now'
import { mark } from '../../../common/timing/stopwatch'
import { findStartTime } from '../../../common/timing/start-time'
import { FeatureBase } from '../../../common/util/feature-base'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'

export class Instrument extends FeatureBase {
  constructor(agentIdentifier) {
    super(agentIdentifier)
    console.log("initialize page-view-event instrument!", agentIdentifier)

    findStartTime(agentIdentifier)  // mark('starttime')
    mark(agentIdentifier, 'firstbyte', getLastTimestamp());
    //handle('mark', ['firstbyte', getLastTimestamp()], null, 'api', this.ee)
    onWindowLoad(() => this.measureWindowLoaded())
    onDOMContentLoaded(() => this.measureDomContentLoaded())
  }

  measureWindowLoaded() {
    var ts = now()
    mark(this.agentIdentifier, 'onload', ts + getOffset());
    //handle('mark', ['onload', ts + getOffset()], null, 'api', this.ee)
    handle('timing', ['load', ts], undefined, undefined, this.ee)
  }

  measureDomContentLoaded() {
    mark(this.agentIdentifier, 'domContent', now() + getOffset());
    //handle('mark', ['domContent', now() + getOffset()], null, 'api', this.ee)
  }
}
