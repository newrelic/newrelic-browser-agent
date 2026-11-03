/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { generateSpanId, generateTraceId } from '../../../common/ids/unique-id'
import { parseUrl } from '../../../common/url/parse-url'
import { globalScope } from '../../../common/constants/runtime'
import { stringify } from '../../../common/util/stringify'
import { convertToRegularExpression } from '../../../common/deny-list/deny-list'
import { warn } from '../../../common/util/console'

/* Splits a wildcard allowed_origins entry into protocol, host, and an optional port. Any path after the host is ignored. */
const WILDCARD_ORIGIN = /^(https?):\/\/([^/:]+)(?::(\d+))?(?:\/.*)?$/i

/**
 * Compiles a single `distributed_tracing.allowed_origins` entry into a function that tests a parsed request origin.
 * Entries without a `*` use an exact hostname, protocol, and port comparison. Entries with a `*` in the hostname are
 * matched against a regular expression anchored at both ends. A malformed wildcard entry warns and never matches.
 * @param {string} entry - an `allowed_origins` entry
 * @returns {function(Object): boolean} true if the parsed origin is allowed by the entry
 */
function toMatcher (entry) {
  // decode first so entries mangled by the UI (`%2A`) are treated as wildcards
  const value = String(entry).replace(/%2A/gi, '*')

  if (value.indexOf('*') === -1) {
    const allowed = parseUrl(entry)
    return (origin) => origin.hostname === allowed.hostname &&
      origin.protocol === allowed.protocol &&
      origin.port === allowed.port
  }

  // wildcard entries are split by hand because browsers disagree on how `new URL()` handles `*` in a host
  const parts = WILDCARD_ORIGIN.exec(value)
  // a host made only of wildcards and dots (`*`, `*.*`) would allow every origin
  if (!parts || !parts[2].replace(/[*.]/g, '')) {
    warn(83, entry)
    return () => false
  }

  const protocol = parts[1].toLowerCase()
  const port = parts[3] || (protocol === 'http' ? '80' : '443')
  const hostname = convertToRegularExpression(parts[2].toLowerCase(), true)
  return (origin) => origin.protocol === protocol && origin.port === port && hostname.test(origin.hostname)
}

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
    // Correct to NR server time when timeKeeper is available/ready; if it isn't connected yet (e.g. RUM hasn't
    // completed), accept the uncorrected local timestamp. This only affects the receiving APM agent's computed
    // transportDuration value on its Span -- it is not used for anything else in this payload.
    var timestampCorrected
    if (this.agentRef.runtime?.timeKeeper?.ready) {
      timestampCorrected = Math.floor(this.agentRef.runtime.timeKeeper.correctAbsoluteTimestamp(timestamp))
    }

    var payload = {
      spanId,
      traceId,
      timestamp,
      timestampCorrected
    }

    if (parsedOrigin.sameOrigin ||
        (this.isAllowedOrigin(parsedOrigin) && this.useTraceContextHeadersForCors())) {
      payload.traceContextParentHeader = this.generateTraceContextParentHeader(spanId, traceId)
      payload.traceContextStateHeader = this.generateTraceContextStateHeader(spanId, timestampCorrected ?? timestamp,
        accountId, agentId, trustKey)
    }

    if ((parsedOrigin.sameOrigin && !this.excludeNewrelicHeader()) ||
        (!parsedOrigin.sameOrigin && this.isAllowedOrigin(parsedOrigin) && this.useNewrelicHeaderForCors())) {
      payload.newrelicHeader = this.generateTraceHeader(spanId, traceId, timestampCorrected ?? timestamp, accountId,
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
    if (parsedOrigin.sameOrigin) return true

    const list = this.agentRef.init?.distributed_tracing?.allowed_origins
    if (!(list instanceof Array)) return false

    return this.getMatchers(list).some(matches => matches(parsedOrigin))
  }

  /**
   * Returns the compiled matchers for the allowed origins list. They are compiled lazily because `init` is still being
   * configured when this class is constructed, and are recompiled whenever the list's contents change.
   * @param {Array<string>} list - the current `distributed_tracing.allowed_origins` value
   * @returns {Array<function(Object): boolean>}
   */
  getMatchers (list) {
    const cache = this.matcherCache
    if (!cache || cache.entries.length !== list.length || list.some((entry, i) => entry !== cache.entries[i])) {
      this.matcherCache = { entries: list.slice(), matchers: list.map(toMatcher) }
    }
    return this.matcherCache.matchers
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
