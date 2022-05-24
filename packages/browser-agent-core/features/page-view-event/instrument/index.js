
import { handle } from '../../../common/event-emitter/handle'
import { now, getOffset, getLastTimestamp } from '../../../common/timing/now'
import { FeatureBase } from '../../../common/util/feature-base'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'

export class Instrument extends FeatureBase {
  constructor(agentIdentifier) {
    super(agentIdentifier)
    handle('mark', ['firstbyte', getLastTimestamp()], null, 'api', this.ee)

    onWindowLoad(() => this.measureWindowLoaded())
    onDOMContentLoaded(() => this.measureDomContentLoaded())
  }

  measureWindowLoaded() {
    var ts = now()
    handle('mark', ['onload', ts + getOffset()], null, 'api', this.ee)
    handle('timing', ['load', ts], undefined, undefined, this.ee)
  }

  measureDomContentLoaded() {
    handle('mark', ['domContent', now() + getOffset()], null, 'api', this.ee)
  }
}
