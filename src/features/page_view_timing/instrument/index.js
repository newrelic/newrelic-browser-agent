/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../../common/event-emitter/handle'
import { getRuntime } from '../../../common/config/config'
import { subscribeToVisibilityChange } from '../../../common/window/page-visibility'
import { windowAddEventListener } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { isBrowserScope } from '../../../common/util/global-scope'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    if (!isBrowserScope) return // CWV is irrelevant outside web context

    // Document visibility state becomes hidden; this should run as soon as possible in page life.
    // While we try to replicate web-vital's visibilitywatcher logic in an effort to defer that library to post-pageload, this isn't perfect and doesn't consider prerendering.
    getRuntime(agentIdentifier).initHidden = Boolean(document.visibilityState === 'hidden')
    subscribeToVisibilityChange(() => handle('docHidden', [now()], undefined, FEATURE_NAME, this.ee), true)

    // Window fires its pagehide event (typically on navigation--this occurrence is a *subset* of vis change); don't defer this unless it's guarantee it cannot happen before load(?)
    windowAddEventListener('pagehide', () => handle('winPagehide', [now()], undefined, FEATURE_NAME, this.ee))

    this.importAggregator()
  }
}
