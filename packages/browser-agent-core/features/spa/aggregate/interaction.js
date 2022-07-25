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

InteractionPrototype.checkFinish = function checkFinish() {
  console.log("checkFinish", this.root.attrs.newUrl, this.root.attrs.newRoute)
  var interaction = this
  console.log("check finish!!! checking?, remaining, id", interaction.checkingFinish, interaction.remaining, interaction.id)
 
  if (interaction.remaining) {
    interaction._resetFinishCheck()
    return
  }

  if (interaction.checkingFinish) {
    return
  }

  if (interaction.root.end !== null) return

  interaction._resetFinishCheck()

  // var attrs = this.root.attrs
  // attrs.newURL = url
  // attrs.newRoute = routeName

  console.log("check finish -- set timeouts....", interaction.id)

  interaction.checkingFinish = true
  interaction.finishTimer = originalSetTimeout(() => {
    console.log("checkingFinish = false")
    interaction.checkingFinish = false
    interaction.finishTimer = originalSetTimeout(() => {
      console.log("finishTimer = null")
      interaction.finishTimer = null
      console.log("interaction.remaining...", interaction.remaining)
      if (!interaction.remaining) interaction.finish()
    }, 1)
  }, 0)
}

InteractionPrototype.setNewURL = function setNewURL(url){
  this.root.attrs.newURL = url
}

InteractionPrototype.setNewRoute = function setNewRoute(route){
  this.root.attrs.newRoute = route
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
  console.log("inside Interaction.finish (checkFinish)") 
  var interaction = this
  var root = interaction.root
  console.log("root.end -- is it null?", root.end)
  if (root.end !== null) return
  var endTimestamp = Math.max(interaction.lastCb, interaction.lastFinish)
  var delta = now() - endTimestamp
  console.log('finish interaction, ID=' + root.id + ', lastTime = ' + delta + ' ms ago, urlChange=' + this.routeChange)


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
