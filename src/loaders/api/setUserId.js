/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../../common/util/console'
import { SET_USER_ID } from './constants'
import { appendJsAttribute, setupAPI } from './sharedHandlers'
import { handle } from '../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { FEATURE_NAMES } from '../features/features'

export function setupSetUserIdAPI (agent) {
  /**
    * Attach the 'enduser.id' attribute onto agent payloads. This may be used in NR queries to group all browser events by specific users.
    * @param {string|null} value - unique user identifier; a null user id suggests none should exist
   *  @param {boolean} [resetSession=false] - Optional param. When true, resets the current session (if any) when changing user id. Note: if setting user id for the first time, session will not be reset.
    * @returns @see apiCall
    */
  setupAPI(SET_USER_ID, function (value, resetSession = false) {
    if (!(typeof value === 'string' || value === null)) {
      warn(41, typeof value)
      return
    }

    const currUser = agent.info.jsAttributes['enduser.id']

    // reset session ONLY if we are updating the userid (from one value to another, or from a value to null/undefined)
    const shouldReset = resetSession && agent.runtime.session && currUser !== undefined && currUser !== null && currUser !== value
    if (shouldReset) {
      agent.runtime.session.reset()
      handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + SET_USER_ID + '/resetSession/called'], undefined, FEATURE_NAMES.metrics, agent.ee)
    }
    appendJsAttribute(agent, 'enduser.id', value, SET_USER_ID, true)
  }, agent)
}
