/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var cleanURL = require('../../../agent/clean-url')
var loader = require('loader')
var mapOwn = require('map-own')
var nullable = require('../../../agent/bel-serializer').nullable
var numeric = require('../../../agent/bel-serializer').numeric
var getAddStringContext = require('../../../agent/bel-serializer').getAddStringContext
var addCustomAttributes = require('../../../agent/bel-serializer').addCustomAttributes

module.exports = serializeSingle
module.exports.serializeMultiple = serializeMultiple

function serializeMultiple(interactions, offset, navTiming) {
  var addString = getAddStringContext()
  var serialized = 'bel.7'
  interactions.forEach(function(interaction) {
    serialized += ';' + serializeInteraction(interaction.root, offset, navTiming, interaction.routeChange, addString)
  })
  return serialized
}

function serializeSingle(root, offset, navTiming, isRouteChange) {
  var addString = getAddStringContext()
  return 'bel.7;' + serializeInteraction(root, offset, navTiming, isRouteChange, addString)
}

function serializeInteraction (root, offset, navTiming, isRouteChange, addString) {
  offset = offset || 0
  var isInitialPage = root.attrs.trigger === 'initialPageLoad'
  var firstTimestamp
  var typeIdsByName = {
    interaction: 1,
    ajax: 2,
    customTracer: 4
  }

  // Include the hash fragment with all SPA data
  var includeHashFragment = true

  return addNode(root, []).join(';')

  function addNode (node, nodeList) {
    if (node.type === 'customEnd') return nodeList.push([3, numeric(node.end - firstTimestamp)])
    var typeName = node.type
    var typeId = typeIdsByName[typeName]
    var startTimestamp = node.start
    var childCount = node.children.length
    var attrCount = 0
    var apmAttributes = loader.info.atts
    var hasNavTiming = isInitialPage && navTiming.length && typeId === 1
    var children = []
    var attrs = node.attrs
    var metrics = attrs.metrics
    var params = attrs.params
    var queueTime = loader.info.queueTime
    var appTime = loader.info.applicationTime

    if (typeof firstTimestamp === 'undefined') {
      startTimestamp += offset
      firstTimestamp = startTimestamp
    } else {
      startTimestamp -= firstTimestamp
    }

    var fields = [
      numeric(startTimestamp),
      numeric(node.end - node.start),
      numeric(node.jsEnd - node.end),
      numeric(node.jsTime)
    ]

    switch (typeId) {
      case 1:
        fields[2] = numeric(node.jsEnd - firstTimestamp)
        fields.push(
          addString(attrs.trigger),
          addString(cleanURL(attrs.initialPageURL, includeHashFragment)),
          addString(cleanURL(attrs.oldURL, includeHashFragment)),
          addString(cleanURL(attrs.newURL, includeHashFragment)),
          addString(attrs.customName),
          isInitialPage ? '' : isRouteChange ? 1 : 2,
          nullable(isInitialPage && queueTime, numeric, true) +
          nullable(isInitialPage && appTime, numeric, true) +
          nullable(attrs.oldRoute, addString, true) +
          nullable(attrs.newRoute, addString, true) +
          addString(attrs.id),
          addString(node.id),
          nullable(attrs.firstPaint, numeric, true) +
          nullable(attrs.firstContentfulPaint, numeric, false)
        )

        var attrParts = addCustomAttributes(attrs.custom, addString)
        children = children.concat(attrParts)
        attrCount = attrParts.length

        if (apmAttributes) {
          childCount++
          children.push('a,' + addString(apmAttributes))
        }

        break

      case 2:
        fields.push(
          addString(params.method),
          numeric(params.status),
          addString(params.host),
          addString(params.pathname),
          numeric(metrics.txSize),
          numeric(metrics.rxSize),
          attrs.isFetch ? 1 : (attrs.isJSONP ? 2 : ''),
          addString(node.id),
          nullable(node.dt && node.dt.spanId, addString, true) +
          nullable(node.dt && node.dt.traceId, addString, true) +
          nullable(node.dt && node.dt.timestamp, numeric, false)
        )
        break

      case 4:
        var tracedTime = attrs.tracedTime
        fields.push(
          addString(attrs.name),
          nullable(tracedTime, numeric, true) +
          addString(node.id)
        )
        break
    }

    for (var i = 0; i < node.children.length; i++) {
      addNode(node.children[i], children)
    }

    fields.unshift(
      numeric(typeId),
      numeric(childCount += attrCount)
    )

    nodeList.push(fields)

    if (childCount) {
      nodeList.push(children.join(';'))
    }

    if (hasNavTiming) {
      // this build up the navTiming node
      // it for each navTiming value (pre aggregated in nav-timing.js):
      // we initialize the seperator to ',' (seperates the nodeType id from the first value)
      // we initialize the navTiming node to 'b' (the nodeType id)
      // if the value is present:
      //   we add the seperator followed by the value
      // otherwise
      //   we add null seperator ('!') to the navTimingNode
      //   we set the seperator to an empty string since we already wrote it above
      //   the reason for writing the null seperator instead of setting the seperator
      //   is to ensure we still write it if the null is the last navTiming value.

      var seperator = ','
      var navTimingNode = 'b'
      var prev = 0

      // get all navTiming values except navigationStart
      // (since its the same as interaction.start)
      // and limit to just the first 20 values we know about
      mapOwn(navTiming.slice(1, 21), function (i, v) {
        if (v !== void 0) {
          navTimingNode += seperator + numeric(v - prev)
          seperator = ','
          prev = v
        } else {
          navTimingNode += seperator + '!'
          seperator = ''
        }
      })
      nodeList.push(navTimingNode)
    } else if (typeId === 1) {
      nodeList.push('')
    }

    return nodeList
  }
}
