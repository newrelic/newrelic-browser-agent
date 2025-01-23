/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Contains common methods used to transmit harvested data.
 * @copyright 2023 New Relic Corporation. All rights reserved.
 * @license Apache-2.0
 */

import { isBrowserScope } from '../constants/runtime'

/**
 * @typedef {xhr|beacon} NetworkMethods
 */

/**
 * Determines the submit method to use based on options.
 * @param {object} opts Options used to determine submit method.
 * @param {boolean} opts.isFinalHarvest Indicates if the data submission is due to
 * a final harvest within the agent.
 */
export function getSubmitMethod ({ isFinalHarvest = false } = {}) {
  if (isFinalHarvest && isBrowserScope) {
    // Use sendBeacon for final harvest
    return beacon
  }

  // If not final harvest, or not browserScope, use XHR post if available
  if (typeof XMLHttpRequest !== 'undefined') {
    return xhr
  }

  // Fallback for web workers where XMLHttpRequest is not available
  return xhrFetch
}

/**
 *
 * @param url
 * @param body
 * @param method
 * @param headers
 * @returns {Promise<Response>}
 */
export function xhrFetch ({
  url,
  body = null,
  method = 'POST',
  headers = [{
    key: 'content-type',
    value: 'text/plain'
  }]
}) {
  const objHeaders = {}

  for (const header of headers) {
    objHeaders[header.key] = header.value
  }

  return fetch(url, { headers: objHeaders, method, body, credentials: 'include' })
}

/**
 * Send via XHR
 * @param {Object} args - The args.
 * @param {string} args.url - The URL to send to.
 * @param {string=} args.body - The Stringified body. Default null to prevent IE11 from breaking.
 * @param {boolean=} args.sync - Run XHR synchronously.
 * @param {string=} [args.method=POST] - The XHR method to use.
 * @param {{key: string, value: string}[]} [args.headers] - The headers to attach.
 * @returns {XMLHttpRequest}
 */
export function xhr ({ url, body = null, sync, method = 'POST', headers = [{ key: 'content-type', value: 'text/plain' }] }) {
  const request = new XMLHttpRequest()

  request.open(method, url, !sync)
  try {
    // Set cookie
    if ('withCredentials' in request) request.withCredentials = true
  } catch (e) {
    // do nothing
  }

  headers.forEach(header => {
    request.setRequestHeader(header.key, header.value)
  })

  request.send(body)
  return request
}

/**
 * Send via sendBeacon. Do NOT call this function outside of a guaranteed web window environment.
 * @param {Object} args - The args
 * @param {string} args.url - The URL to send to
 * @param {string=} args.body - The Stringified body
 * @returns {boolean}
 */
export function beacon ({ url, body }) {
  try {
    // Navigator has to be bound to ensure it does not error in some browsers
    // https://xgwang.me/posts/you-may-not-know-beacon/#it-may-throw-error%2C-be-sure-to-catch
    const send = window.navigator.sendBeacon.bind(window.navigator)
    return send(url, body)
  } catch (err) {
    // if sendBeacon still trys to throw an illegal invocation error,
    // we can catch here and return
    return false
  }
}
