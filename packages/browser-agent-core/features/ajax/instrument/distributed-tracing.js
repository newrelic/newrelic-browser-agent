/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getConfiguration, getConfigurationValue, getLoaderConfig } from '../../../common/config/config'
import { generateSpanId, generateTraceId } from '../../../common/ids/unique-id'
import { parseUrl } from '../../../common/url/parse-url'

export class DT {
  constructor(agentIdentifier) {
    this.agentIdentifier = agentIdentifier
  }

  generateTracePayload (parsedOrigin) {
    if (!this.shouldGenerateTrace(parsedOrigin)) {
      return null
    }

    var loader_config = getLoaderConfig(this.agentIdentifier)
    if (!loader_config) {
      return null
    }

    var accountId = (loader_config.accountID || '').toString() || null
    var agentId = (loader_config.agentID || '').toString() || null
    var trustKey = (loader_config.trustKey || '').toString() || null

    if (!accountId || !agentId) {
      return null
    }

    var spanId = generateSpanId()
    var traceId = generateTraceId()
    var timestamp = Date.now()

    var payload = {
      spanId: spanId,
      traceId: traceId,
      timestamp: timestamp
    }

    if (parsedOrigin.sameOrigin ||
        (this.isAllowedOrigin(parsedOrigin) && this.useTraceContextHeadersForCors())) {
      payload.traceContextParentHeader = this.generateTraceContextParentHeader(spanId, traceId)
      payload.traceContextStateHeader = this.generateTraceContextStateHeader(spanId, timestamp,
        accountId, agentId, trustKey)
    }

    if ((parsedOrigin.sameOrigin && !this.excludeNewrelicHeader()) ||
        (!parsedOrigin.sameOrigin && this.isAllowedOrigin(parsedOrigin) && this.useNewrelicHeaderForCors())) {
      payload.newrelicHeader = this.generateTraceHeader(spanId, traceId, timestamp, accountId,
        agentId, trustKey)
    }

    return payload
  }

  generateTraceContextParentHeader(spanId, traceId) {
    return '00-' + traceId + '-' + spanId + '-01'
  }

  generateTraceContextStateHeader(spanId, timestamp, accountId, appId, trustKey) {
    var version = 0
    var transactionId = ''
    var parentType = 1
    var sampled = ''
    var priority = ''

    return trustKey + '@nr=' + version + '-' + parentType + '-' + accountId +
      '-' + appId + '-' + spanId + '-' + transactionId + '-' + sampled + '-' + priority + '-' + timestamp
  }

  generateTraceHeader (spanId, traceId, timestamp, accountId, appId, trustKey) {
    var hasBtoa = ('btoa' in window && typeof window.btoa === 'function')
    if (!hasBtoa) {
      return null
    }

    var payload = {
      v: [0, 1],
      d: {
        ty: 'Browser',
        ac: accountId,
        ap: appId,
        id: spanId,
        tr: traceId,
        ti: timestamp
      }
    }
    if (trustKey && accountId !== trustKey) {
      payload.d.tk = trustKey
    }

    return btoa(JSON.stringify(payload))
  }

  // return true if DT is enabled and the origin is allowed, either by being
  // same-origin, or included in the allowed list
  shouldGenerateTrace (parsedOrigin) {
    return this.isDtEnabled() && this.isAllowedOrigin(parsedOrigin)
  }

  isAllowedOrigin(parsedOrigin) {
    var allowed = false
    var dtConfig = {}
    var dt = getConfigurationValue('distributed_tracing')

    if (dt) {
      dtConfig = getConfiguration().distributed_tracing
    }

    if (parsedOrigin.sameOrigin) {
      allowed = true
    } else if (dtConfig.allowed_origins instanceof Array) {
      for (var i = 0; i < dtConfig.allowed_origins.length; i++) {
        var allowedOrigin = parseUrl(dtConfig.allowed_origins[i])
        if (parsedOrigin.hostname === allowedOrigin.hostname &&
            parsedOrigin.protocol === allowedOrigin.protocol &&
            parsedOrigin.port === allowedOrigin.port) {
          allowed = true
          break
        }
      }
    }
    return allowed
  }

  isDtEnabled() {
    var dt = getConfigurationValue(this.agentIdentifier, 'distributed_tracing')
    if (dt) {
      return !!dt.enabled
    }
    return false
  }

  // exclude the newrelic header for same-origin calls
  excludeNewrelicHeader() {
    var dt = getConfigurationValue(this.agentIdentifier, 'distributed_tracing')
    if (dt) {
      return !!dt.exclude_newrelic_header
    }
    return false
  }

  useNewrelicHeaderForCors() {
    var dt = getConfigurationValue(this.agentIdentifier, 'distributed_tracing')
    if (dt) {
      return dt.cors_use_newrelic_header !== false
    }
    return false
  }

  useTraceContextHeadersForCors() {
    var dt = getConfigurationValue(this.agentIdentifier, 'distributed_tracing')
    if (dt) {
      return !dt.cors_use_tracecontext_headers
    }
    return false
  }
}

