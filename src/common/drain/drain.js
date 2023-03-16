/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee } from '../event-emitter/contextual-ee'
import { mapOwn } from '../util/map-own'
import { registerHandler as defaultRegister } from '../event-emitter/register-handler'
import { featurePriority } from '../../loaders/features/features'

const registry = {}

/**
 * Adds an entry to the centralized drain registry specifying that a particular agent has events of a particular named
 * event-group "bucket" that should be drained at the time the agent drains all its buffered events. Buffered events
 * accumulate because instrumentation begins as soon as possible, before the agent has finished lazy-loading the code
 * responsible for aggregating and reporting captured data.
 * @param {string} agentIdentifier - A 16 character string uniquely identifying the agent.
 * @param {string} group - The named "bucket" for the events this feature will be bucketing for later collection.
 */
export function registerDrain (agentIdentifier, group) {
  // Here `item` captures the registered properties of a feature-group: whether it is ready for its buffered events
  // to be drained (`staged`) and the `priority` order in which it should be drained relative to other feature groups.
  const item = { staged: false, priority: featurePriority[group] || 0 }
  curateRegistry(agentIdentifier)
  if (!registry[agentIdentifier].get(group)) registry[agentIdentifier].set(group, item)
}

/**
 * Registers the specified agent with the centralized event buffer registry if it is not already registered.
 * Agents without an identifier (as in the case of some tests) will be excluded from the registry.
 * @param {string} agentIdentifier - A 16 character string uniquely identifying an agent.
 */
function curateRegistry (agentIdentifier) {
  if (!agentIdentifier) return
  if (!registry[agentIdentifier]) registry[agentIdentifier] = new Map()
}

/**
 * Drain buffered events out of the event emitter. Each feature should have its events bucketed by "group" and drain
 * its own named group explicitly, when ready.
 * @param {string} agentIdentifier - A unique 16 character ID corresponding to an instantiated agent.
 * @param {string} featureName - A named group into which the feature's buffered events are bucketed.
 */
export function drain (agentIdentifier = '', featureName = 'feature') {
  curateRegistry(agentIdentifier)

  // If the feature for the specified agent is not in the registry, that means the instrument file was bypassed.
  // This could happen in tests, or loaders that directly import the aggregator. In these cases it is safe to
  // drain the feature group immediately rather than waiting to drain all at once.
  if (!agentIdentifier || !registry[agentIdentifier].get(featureName)) return drainGroup(featureName)

  // When `drain` is called, this feature is ready to drain (staged).
  registry[agentIdentifier].get(featureName).staged = true

  // Only when the event-groups for all features are ready to drain (staged) do we execute the drain. This has the effect
  // that the last feature to call drain triggers drain for all features.
  const items = Array.from(registry[agentIdentifier])
  if (items.every(([key, values]) => values.staged)) {
    items.sort((a, b) => a[1].priority - b[1].priority)
    items.forEach(([group]) => {
      drainGroup(group)
    })
  }

  /**
   * Drains all the buffered (backlog) events for a particular feature's event-group by emitting each event to each of
   * the subscribed handlers for the group.
   * @param {*} group - The name of a particular feature's event "bucket".
   */
  function drainGroup (group) {
    const baseEE = agentIdentifier ? ee.get(agentIdentifier) : ee
    const handlers = defaultRegister.handlers
    if (!baseEE.backlog || !handlers) return

    var bufferedEventsInGroup = baseEE.backlog[group]
    var groupHandlers = handlers[group]
    if (groupHandlers) {
      // We don't cache the length of the buffer while looping because events might still be added while processing.
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

    // Keep the feature's event-group as a property of the event emitter so we know it was already created and drained.
    baseEE.backlog[group] = null
    baseEE.emit('drain-' + group, [])
  }
}

/**
 * Processes the specified event using all relevant handler functions associated with a particular feature, based on
 * whether the the handler is meant to apply to events of this type. (Event type is a descriptive string set at the
 * time an event is originally created by instrumentation, as with calls to the `handle` method.)
 * @param {*} evt - A single event to be emitted to (processed by) eligible handler functions.
 * @param {*} groupHandlers - A set of handler functions associated with a particular feature's event-group.
 */
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
