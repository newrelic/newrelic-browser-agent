/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee } from '../event-emitter/contextual-ee'
import { mapOwn } from '../util/map-own'
import { registerHandler as defaultRegister } from '../event-emitter/register-handler'
import { featurePriority } from '../../loaders/features/features'

const registry = {}

export function registerDrain (agentIdentifier, group) {
  const item = { staged: false, priority: featurePriority[group] || 0 }
  curateRegistry(agentIdentifier)
  if (!registry[agentIdentifier].get(group)) registry[agentIdentifier].set(group, item)
}

function curateRegistry (agentIdentifier) {
  if (!agentIdentifier) return
  if (!registry[agentIdentifier]) registry[agentIdentifier] = new Map()
}

/**
 * Drain buffered events out of the EE. Each feature **should** have its events bucket into a "group".  The feature should drain this group explicitly
 * @param {string} agentIdentifier
 * @param {string} group
 */
export function drain (agentIdentifier = '', featureName = 'feature') {
  curateRegistry(agentIdentifier)
  // if its not in the registry, that means the instrument file was bypassed.  This could happen in tests, or loaders that directly import the agg
  if (!agentIdentifier || !registry[agentIdentifier].get(featureName)) return drainGroup(featureName)
  registry[agentIdentifier].get(featureName).staged = true

  const items = Array.from(registry[agentIdentifier])
  if (items.every(([key, values]) => values.staged)) {
    items.sort((a, b) => a[1].priority - b[1].priority)
    items.forEach(([group]) => {
      drainGroup(group)
    })
  }

  function drainGroup (group) {
    const baseEE = agentIdentifier ? ee.get(agentIdentifier) : ee
    const handlers = defaultRegister.handlers
    if (!baseEE.backlog || !handlers) return

    var bufferedEventsInGroup = baseEE.backlog[group]
    var groupHandlers = handlers[group]
    if (groupHandlers) {
      // don't cache length, buffer can grow while processing
      for (var i = 0; bufferedEventsInGroup && i < bufferedEventsInGroup.length; ++i) {
        // eslint-disable-line no-unmodified-loop-condition
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
    baseEE.emit('drain-' + group, [])
  }
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
