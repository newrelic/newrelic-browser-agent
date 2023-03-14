/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const url = require('url')
const canonicalFunctionName = require('../../lib/canonical-function-name')
const stringHashCode = require('../../lib/string-hash-code')

function computeExpectedCanonicalStack (expectedStack) {
  let canonicalStack = expectedStack.map((frame) => {
    let line = ''
    if (frame.f) line += `${canonicalFunctionName(frame.f)}@`
    if (frame.u) line += frame.u
    if (frame.l) line += `:${frame.l}`
    return line
  }).join('\n')

  return canonicalStack
}

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

    // Test that instrumentation is filtered out from stack traces
    let expectedStack = expectedError.stack
    let actualStack = actualError.params.stack_trace

    if (actualStack && actualStack.match(/nrWrapper/)) {
      t.fail('instrumentation not filtered out of ' + actualStack)
    }

    // Evaluated code in Firefox is indistinguishable from anonymous function calls. Due to how we test
    // errors, it's not easy to ensure the stack frame line number is correct. Skip this test, disaggregation
    // when people are using eval is not a big concern.
    if (expectedStack[0].f === 'evaluated code' && browser.match('firefox')) {
      return t.skip('Skipping eval code check for browsers with indistinguishable stacks')
    }

    var expectedCanonicalStack = computeExpectedCanonicalStack(expectedStack)
    var expectedStackHash = stringHashCode(expectedCanonicalStack)

    t.ok(!!actualError.params.stackHash, 'Stack hash exists')

    if (actualError.params.stackHash !== expectedStackHash && actualError.params.canonicalStack) {
      t.comment('Actual stack from browser:\n' + actualError.params.origStack)
      t.comment('\nActual canonical stack from browser:\n' + actualError.params.canonicalStack)
      t.comment('\nExpected canonical stack:\n' + expectedCanonicalStack + '\n')
      t.comment(actualError.params.origStackInfo)
    }

    t.equal(actualError.params['request_uri'], expectedPath, 'has correct request_uri attribute')
  }
}

function getErrorsFromResponse (response, browser) {
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

function getAppIdFromResponse (response) {
  return response.query ? response.query.a : null
}

function getMetricsFromResponse (response, isSupportability) {
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

function fail (t) {
  return (err) => {
    t.error(err)
    t.end()
  }
}

module.exports = { fail, assertErrorAttributes, verifyStackTraceOmits, assertExpectedErrors, getErrorsFromResponse, getMetricsFromResponse, getAppIdFromResponse }
