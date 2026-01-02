/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { setupSetPageViewNameAPI } from '../../../loaders/api/setPageViewName'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { SESSION_EVENTS } from '../../../common/session/constants'
import { dispatchGlobalEvent } from '../../../common/dispatch/global-event'
import { onDOMContentLoaded, onPopstateChange, onWindowLoad } from '../../../common/window/load'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, CONSTANTS.FEATURE_NAME)

    /** setup inspection events for window lifecycle */
    this.setupInspectionEvents(agentRef.agentIdentifier)

    /** feature specific APIs */
    setupSetPageViewNameAPI(agentRef)

    this.importAggregator(agentRef, () => import(/* webpackChunkName: "page_view_event-aggregate" */ '../aggregate'))
  }

  setupInspectionEvents (agentIdentifier) {
    const dispatch = (evt, name) => {
      if (!evt) return
      dispatchGlobalEvent({
        agentIdentifier,
        timeStamp: evt.timeStamp,
        loaded: evt.target.readyState === 'complete',
        type: 'window',
        name,
        data: evt.target.location + ''
      })
    }

    onDOMContentLoaded((evt) => {
      dispatch(evt, 'DOMContentLoaded')
    })

    onWindowLoad((evt) => {
      dispatch(evt, 'load')
    })

    onPopstateChange((evt) => {
      dispatch(evt, 'navigate')
    })

    this.ee.on(SESSION_EVENTS.UPDATE, (_, data) => {
      dispatchGlobalEvent({
        agentIdentifier,
        type: 'lifecycle',
        name: 'session',
        data
      })
    })
  }
}

export const PageViewEvent = Instrument
