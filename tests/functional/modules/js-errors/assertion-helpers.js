/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const url = require('url')

function assertErrorAttributes (t, query) {
  t.equal(query.pve, '1', 'pageViewErr reported')
}

function verifyStackTraceOmits (t, actualErrors, query) {
  t.equal(actualErrors.length, 1, 'Expected exactly one error')

  let stackTrace = actualErrors[0].params.stack_trace
  t.equal(stackTrace.indexOf(query), -1, 'stack trace should not include URL query string or fragment')
}

function assertExpectedErrors (t, browser, actualErrors, expectedErrors, assetURL) {
  let expectedPath = url.parse(assetURL).pathname

  t.equal(actualErrors.length, expectedErrors.length, `exactly ${expectedErrors.length} errors`)

  for (let expectedError of expectedErrors) {
    let matchingErrors = actualErrors.filter((e) => {
      return e.params.message.search(expectedError.message) !== -1
    })
    let actualError = matchingErrors[0]

    t.ok(actualError, 'found expected error')
    // This is a bit hacky here, where we check if the message is
    // 'uncaught error' before testing the class name
    if (expectedError.message === 'uncaught error') {
      var errorClass = actualError.params.exceptionClass
      if (browser.hasFeature('uncaughtErrorObject')) {
        t.equal(errorClass, 'Error', 'Uncaught error is of Error class')
      } else {
        t.equal(errorClass, 'UncaughtException', 'Uncaught error class is UncaughtException')
      }
    }
    
    t.equal(actualError.params['request_uri'], expectedPath, 'has correct request_uri attribute')
  }
}

function getErrorsFromResponse(response, browser) {
  if (response.body) {
    try {
      var parsedBody = JSON.parse(response.body)
      if (parsedBody.err) {
        return parsedBody.err
      }
    } catch (e) {}
  }
  if (response.query && response.query.err) {
    try {
      var parsedQueryParam = JSON.parse(response.query.err)
      return parsedQueryParam
    } catch (e) {}
  }
  return null
}

function getAppIdFromResponse(response) {
  return response.query ? response.query.a : null
}

function getMetricsFromResponse(response, isSupportability) {
  var attr = isSupportability ? 'sm' : 'cm'
  if (response.body) {
    try {
      var parsedBody = JSON.parse(response.body)
      if (parsedBody[attr]) {
        return parsedBody[attr]
      }
    } catch (e) {}
  }
  if (response.query && response.query[attr]) {
    try {
      var parsedQueryParam = JSON.parse(response.query[attr])
      return parsedQueryParam
    } catch (e) {}
  }
  return null
}

module.exports = {assertErrorAttributes, verifyStackTraceOmits, assertExpectedErrors, getErrorsFromResponse, getMetricsFromResponse, getAppIdFromResponse}
