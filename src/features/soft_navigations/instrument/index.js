import { originals } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { debounce } from '../../../common/util/invoke'
import { wrapEvents, wrapHistory } from '../../../common/wrap'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, INTERACTION_TRIGGERS } from '../constants'

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
    const trackURLChangeEvent = (evt) => handle('newURL', [evt.timestamp, '' + window.location], undefined, this.featureName, this.ee)
    windowAddEventListener('popstate', trackURLChangeEvent, true, this.removeOnAbort?.signal)
    windowAddEventListener('load', trackURLChangeEvent, true, this.removeOnAbort?.signal) // this is just for InitialPageLoad interactions

    const domObserver = new originals.MO((domChanges, observer) => {
      originals.RAF(() => { // waiting for next frame is to ensure the DOM changes has happened
        handle('newDom', [now()], undefined, this.featureName, this.ee)
      })
    })
    domObserver.observe(document.documentElement || document.body, { attributes: true, childList: true, subtree: true, characterData: true })

    const processUserInteraction = debounce((event) => {
      handle('newInteraction', [event.timestamp, event.type], undefined, this.featureName, this.ee)
      domObserver.takeRecords() // empty the un-processed DOM changes so they don't falsely mark the new user interaction as having caused changes prior to it
    }, 60, { leading: true })

    eventsEE.on('fn-start', ([evt]) => { // set up a new user ixn before the callback for the triggering event executes
      if (INTERACTION_TRIGGERS.includes(evt?.type)) {
        processUserInteraction(evt)
      }
    })

    this.abortHandler = this.#abort
    this.importAggregator()
  }

  /** Restoration and resource release tasks to be done if SPA loader is being aborted. Unwind changes to globals and subscription to DOM events. */
  #abort () {
    this.removeOnAbort?.abort()
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }
}
