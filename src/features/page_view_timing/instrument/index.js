/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { subscribeToVisibilityChange } from '../../../common/window/page-visibility'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { isBrowserScope } from '../../../common/constants/runtime'
import { now } from '../../../common/timing/now'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, FEATURE_NAME, auto)
    if (!isBrowserScope) return // CWV is irrelevant outside web context

    // While we try to replicate web-vital's visibilitywatcher logic in an effort to defer that library to post-pageload, this isn't perfect and doesn't consider prerendering.
    subscribeToVisibilityChange(() => handle('docHidden', [now()], undefined, FEATURE_NAME, this.ee), true)

    // Window fires its pagehide event (typically on navigation--this occurrence is a *subset* of vis change); don't defer this unless it's guarantee it cannot happen before load(?)
    windowAddEventListener('pagehide', () => handle('winPagehide', [now()], undefined, FEATURE_NAME, this.ee))

    this.importAggregator(agentRef)
  }
}

export const PageViewTiming = Instrument
