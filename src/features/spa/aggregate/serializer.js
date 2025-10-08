/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { cleanURL } from '../../../common/url/clean-url'
import { nullable, numeric, getAddStringContext, addCustomAttributes } from '../../../common/serialize/bel-serializer'

export class Serializer {
  constructor (agentRef) {
    this.obfuscator = agentRef.runtime.obfuscator
    this.info = agentRef.info

    /**
     * This variable is used to calculate an interactions ending offset when the
     * harvest includes multiple interactions. This variable is set by the first
     * interaction processed and used by subsequent interactions in the same harvest.
     * See https://issues.newrelic.com/browse/NEWRELIC-5498
     * @type {number|undefined}
     */
    this.firstTimestamp = undefined
  }

  serializeMultiple (interactions, offset, navTiming) {
    var addString = getAddStringContext(this.obfuscator)
    var serialized = 'bel.7'
    interactions.forEach((interaction) => {
      serialized += ';' + this.serializeInteraction(interaction.root, offset, navTiming, interaction.routeChange, addString, this.info)
    })
    this.firstTimestamp = undefined
    return serialized
  }

  serializeSingle (root, offset, navTiming, isRouteChange) {
    var addString = getAddStringContext(this.obfuscator)
    var serialized = 'bel.7;' + this.serializeInteraction(root, offset, navTiming, isRouteChange, addString, this.info)
    this.firstTimestamp = undefined
    return serialized
  }

  serializeInteraction (root, offset, navTiming, isRouteChange, addString, info) {
    offset = offset || 0
    var isInitialPage = root.attrs.trigger === 'initialPageLoad'
    var typeIdsByName = {
      interaction: 1,
      ajax: 2,
      customTracer: 4
    }

    // Include the hash fragment with all SPA data
    var includeHashFragment = true

    const addNode = (node, nodeList) => {
      if (node.type === 'customEnd') return nodeList.push([3, numeric(node.end - this.firstTimestamp)])
      var typeName = node.type
      var typeId = typeIdsByName[typeName]
      var startTimestamp = node.start
      var childCount = node.children.length
      var attrCount = 0
      var apmAttributes = info.atts
      var hasNavTiming = isInitialPage && navTiming.length && typeId === 1
      var children = []
      var attrs = node.attrs
      var metrics = attrs.metrics
      var params = attrs.params
      var queueTime = info.queueTime
      var appTime = info.applicationTime

      if (typeof this.firstTimestamp === 'undefined') {
        startTimestamp += offset
        this.firstTimestamp = startTimestamp
      } else {
        startTimestamp -= this.firstTimestamp
      }

      var fields = [
        numeric(startTimestamp),
        numeric(node.end - node.start),
        numeric(node.jsEnd - node.end),
        numeric(node.jsTime)
      ]

      switch (typeId) {
        case 1:
          fields[2] = numeric(node.jsEnd - this.firstTimestamp)
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
          var attrParts = addCustomAttributes({ ...attrs.custom, ...(!!attrs.hasReplay && { hasReplay: attrs.hasReplay }) }, addString)
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

          // add params.gql here
          var ajaxAttrParts = addCustomAttributes({ ...(!!params.gql && params.gql), ...(!!attrs.hasReplay && { hasReplay: attrs.hasReplay }) }, addString)
          children = children.concat(ajaxAttrParts)
          attrCount = ajaxAttrParts.length

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
        Object.values(navTiming.slice(1, 21) || {}).forEach((v) => {
          if (v !== undefined) {
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

    return addNode(root, []).join(';')
  }
}
