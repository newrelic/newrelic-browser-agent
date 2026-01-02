/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { gosCDN } from '../../common/window/nreum'

const debugId = 1
const newrelic = gosCDN()
export function debugNR1 (agentIdentifier, location, event, otherprops = {}, debugName = 'SR') {
  const api = agentIdentifier ? newrelic.initializedAgents[agentIdentifier].addPageAction : newrelic.addPageAction
  let url
  try {
    const locURL = new URL(window.location)
    url = locURL.pathname
  } catch (err) {

  }
  api(debugName, {
    debugId,
    url,
    location,
    event,
    now: performance.now(),
    ...otherprops
  })
}
