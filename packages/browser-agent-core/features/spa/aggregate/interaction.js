/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getInfo, getRuntime, originals } from '../../../common/config/config'
import { mapOwn } from '../../../common/util/map-own'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { InteractionNode } from './interaction-node'
import { now } from '../../../common/timing/now'

var originalSetTimeout = originals.ST
var originalClearTimeout = originals.CT

var lastId = {}

export function Interaction(eventName, timestamp, url, routeName, onFinished, agentIdentifier) {
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
  attrs.initialPageURL = getRuntime(agentIdentifier).origin
  attrs.oldRoute = routeName
  attrs.newURL = attrs.oldURL = url
  attrs.custom = {}
  attrs.store = {}
}

var InteractionPrototype = Interaction.prototype

InteractionPrototype.checkFinish = function checkFinish(url, routeName) {
  var interaction = this
 
  if (interaction.remaining) {
    interaction._resetFinishCheck()
    return
  }

  if (interaction.checkingFinish) {
    return
  }

  if (interaction.root.end !== null) return

  interaction._resetFinishCheck()

  var attrs = this.root.attrs
  attrs.newURL = url
  attrs.newRoute = routeName


  interaction.checkingFinish = true
  interaction.finishTimer = originalSetTimeout(function () {
    interaction.checkingFinish = false
    interaction.finishTimer = originalSetTimeout(function () {
      interaction.finishTimer = null
      if (!interaction.remaining) interaction.finish()
    }, 1)
  }, 0)
}

InteractionPrototype.onNodeAdded = function onNodeAdded() {
  this._resetFinishCheck()
}

InteractionPrototype._resetFinishCheck = function _resetFinishCheck() {
  if (this.finishTimer) {
    originalClearTimeout(this.finishTimer)
    this.finishTimer = null
    this.checkingFinish = false
  }
}

// serialize report and remove nodes from map
InteractionPrototype.finish = function finishInteraction() {
  var interaction = this
  var root = interaction.root
  if (root.end !== null) return
  var endTimestamp = Math.max(interaction.lastCb, interaction.lastFinish)
  // @ifdef SPA_DEBUG
  var delta = now() - endTimestamp
  console.timeStamp('finish interaction, ID=' + root.id + ', lastTime = ' + delta + ' ms ago, urlChange=' + this.routeChange)
  // @endif

  var attrs = root.attrs
  var customAttrs = attrs.custom

  if (this.onFinished) {
    this.onFinished(this)
  }

  mapOwn(getInfo(interaction.agentIdentifier).jsAttributes, function (attr, value) {
    if (!(attr in customAttrs)) customAttrs[attr] = value
  })

  root.end = endTimestamp
  interaction.ee.emit('interaction', [this])
}
