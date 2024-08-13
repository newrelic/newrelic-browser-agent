import { originals } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { debounce } from '../../../common/util/invoke'
import { wrapHistory } from '../../../common/wrap/wrap-history'
import { wrapEvents } from '../../../common/wrap/wrap-events'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, INTERACTION_TRIGGERS } from '../constants'
import { now } from '../../../common/timing/now'

/** The minimal time after a UI event for which no further events will be processed - i.e. a throttling rate to reduce spam.
 * This also give some time for the new interaction to complete without being discarded by a subsequent UI event and wrongly attributed.
 * This value is still subject to change and critique, as it is derived from beyond worst case time to next frame of a page.
 */
const UI_WAIT_INTERVAL = 1 / 10 * 1000 // assume 10 fps

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope || !originals.MO) return // soft navigations is not supported outside web env or browsers without the mutation observer API

    const historyEE = wrapHistory(this.ee)
    const eventsEE = wrapEvents(this.ee)

    const trackURLChange = () => handle('newURL', [now(), '' + window.location], undefined, this.featureName, this.ee)
    historyEE.on('pushState-end', trackURLChange)
    historyEE.on('replaceState-end', trackURLChange)

    try {
      this.removeOnAbort = new AbortController()
    } catch (e) {}
    const trackURLChangeEvent = (evt) => handle('newURL', [evt.timeStamp, '' + window.location], undefined, this.featureName, this.ee)
    windowAddEventListener('popstate', trackURLChangeEvent, true, this.removeOnAbort?.signal)

    let oncePerFrame = false // attempt to reduce dom noice since the observer runs very frequently with below options
    const domObserver = new originals.MO((domChanges, observer) => {
      if (oncePerFrame) return
      oncePerFrame = true
      requestAnimationFrame(() => { // waiting for next frame to time when any visuals are supposedly updated
        handle('newDom', [now()], undefined, this.featureName, this.ee)
        oncePerFrame = false
      })
    })

    const processUserInteraction = debounce((event) => {
      handle('newUIEvent', [event], undefined, this.featureName, this.ee)
      domObserver.observe(document.body, { attributes: true, childList: true, subtree: true, characterData: true })
    }, UI_WAIT_INTERVAL, { leading: true })

    eventsEE.on('fn-start', ([evt]) => { // set up a new user ixn before the callback for the triggering event executes
      if (INTERACTION_TRIGGERS.includes(evt?.type)) {
        processUserInteraction(evt)
      }
    })
    for (let eventType of INTERACTION_TRIGGERS) document.addEventListener(eventType, () => { /* no-op, this ensures the UI events are monitored by our callback above */ })

    this.abortHandler = abort
    this.importAggregator({ domObserver })

    function abort () {
      this.removeOnAbort?.abort()
      domObserver.disconnect()
      this.abortHandler = undefined // weakly allow this abort op to run only once
    }
  }
}
