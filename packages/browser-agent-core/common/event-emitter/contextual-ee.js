/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { gosNREUM } from '../window/nreum'
import { getOrSet } from '../util/get-or-set'
import { mapOwn } from '../util/map-own'

var ctxId = 'nr@context'

// create global emitter instance that can be shared among bundles
let nr = gosNREUM()
var globalInstance
if (nr.ee) {
  globalInstance = nr.ee
} else {
  globalInstance = ee(undefined, 'globalEE')
  nr.ee = globalInstance
}

export { globalInstance as ee }

function EventContext () {}

function ee (old, debugId) {
  var handlers = {}
  var bufferGroupMap = {}
  var emitters = {}

  var emitter = {
    on: addEventListener,
    addEventListener: addEventListener,
    removeEventListener: removeEventListener,
    emit: emit,
    get: getOrCreate,
    listeners: listeners,
    context: context,
    buffer: bufferEventsByGroup,
    abort: abortIfNotLoaded,
    aborted: false,
    isBuffering: isBuffering,
    debugId,
    backlog: old && old.backlog ? old.backlog : {}
  }

  return emitter

  function context (contextOrStore) {
    if (contextOrStore && contextOrStore instanceof EventContext) {
      return contextOrStore
    } else if (contextOrStore) {
      return getOrSet(contextOrStore, ctxId, getNewContext)
    } else {
      return getNewContext()
    }
  }

  function emit (type, args, contextOrStore, force, bubble) {

    if (bubble !== false) bubble = true
    if (globalInstance.aborted && !force) { return }
    if (old && bubble) old.emit(type, args, contextOrStore)
    // log("continue...")
    
    var ctx = context(contextOrStore)
    var handlersArray = listeners(type)
    var len = handlersArray.length

    // Apply each handler function in the order they were added
    // to the context with the arguments
    
    for (var i = 0; i < len; i++) handlersArray[i].apply(ctx, args)

    // log(bufferGroupMap[type])
    // Buffer after emitting for consistent ordering
    var bufferGroup = getBuffer()[bufferGroupMap[type]]
    if (bufferGroup) {
      bufferGroup.push([emitter, type, args, ctx])
    }

    // log(bufferGroup)

    // Return the context so that the module that emitted can see what was done.
    return ctx
  }

  function addEventListener (type, fn) {
    // Retrieve type from handlers, if it doesn't exist assign the default and retrieve it.
    handlers[type] = listeners(type).concat(fn)
  }

  function removeEventListener (type, fn) {
    var listeners = handlers[type]
    if (!listeners) return
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1)
      }
    }
  }

  function listeners (type) {
    return handlers[type] || []
  }

  function getOrCreate (name) {
    return (emitters[name] = emitters[name] || ee(emitter, name))
  }

  function bufferEventsByGroup (types, group) {
    var eventBuffer = getBuffer()

    // do not buffer events if agent has been aborted
    if (emitter.aborted) return
    mapOwn(types, function (i, type) {
      group = group || 'feature'
      bufferGroupMap[type] = group
      if (!(group in eventBuffer)) {
        eventBuffer[group] = []
      }
    })
  }

  function isBuffering(type) {
    var bufferGroup = getBuffer()[bufferGroupMap[type]]
    return !!bufferGroup
  }

  // buffer is associated with a base emitter, since there are two
  // (global and scoped to the current bundle), it is now part of the emitter
  function getBuffer() {
    return emitter.backlog
  }
}

// get context object from store object, or create if does not exist
export function getOrSetContext(obj) {
  return getOrSet(obj, ctxId, getNewContext)
}

function getNewContext () {
  return new EventContext()
}

// abort should be called 30 seconds after the page has started running
// We should drop our data and stop collecting if we still have a backlog, which
// signifies the rest of the agent wasn't loaded
function abortIfNotLoaded () {
  if (globalInstance.backlog.api || globalInstance.backlog.feature) {
    globalInstance.aborted = true
    globalInstance.backlog = {}
  }
}
