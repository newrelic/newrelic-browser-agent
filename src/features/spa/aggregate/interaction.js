/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getInfo } from '../../../common/config/info'
import { initialLocation } from '../../../common/constants/runtime'
import { gosNREUMOriginals } from '../../../common/window/nreum'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { InteractionNode } from './interaction-node'

var originalSetTimeout = gosNREUMOriginals().o.ST
var originalClearTimeout = gosNREUMOriginals().o.CT

var lastId = {}

export function Interaction (eventName, timestamp, url, routeName, onFinished, agentIdentifier) {
  this.agentIdentifier = agentIdentifier
  this.ee = ee.get(agentIdentifier)

  lastId[agentIdentifier] = 0
  this.id = ++lastId[agentIdentifier]
  this.eventName = eventName
  this.nodes = 0
  this.remaining = 0
  this.finishTimer = null
  this.checkingFinish = false
  this.lastCb = this.lastFinish = timestamp
  this.handlers = []
  this.onFinished = onFinished
  this.done = false

  var root = this.root = new InteractionNode(this, null, 'interaction', timestamp)
  var attrs = root.attrs

  attrs.trigger = eventName
  attrs.initialPageURL = initialLocation
  attrs.oldRoute = routeName
  attrs.newURL = attrs.oldURL = url
  attrs.custom = {}
  attrs.store = {}
}

var InteractionPrototype = Interaction.prototype

InteractionPrototype.checkFinish = function checkFinish () {
  var interaction = this

  if (interaction.remaining > 0) {
    interaction._resetFinishCheck()
    return
  }

  if (interaction.checkingFinish) {
    return
  }

  if (interaction.root.end !== null) return

  interaction._resetFinishCheck()

  interaction.checkingFinish = true
  interaction.finishTimer = originalSetTimeout(() => {
    interaction.checkingFinish = false
    interaction.finishTimer = originalSetTimeout(() => {
      interaction.finishTimer = null
      if (interaction.remaining <= 0) interaction.finish()
    }, 1)
  }, 0)
}

InteractionPrototype.setNewURL = function setNewURL (url) {
  this.root.attrs.newURL = url
}

InteractionPrototype.setNewRoute = function setNewRoute (route) {
  this.root.attrs.newRoute = route
}

InteractionPrototype.onNodeAdded = function onNodeAdded () {
  this._resetFinishCheck()
}

InteractionPrototype._resetFinishCheck = function _resetFinishCheck () {
  if (this.finishTimer) {
    originalClearTimeout(this.finishTimer)
    this.finishTimer = null
    this.checkingFinish = false
  }
}

// serialize report and remove nodes from map
InteractionPrototype.finish = function finishInteraction () {
  var interaction = this
  var root = interaction.root
  if (root.end !== null) return
  var endTimestamp = Math.max(interaction.lastCb, interaction.lastFinish)
  var attrs = root.attrs
  var customAttrs = attrs.custom

  if (this.onFinished) {
    this.onFinished(this)
  }

  Object.entries(getInfo(interaction.agentIdentifier).jsAttributes || {}).forEach(([attr, value]) => {
    if (!(attr in customAttrs)) customAttrs[attr] = value
  })

  root.end = endTimestamp
  interaction.ee.emit('interaction', [this])
}
