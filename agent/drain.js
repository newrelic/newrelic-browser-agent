/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var baseEE = require('ee')
var mapOwn = require('map-own')
var handlers = require('./register-handler').handlers

module.exports = function drain (group) {
  var bufferedEventsInGroup = baseEE.backlog[group]
  var groupHandlers = handlers[group]
  if (groupHandlers) {
    // don't cache length, buffer can grow while processing
    for (var i = 0; bufferedEventsInGroup && i < bufferedEventsInGroup.length; ++i) { // eslint-disable-line no-unmodified-loop-condition
      emitEvent(bufferedEventsInGroup[i], groupHandlers)
    }

    mapOwn(groupHandlers, function (eventType, handlerRegistrationList) {
      mapOwn(handlerRegistrationList, function (i, registration) {
        // registration is an array of: [targetEE, eventHandler]
        registration[0].on(eventType, registration[1])
      })
    })
  }

  delete handlers[group]
  // Keep the group as a property so we know it was created and drained
  baseEE.backlog[group] = null
}

function emitEvent (evt, groupHandlers) {
  var type = evt[1]
  mapOwn(groupHandlers[type], function (i, registration) {
    var sourceEE = evt[0]
    var ee = registration[0]
    if (ee === sourceEE) {
      var handler = registration[1]
      var ctx = evt[3]
      var args = evt[2]
      handler.apply(ctx, args)
    }
  })
}
