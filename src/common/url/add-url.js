/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { parseUrl } from './parse-url.js'

export function addUrl (ctx, url) {
  var parsed = parseUrl(url)
  var params = ctx.params || ctx

  params.hostname = parsed.hostname
  params.port = parsed.port
  params.protocol = parsed.protocol
  params.host = parsed.hostname + ':' + parsed.port
  params.pathname = parsed.pathname
  ctx.parsedOrigin = parsed
  ctx.sameOrigin = parsed.sameOrigin
}
