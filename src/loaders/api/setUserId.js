/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../../common/util/console'
import { prefix, SET_USER_ID } from './constants'
import { appendJsAttribute, setupAPI } from './sharedHandlers'
import { handle } from '../../common/event-emitter/handle'

export function setupSetUserIdAPI (agent) {
  /**
    * Attach the 'enduser.id' attribute onto agent payloads. This may be used in NR queries to group all browser events by specific users.
    * @param {string|null} value - unique user identifier; a null user id suggests none should exist
   *  @param {boolean} [resetSession=false] - Optional param. When true, resets the current session ONLY when changing user id from an existing value to another value or null. If the current user id is null when calling the API, the session cannot be reset.
    * @returns @see apiCall
    */
  setupAPI(SET_USER_ID, function (value, resetSession = false) {
    if (!(typeof value === 'string' || value === null)) {
      warn(41, typeof value)
      return
    }

    const currUser = agent.info.jsAttributes['enduser.id']

    // reset session ONLY if we are updating the userid (from one value to another, or from a value to null/undefined)
    const shouldAttemptReset = resetSession && currUser !== undefined && currUser !== null && currUser !== value
    if (shouldAttemptReset) {
      handle(prefix + 'setUserIdAndResetSession', [value], undefined, 'session', agent.ee)
    } else {
      appendJsAttribute(agent, 'enduser.id', value, SET_USER_ID, true)
    }
  }, agent)
}
