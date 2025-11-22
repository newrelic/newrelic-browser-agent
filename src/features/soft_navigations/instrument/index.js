/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { gosNREUMOriginals } from '../../../common/window/nreum'
import { isBrowserScope } from '../../../common/constants/runtime'
import { handle } from '../../../common/event-emitter/handle'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { debounce } from '../../../common/util/invoke'
import { wrapHistory } from '../../../common/wrap/wrap-history'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, INTERACTION_TRIGGERS, POPSTATE_TRIGGER } from '../constants'
import { now } from '../../../common/timing/now'
import { setupInteractionAPI } from '../../../loaders/api/interaction'

/**
 * The minimal time after a UI event for which no further events will be processed - i.e. a throttling rate to reduce spam.
 * This also give some time for the new interaction to complete without being discarded by a subsequent UI event and wrongly attributed.
 * This value is still subject to change and critique, as it is derived from beyond worst case time to next frame of a page.
 */
const UI_WAIT_INTERVAL = 1 / 10 * 1000 // assume 10 fps

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)

    /** feature specific APIs */
    setupInteractionAPI(agentRef)

    if (!isBrowserScope || !gosNREUMOriginals().o.MO) return // soft navigations is not supported outside web env or browsers without the mutation observer API

    const historyEE = wrapHistory(this.ee)
    try {
      this.removeOnAbort = new AbortController()
    } catch (e) {}

    INTERACTION_TRIGGERS.forEach((trigger) => {
      windowAddEventListener(trigger, (evt) => {
        processUserInteraction(evt)
      }, true, this.removeOnAbort?.signal)
    })

    const trackURLChange = () => handle('newURL', [now(), '' + window.location], undefined, this.featureName, this.ee)
    historyEE.on('pushState-end', trackURLChange)
    historyEE.on('replaceState-end', trackURLChange)
    windowAddEventListener(POPSTATE_TRIGGER, (evt) => { // popstate is unique in that it serves as BOTH a UI event and a notification of URL change
      processUserInteraction(evt)
      handle('newURL', [evt.timeStamp, '' + window.location], undefined, this.featureName, this.ee)
    }, true, this.removeOnAbort?.signal)

    let oncePerFrame = false // attempt to reduce dom noice since the observer runs very frequently with below options
    const domObserver = new (gosNREUMOriginals().o).MO((domChanges, observer) => {
      if (oncePerFrame) return
      oncePerFrame = true
      requestAnimationFrame(() => { // waiting for next frame to time when any visuals are supposedly updated
        handle('newDom', [now()], undefined, this.featureName, this.ee)
        oncePerFrame = false
      })
    })

    const processUserInteraction = debounce((event) => {
      handle('newUIEvent', [event], undefined, this.featureName, this.ee)
      domObserver.observe(document.documentElement, { attributes: true, childList: true, subtree: true, characterData: true })
    }, UI_WAIT_INTERVAL, { leading: true })

    this.abortHandler = abort
    this.importAggregator(agentRef, () => import(/* webpackChunkName: "soft_navigations-aggregate" */ '../aggregate'), { domObserver })

    function abort () {
      this.removeOnAbort?.abort()
      domObserver.disconnect()
      this.abortHandler = undefined // weakly allow this abort op to run only once
    }
  }
}

export const SoftNav = Instrument
