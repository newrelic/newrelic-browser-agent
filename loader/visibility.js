/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var eventListenerOpts = require('../agent/event-listener-opts')

module.exports = subscribeToVisibilityChange

var hidden, eventName, state

if (typeof document.hidden !== 'undefined') {
  hidden = 'hidden'
  eventName = 'visibilitychange'
  state = 'visibilityState'
} else if (typeof document.msHidden !== 'undefined') {
  hidden = 'msHidden'
  eventName = 'msvisibilitychange'
} else if (typeof document.webkitHidden !== 'undefined') {
  hidden = 'webkitHidden'
  eventName = 'webkitvisibilitychange'
  state = 'webkitVisibilityState'
}

function subscribeToVisibilityChange(cb) {
  if ('addEventListener' in document && eventName) {
    document.addEventListener(eventName, handleVisibilityChange, eventListenerOpts(false))
  }

  function handleVisibilityChange() {
    if (state && document[state]) {
      cb(document[state])
    } else if (document[hidden]) {
      cb('hidden')
    } else {
      cb('visible')
    }
  }
}
