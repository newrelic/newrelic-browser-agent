/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { dispatchGlobalEvent } from '../../common/dispatch/global-event'
import { registerHandler as defaultRegister } from '../event-emitter/register-handler'
import { featurePriority } from '../../loaders/features/features'
import { EventContext } from '../event-emitter/event-context'

/**
 * Adds an entry to the centralized drain registry specifying that a particular agent has events of a particular named
 * event-group "bucket" that should be drained at the time the agent drains all its buffered events. Buffered events
 * accumulate because instrumentation begins as soon as possible, before the agent has finished lazy-loading the code
 * responsible for aggregating and reporting captured data.
 * @param {Object} agentRef - The agent reference object.
 * @param {string} group - The named "bucket" for the events this feature will be bucketing for later collection.
 */
export function registerDrain (agentRef, group) {
  if (!agentRef) return
  // Here `item` captures the registered properties of a feature-group: whether it is ready for its buffered events
  // to be drained (`staged`) and the `priority` order in which it should be drained relative to other feature groups.
  const item = { staged: false, priority: featurePriority[group] || 0 }
  if (!agentRef.runtime.drainRegistry.get(group)) agentRef.runtime.drainRegistry.set(group, item)
}

/**
 * Removes an item from the registry and immediately re-checks if the registry is ready to "drain all"
 * @param {Object} agentRef - The agent reference object.
 * @param {*} group - The named "bucket" to be removed from the registry
 */
export function deregisterDrain (agentRef, group) {
  if (!agentRef) return
  const drainRegistry = agentRef.runtime.drainRegistry
  if (!drainRegistry) return
  if (drainRegistry.get(group)) drainRegistry.delete(group)
  drainGroup(agentRef, group, false)
  if (drainRegistry.size) checkCanDrainAll(agentRef)
}

/**
 * Drain buffered events out of the event emitter. Each feature should have its events bucketed by "group" and drain
 * its own named group explicitly, when ready.
 * @param {Object} agentRef - The agent reference object.
 * @param {string} featureName - A named group into which the feature's buffered events are bucketed.
 * @param {boolean} force - Whether to force the drain to occur immediately, bypassing the registry and staging logic.
 */
export function drain (agentRef, featureName = 'feature', force = false) {
  if (!agentRef) return
  // If the feature for the specified agent is not in the registry, that means the instrument file was bypassed.
  // This could happen in tests, or loaders that directly import the aggregator. In these cases it is safe to
  // drain the feature group immediately rather than waiting to drain all at once.
  if (!agentRef.runtime.drainRegistry.get(featureName) || force) return drainGroup(agentRef, featureName)

  // When `drain` is called, this feature is ready to drain (staged).
  agentRef.runtime.drainRegistry.get(featureName).staged = true

  checkCanDrainAll(agentRef)
}

/** Checks all items in the registry to see if they have been "staged".  If ALL items are staged, it will drain all registry items (drainGroup).  It not, nothing will happen */
function checkCanDrainAll (agentRef) {
  if (!agentRef) return
  // Only when the event-groups for all features are ready to drain (staged) do we execute the drain. This has the effect
  // that the last feature to call drain triggers drain for all features.
  const items = Array.from(agentRef.runtime.drainRegistry)
  if (items.every(([key, values]) => values.staged)) {
    items.sort((a, b) => a[1].priority - b[1].priority)
    items.forEach(([group]) => {
      agentRef.runtime.drainRegistry.delete(group)
      drainGroup(agentRef, group)
    })
  }
}

/**
   * Drains all the buffered (backlog) events for a particular feature's event-group by emitting each event to each of
   * the subscribed handlers for the group.
   * @param {*} group - The name of a particular feature's event "bucket".
   */
function drainGroup (agentRef, group, activateGroup = true) {
  if (!agentRef) return
  const baseEE = agentRef.ee
  const handlers = defaultRegister.handlers // other storage in registerHandler
  if (!baseEE || baseEE.aborted || !baseEE.backlog || !handlers) return

  dispatchGlobalEvent({
    type: 'lifecycle',
    name: 'drain',
    feature: group
  })

  // Only activated features being drained should run queued listeners on buffered events. Deactivated features only need to release memory.
  if (activateGroup) {
    const bufferedEventsInGroup = baseEE.backlog[group]
    const groupHandlers = handlers[group] // each group in the registerHandler storage
    if (groupHandlers) {
      // We don't cache the length of the buffer while looping because events might still be added while processing.
      for (let i = 0; bufferedEventsInGroup && i < bufferedEventsInGroup.length; ++i) { // eslint-disable-line no-unmodified-loop-condition
        emitEvent(bufferedEventsInGroup[i], groupHandlers)
      }

      Object.entries(groupHandlers).forEach(([eventType, handlerRegistrationList]) => {
        Object.values(handlerRegistrationList || {}).forEach((registration) => {
          // registration *should* be an array of: [targetEE, eventHandler]
          // certain browser polyfills of .values and .entries pass the prototype methods into the callback,
          // which breaks this assumption and throws errors. So we make sure here that we only call .on() if its an actual NR EE
          if (registration[0]?.on && registration[0].context() instanceof EventContext && !registration[0].listeners(eventType).includes(registration[1])) registration[0].on(eventType, registration[1])
        })
      })
    }
  }

  if (!baseEE.isolatedBacklog) delete handlers[group]
  baseEE.backlog[group] = null
  baseEE.emit('drain-' + group, []) // Informs the feature that it has drained its backlog of events, this kicks off an immediate harvest to capture any load-driven events that were buffered.
}

/**
 * Processes the specified event using all relevant handler functions associated with a particular feature, based on
 * whether the handler is meant to apply to events of this type. (Event type is a descriptive string set at the
 * time an event is originally created by instrumentation, as with calls to the `handle` method.)
 * @param {*} evt - A single event to be emitted to (processed by) eligible handler functions.
 * @param {*} groupHandlers - A set of handler functions associated with a particular feature's event-group.
 */
function emitEvent (evt, groupHandlers) {
  var type = evt[1]
  Object.values(groupHandlers[type] || {}).forEach((registration) => {
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
