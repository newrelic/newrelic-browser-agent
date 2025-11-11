/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
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
    handle(prefix + CONSENT, [accept], undefined, 'session', agent.ee) // sets session data if available

    agent.runtime.blocked = accept

    const pveInst = agent.features.page_view_event
    pveInst.onAggregateImported.then((loaded) => {
      const pveAgg = pveInst.featAggregate
      if (loaded && !pveAgg.sentRum) {
        pveAgg.sendRum()
      }
    })
  }, agent)
}
