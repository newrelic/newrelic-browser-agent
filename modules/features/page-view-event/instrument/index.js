
import { handle } from '../../../common/event-emitter/handle'
import { now, offset, getLastTimestamp } from '../../../common/timing/now'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'

const win = window
const doc = win.document

export function instrumentPageView() {
  handle('mark', ['firstbyte', getLastTimestamp()], null, 'api')

  onWindowLoad(measureWindowLoaded)
  onDOMContentLoaded(measureDomContentLoaded)
}

function measureWindowLoaded() {
  var ts = now()
  handle('mark', ['onload', ts + offset], null, 'api')
  handle('timing', ['load', ts])
}

function measureDomContentLoaded () {
  console.log('state change detected that it is LOADED!')
  handle('mark', ['domContent', now() + offset], null, 'api')
}
