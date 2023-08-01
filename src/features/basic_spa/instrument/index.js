import { originals } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { debounce } from '../../../common/util/invoke'
import { wrapEvents, wrapHistory } from '../../../common/wrap'
import { InstrumentBase } from '../../utils/instrument-base'
import { CATEGORY, FEATURE_NAME, INTERACTION_EVENTS } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // SPA not supported outside web env
    try {
      this.removeOnAbort = new AbortController()
    } catch (e) {}

    const historyEE = wrapHistory(this.ee)
    const eventsEE = wrapEvents(this.ee)

    const trackURLChange = (args) => handle('newURL', [now(), '' + window.location, args?.type], undefined, this.featureName, this.ee)

    historyEE.on('pushState-end', trackURLChange)
    historyEE.on('replaceState-end', trackURLChange)

    windowAddEventListener('hashchange', trackURLChange, true, this.removeOnAbort?.signal)
    windowAddEventListener('load', trackURLChange, true, this.removeOnAbort?.signal)
    windowAddEventListener('popstate', trackURLChange, true, this.removeOnAbort?.signal)

    const debouncedIxn = debounce((trigger) => {
      handle('newInteraction', [now(), trigger, CATEGORY.ROUTE_CHANGE], undefined, this.featureName, this.ee)
    }, 60, { leading: true })

    eventsEE.on('fn-end', (evts) => {
      if (INTERACTION_EVENTS.includes(evts?.[0]?.type)) {
        debouncedIxn(evts?.[0]?.type)
      }
    })

    if (originals.MO) {
      const dom_observer = new originals.MO((mutation) => {
        requestAnimationFrame(() => {
          handle('newDom', [now()], undefined, this.featureName, this.ee)
        })
      })
      dom_observer.observe(document.documentElement || document.body, { attributes: true, childList: true, subtree: true, characterData: true })
    }

    this.abortHandler = this.#abort
    this.importAggregator()
  }

  /** Restoration and resource release tasks to be done if SPA loader is being aborted. Unwind changes to globals and subscription to DOM events. */
  #abort () {
    this.removeOnAbort?.abort()
    this.abortHandler = undefined // weakly allow this abort op to run only once
  }
}
