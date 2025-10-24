/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { prefix, CONSENT } from './constants'
import { setupAPI } from './sharedHandlers'
import { handle } from '../../common/event-emitter/handle'
import { warn } from '../../common/util/console'

export function setupConsentAPI (agent) {
  setupAPI(CONSENT, function (accept) {
    if (accept !== undefined && typeof accept !== 'boolean') {
      warn(65, typeof accept)
      return
    }
    handle(prefix + CONSENT, [accept], undefined, 'session', agent.ee)
  }, agent)
}
