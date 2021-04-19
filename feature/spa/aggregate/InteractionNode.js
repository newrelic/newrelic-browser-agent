/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var INTERACTION = 'interaction'
var MAX_NODES = 128
var REMAINING = 'remaining'

var lastId = 0

module.exports = InteractionNode

function InteractionNode (interaction, parent, type, timestamp) {
  this[INTERACTION] = interaction
  this.parent = parent
  this.id = ++lastId
  this.type = type
  this.children = []
  this.end = null
  this.jsEnd = this.start = timestamp
  this.jsTime = 0
  this.attrs = {}
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
  var interaction = this[INTERACTION]
  if (interaction.end || interaction.nodes >= MAX_NODES) return null

  interaction.onNodeAdded(this)

  var node = new InteractionNode(interaction, this, type, timestamp)
  node.attrs.name = name
  interaction.nodes++
  if (!dontWait) interaction[REMAINING]++
  return node
}

InteractionNodePrototype.callback = function addCallbackTime (exclusiveTime, end) {
  var node = this

  node.jsTime += exclusiveTime
  if (end > node.jsEnd) {
    node.jsEnd = end
    node[INTERACTION].lastCb = end
  }
}

InteractionNodePrototype.finish = function finish (timestamp) {
  var node = this
  if (node.end) return
  node.end = timestamp
  var parent = node.parent
  while (parent.cancelled) parent = parent.parent
  parent.children.push(node)
  node.parent = null

  var interaction = this[INTERACTION]
  interaction[REMAINING]--
  interaction.lastFinish = timestamp
}
