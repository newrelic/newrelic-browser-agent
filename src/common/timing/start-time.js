/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Use various techniques to determine the time at which this page started and whether to capture navigation timing information

import { mark } from './stopwatch'
import { setOffset, getLastTimestamp } from './now'
import { globalScope } from '../util/global-scope'

export let navCookie = true

export function findStartTime (agentId) {
  var starttime = findStartWebTiming()
  if (!starttime) return

  mark(agentId, 'starttime', starttime)
  setOffset(starttime)
  return starttime
}

// Find the start time from the Web Timing 'performance' object.
// The "timeOrigin" property is the new standard timestamp property shared across main frame and workers, but is not supported in some early Safari browsers (safari<15) + IE
// navigationStart is deprecated, but can still be used as a fallback
// http://test.w3.org/webperf/specs/NavigationTiming/
// http://blog.chromium.org/2010/07/do-you-know-how-slow-your-web-page-is.html
function findStartWebTiming () {
  // note that we don't need to use a cookie to record navigation start time
  navCookie = false
  const timestamp = globalScope?.performance?.timeOrigin || globalScope?.performance?.timing?.navigationStart
  if (!timestamp) return getLastTimestamp()
  return Math.floor(timestamp)
}
