/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const submitData = {}

/**
 * Send via JSONP. Do NOT call this function outside of a guaranteed web window environment.
 * @param {string} url
 * @param {string} jsonp
 * @returns {Element}
 */
submitData.jsonp = function jsonp (url, jsonp) {
  var element = document.createElement('script')
  element.type = 'text/javascript'
  element.src = url + '&jsonp=' + jsonp
  var firstScript = document.getElementsByTagName('script')[0]
  firstScript.parentNode.insertBefore(element, firstScript)
  return element
}

/**
 * Send via XHR
 * @param {string} url
 * @param {string} body
 * @param {boolean} sync
 * @returns {XMLHttpRequest}
 */
submitData.xhr = function xhr (url, body, sync) {
  var request = new XMLHttpRequest()

  request.open('POST', url, !sync)
  try {
    // Set cookie
    if ('withCredentials' in request) request.withCredentials = true
  } catch (e) {
    // do nothing
  }

  request.setRequestHeader('content-type', 'text/plain')
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
 * @param {string} url
 * @returns {Element}
 */
submitData.img = function img (url) {
  var element = new Image()
  element.src = url
  return element
}

/**
 * Send via sendBeacon. Do NOT call this function outside of a guaranteed web window environment.
 * @param {string} url
 * @param {string} body
 * @returns {boolean}
 */
submitData.beacon = function (url, body) {
  // Navigator has to be bound to ensure it does not error in some browsers
  // https://xgwang.me/posts/you-may-not-know-beacon/#it-may-throw-error%2C-be-sure-to-catch
  const send = window.navigator.sendBeacon.bind(navigator)
  return send(url, body)
}
