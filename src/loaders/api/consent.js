/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { CONSENT } from './constants'
import { setupAPI } from './sharedHandlers'
import { warn } from '../../common/util/console'

export function setupConsentAPI (agent) {
  setupAPI(CONSENT, function (accept) {
    if (accept !== undefined && typeof accept !== 'boolean') {
      warn(65, typeof accept)
      return
    }

    agent.runtime.session.state.consent = accept === undefined ? true : accept
  }, agent)
}
