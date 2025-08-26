/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
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

  registerHandler('api-consent', (accept) => {
    agentRef.runtime.session.write({ consent: accept === undefined ? true : accept })

    // call sendRum if it wasn't called yet
    const target = { licenseKey: agentRef.info.licenseKey, applicationID: agentRef.info.applicationID }
    agentRef.features.page_view_event.onAggregateImported.then((loaded) => {
      if (loaded) {
        agentRef.features.page_view_event.featAggregate.sendRum(agentRef.info.jsAttributes, target)
      }
    })
  }, 'session', sharedEE)

  drain(agentRef.agentIdentifier, 'session')

  return agentRef.runtime.session
}
