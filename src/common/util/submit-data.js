/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isWorkerScope } from './global-scope'
export const submitData = {}

/**
 * Send via JSONP. Do NOT call this function outside of a guaranteed web window environment.
 * @param {Object} args - The args
 * @param {string} args.url - The URL to send to
 * @param {string} args.jsonp - The string name of the jsonp cb method
 * @returns {XMLHttpRequest}
 * @returns {Element}
 */
submitData.jsonp = function jsonp ({ url, jsonp }) {
  try {
    if (isWorkerScope) {
      try {
        return importScripts(url + '&jsonp=' + jsonp)
      } catch (e) {
        // for now theres no other way to execute the callback from ingest without jsonp, or unsafe eval / new Function calls
        // future work needs to be conducted to allow ingest to return a more traditional JSON API-like experience for the entitlement flags
        submitData.xhrGet(url + '&jsonp=' + jsonp)
        return false
      }
    } else {
      var element = document.createElement('script')
      element.type = 'text/javascript'
      element.src = url + '&jsonp=' + jsonp
      var firstScript = document.getElementsByTagName('script')[0]
      firstScript.parentNode.insertBefore(element, firstScript)
      return element
    }
  } catch (err) {
  // do nothing
  }
}

submitData.xhrGet = function xhrGet ({ url }) {
  return submitData.xhr({ url, sync: false, method: 'GET' })
}

/**
 * Send via XHR
 * @param {Object} args - The args
 * @param {string} args.url - The URL to send to
 * @param {string=} args.body - The Stringified body
 * @param {boolean=} args.sync - Run XHR as Synchronous
 * @param {string=} [args.method=POST] - The XHR method to use
 * @param {{key: string, value: string}[]} [args.headers] - The headers to attach
 * @returns {XMLHttpRequest}
 */
submitData.xhr = function xhr ({ url, body, sync, method = 'POST', headers = [{ key: 'content-type', value: 'text/plain' }] }) {
  var request = new XMLHttpRequest()

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
 * Unused at the moment -- DEPRECATED
 */
// submitData.xhrSync = function xhrSync (url, body) {
//   return submitData.xhr(url, body, true)
// }

/**
 * Send by appending an <img> element to the page. Do NOT call this function outside of a guaranteed web window environment.
 * @param {Object} args - The args
 * @param {string} args.url - The URL to send to
 * @returns {HTMLImageElement}
 */
submitData.img = function img ({ url }) {
  console.log('img url', url)
  var element = new Image()
  element.src = url
  return element
}

/**
 * Send via sendBeacon. Do NOT call this function outside of a guaranteed web window environment.
 * @param {Object} args - The args
 * @param {string} args.url - The URL to send to
 * @param {string=} args.body - The Stringified body
 * @returns {boolean}
 */
submitData.beacon = function ({ url, body }) {
  // Navigator has to be bound to ensure it does not error in some browsers
  // https://xgwang.me/posts/you-may-not-know-beacon/#it-may-throw-error%2C-be-sure-to-catch
  const send = window.navigator.sendBeacon.bind(window.navigator)
  try {
    return send(url, body)
  } catch (err) {
    // if sendBeacon still trys to throw an illegal invocation error,
    // we can catch here and return.  The harvest module will fallback to use
    // .img to try to send
    return false
  }
}
