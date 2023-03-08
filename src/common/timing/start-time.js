/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Use various techniques to determine the time at which this page started and whether to capture navigation timing information

import { mark } from './stopwatch'
import { setOffset } from './now'
import { globalScope } from '../util/global-scope'

export let navCookie = true

// findStartTime() *cli - comment out to add agentId context which is n/a at import time

export function findStartTime (agentId) {
  // findStartCookie is used for FF7/8 & browsers which do not support window.performance.timing.navigationStart
  var starttime = findStartWebTiming() // || findStartCookie() -- now redundant *cli oct'22, TO DO: slated for removal
  if (!starttime) return

  mark(agentId, 'starttime', starttime)
  setOffset(starttime)
}

// Find the start time from the Web Timing 'performance' object.
// The "timeOrigin" property is the new standard timestamp property shared across main frame and workers, but is not supported in some early Safari browsers (safari<15)
// navigationStart is deprecated, but can still be used as a fallback
// http://test.w3.org/webperf/specs/NavigationTiming/
// http://blog.chromium.org/2010/07/do-you-know-how-slow-your-web-page-is.html
function findStartWebTiming () {
  // note that we don't need to use a cookie to record navigation start time
  navCookie = false
  const timestamp = globalScope?.performance?.timeOrigin || globalScope?.performance?.timing?.navigationStart
  if (!timestamp) return
  return Math.round(timestamp)
}
