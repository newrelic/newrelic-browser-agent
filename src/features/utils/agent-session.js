/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { drain } from '../../common/drain/drain'
import { ee } from '../../common/event-emitter/contextual-ee'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { SessionEntity } from '../../common/session/session-entity'
import { LocalStorage } from '../../common/storage/local-storage.js'
import { DEFAULT_KEY } from '../../common/session/constants'
import { mergeInfo } from '../../common/config/info'
import { trackObjectAttributeSize } from '../../common/util/attribute-size'
import { handle } from '../../common/event-emitter/handle'
import { SET_USER_ID } from '../../loaders/api/constants'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../metrics/constants'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { appendJsAttribute } from '../../loaders/api/sharedHandlers'

export function setupAgentSession (agentRef) {
  if (agentRef.runtime.session) return agentRef.runtime.session // already setup

  const sessionInit = agentRef.init.session

  agentRef.runtime.session = new SessionEntity({
    agentIdentifier: agentRef.agentIdentifier,
    key: DEFAULT_KEY,
    storage: new LocalStorage(),
    expiresMs: sessionInit?.expiresMs,
    inactiveMs: sessionInit?.inactiveMs
  })

  // Retrieve & re-add all of the persisted setCustomAttribute|setUserId k-v from previous page load(s), if any was stored.
  const customSessionData = agentRef.runtime.session.state.custom
  if (customSessionData && Object.keys(customSessionData).length) {
    /** stored attributes from previous page should not take precedence over attributes stored on this page via API before the page load */
    agentRef.info = mergeInfo({
      ...agentRef.info,
      jsAttributes: {
        ...customSessionData,
        ...agentRef.info.jsAttributes
      }
    })
  }

  /** track changes to the jsAttributes field over time for aiding with harvest mechanics */
  agentRef.runtime.jsAttributesMetadata = trackObjectAttributeSize(agentRef.info, 'jsAttributes')

  const sharedEE = ee.get(agentRef.agentIdentifier)

  // any calls to newrelic.setCustomAttribute(<persisted>) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setCustomAttribute', (time, key, value) => {
    agentRef.runtime.session.syncCustomAttribute(key, value)
  }, 'session', sharedEE)

  // any calls to newrelic.setUserId(...) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setUserId', (time, key, value) => {
    agentRef.runtime.session.syncCustomAttribute(key, value)
  }, 'session', sharedEE)

  registerHandler('api-setUserIdAndResetSession', (value) => {
    agentRef.runtime.session.reset()
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + SET_USER_ID + '/resetSession/called'], undefined, FEATURE_NAMES.metrics, sharedEE)
    appendJsAttribute(agentRef, 'enduser.id', value, SET_USER_ID, true)
  }, 'session', sharedEE)

  registerHandler('api-consent', (accept) => {
    agentRef.runtime.session.write({ consent: accept === undefined ? true : accept })
  }, 'session', sharedEE)

  drain(agentRef.agentIdentifier, 'session')

  return agentRef.runtime.session
}
