/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { subscribeToPageUnload, subscribeToVisibilityChange } from '../../../common/window/page-visibility'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { isBrowserScope } from '../../../common/constants/runtime'
import { now } from '../../../common/timing/now'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentRef) {
    super(agentRef, FEATURE_NAME)
    if (!isBrowserScope) return // CWV is irrelevant outside web context

    // While we try to replicate web-vital's visibilitywatcher logic in an effort to defer that library to post-pageload, this isn't perfect and doesn't consider prerendering.
    subscribeToVisibilityChange(() => handle('docHidden', [now()], undefined, FEATURE_NAME, this.ee), true)

    // Window fires its pagehide event (typically on navigation--this occurrence is a *subset* of vis change); don't defer this unless it's guarantee it cannot happen before load(?)
    subscribeToPageUnload(() => handle('winPagehide', [now()], undefined, FEATURE_NAME, this.ee))

    this.importAggregator(agentRef, () => import(/* webpackChunkName: "page_view_timing-aggregate" */ '../aggregate'))
  }
}

export const PageViewTiming = Instrument
