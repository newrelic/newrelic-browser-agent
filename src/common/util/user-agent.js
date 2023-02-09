/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Feature-detection is much preferred over using User Agent to detect browser.
// However, there are cases where feature detection is not possible, for example
// when a specific version of a browser has a bug that requires a workaround in just
// that version.
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#Browser_Name
var agentName = null
var agentVersion = null
var safari = /Version\/(\S+)\s+Safari/

if (navigator.userAgent) {
  var userAgent = navigator.userAgent
  var parts = userAgent.match(safari)

  if (parts && userAgent.indexOf('Chrome') === -1 &&
      userAgent.indexOf('Chromium') === -1) {
    agentName = 'Safari'
    agentVersion = parts[1]
  }
}

export { agentName as agent, agentVersion as version }

export function match (name, version) {
  if (!agentName) {
    return false
  }

  if (name !== agentName) {
    return false
  }

  // version not provided, only match by name
  if (!version) {
    return true
  }

  // version provided, but not detected - not reliable match
  if (!agentVersion) {
    return false
  }

  var detectedParts = agentVersion.split('.')
  var requestedParts = version.split('.')
  for (var i = 0; i < requestedParts.length; i++) {
    if (requestedParts[i] !== detectedParts[i]) {
      return false
    }
  }

  return true
}
