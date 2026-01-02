/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { generateSpanId, generateTraceId } from '../../../common/ids/unique-id'
import { parseUrl } from '../../../common/url/parse-url'
import { globalScope } from '../../../common/constants/runtime'
import { stringify } from '../../../common/util/stringify'

export class DT {
  constructor (agentRef) {
    this.agentRef = agentRef
  }

  generateTracePayload (parsedOrigin) {
    const loaderConfig = this.agentRef.loader_config
    if (!this.shouldGenerateTrace(parsedOrigin) || !loaderConfig) {
      return null
    }

    var accountId = (loaderConfig.accountID || '').toString() || null
    var agentId = (loaderConfig.agentID || '').toString() || null
    var trustKey = (loaderConfig.trustKey || '').toString() || null

    if (!accountId || !agentId) {
      return null
    }

    var spanId = generateSpanId()
    var traceId = generateTraceId()
    var timestamp = Date.now()

    var payload = {
      spanId,
      traceId,
      timestamp
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

  generateTraceContextParentHeader (spanId, traceId) {
    return '00-' + traceId + '-' + spanId + '-01'
  }

  generateTraceContextStateHeader (spanId, timestamp, accountId, appId, trustKey) {
    var version = 0
    var transactionId = ''
    var parentType = 1
    var sampled = ''
    var priority = ''

    return trustKey + '@nr=' + version + '-' + parentType + '-' + accountId +
      '-' + appId + '-' + spanId + '-' + transactionId + '-' + sampled + '-' + priority + '-' + timestamp
  }

  generateTraceHeader (spanId, traceId, timestamp, accountId, appId, trustKey) {
    var hasBtoa = (typeof globalScope?.btoa === 'function')
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

    return btoa(stringify(payload))
  }

  // return true if DT is enabled and the origin is allowed, either by being
  // same-origin, or included in the allowed list
  shouldGenerateTrace (parsedOrigin) {
    return this.agentRef.init?.distributed_tracing?.enabled && this.isAllowedOrigin(parsedOrigin)
  }

  isAllowedOrigin (parsedOrigin) {
    var allowed = false
    const dtConfig = this.agentRef.init?.distributed_tracing

    if (parsedOrigin.sameOrigin) {
      allowed = true
    } else if (dtConfig?.allowed_origins instanceof Array) {
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

  // exclude the newrelic header for same-origin calls
  excludeNewrelicHeader () {
    var dt = this.agentRef.init?.distributed_tracing
    if (dt) {
      return !!dt.exclude_newrelic_header
    }
    return false
  }

  useNewrelicHeaderForCors () {
    var dt = this.agentRef.init?.distributed_tracing
    if (dt) {
      return dt.cors_use_newrelic_header !== false
    }
    return false
  }

  useTraceContextHeadersForCors () {
    var dt = this.agentRef.init?.distributed_tracing
    if (dt) {
      return !!dt.cors_use_tracecontext_headers
    }
    return false
  }
}
