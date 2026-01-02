/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { prefix, CONSENT } from './constants'
import { setupAPI } from './sharedHandlers'
import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'

export function setupConsentAPI (agent) {
  setupAPI(CONSENT, function (accept = true) {
    if (typeof accept !== 'boolean') {
      warn(65, typeof accept)
      return
    }
    /** harvester, by way of "consented" getter, checks session state first, and falls back on runtime state if not available. Set both here */
    handle(prefix + CONSENT, [accept], undefined, 'session', agent.ee) // sets session state (if available)
    agent.runtime.consented = accept // sets runtime state

    /** if consent is granted, attempt to make a PageView event harvest if one has not already been made */
    if (accept) {
      const pveInst = agent.features.page_view_event
      pveInst.onAggregateImported.then((loaded) => {
        const pveAgg = pveInst.featAggregate
        if (loaded && !pveAgg.sentRum) {
          pveAgg.sendRum()
        }
      })
    }
  }, agent)
}
