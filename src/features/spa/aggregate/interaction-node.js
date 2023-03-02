/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var MAX_NODES = 128

var lastId = 0

export function InteractionNode (interaction, parent, type, timestamp) {
  Object.defineProperty(this, 'interaction', {
    value: interaction, writable: true // enumerable: false -- by default, which hides this prop from obj (iterations)
  })
  this.parent = parent
  this.id = ++lastId
  this.type = type
  this.children = []
  this.end = null
  this.jsEnd = this.start = timestamp
  this.jsTime = 0
  this.attrs = {}
  this.cancelled = false
}

var InteractionNodePrototype = InteractionNode.prototype

/**
 * @param {string} type
 * @param {number} timestamp
 * @param {string} name
 * @param {bool} dontWait - When true, the interaction will not immediately start waiting
 *                          for this node to complete. This is used when the creation of
 *                          the node and its start happen at different times (e.g. XHR).
 */
InteractionNodePrototype.child = function child (type, timestamp, name, dontWait) {
  var interaction = this.interaction
  if (interaction.end || interaction.nodes >= MAX_NODES) return null

  interaction.onNodeAdded(this)

  var node = new InteractionNode(interaction, this, type, timestamp)
  node.attrs.name = name
  interaction.nodes++
  if (!dontWait) {
    interaction.remaining++
  }
  return node
}

InteractionNodePrototype.callback = function addCallbackTime (exclusiveTime, end) {
  var node = this

  node.jsTime += exclusiveTime
  if (end > node.jsEnd) {
    node.jsEnd = end
    node.interaction.lastCb = end
  }
}

InteractionNodePrototype.cancel = function cancel () {
  this.cancelled = true
  var interaction = this.interaction
  interaction.remaining--
}

InteractionNodePrototype.finish = function finish (timestamp) {
  var node = this
  if (node.end) return
  node.end = timestamp

  // Find the next parent node that is not cancelled
  let parent = node.parent
  while (parent?.cancelled) parent = parent.parent

  // Assign the node to the non-cancelled parent node
  if (parent) parent.children.push(node)
  node.parent = null

  // Update the interaction remaining counter
  var interaction = this.interaction
  interaction.remaining--
  interaction.lastFinish = timestamp
  // check if interaction has finished, (this is needed for older browsers for unknown reasons)
  interaction.checkFinish()
}
