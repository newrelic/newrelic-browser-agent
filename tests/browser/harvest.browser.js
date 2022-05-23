/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../tools/jil/browser-test.js')
var submitData = require('../../agent/submit-data')
var harvest = require('../../agent/harvest')
var sinon = require('sinon')
var loader = require('loader')
var encode = require('../../agent/encode')
var stringify = require('../../agent/stringify')
var ieVersion = require('../../agent/ie-version')
var locationUtil = require('../../agent/location')
var config = require('../../loader/config')

var scheme = (config.getConfiguration('ssl') === false) ? 'http' : 'https'
var nrFeatures = { err: true, xhr: true }
var nrInfo = { errorBeacon: 'foo', licenseKey: 'bar' }
var nrOrigin = scheme + '://foo.com?bar=crunchy#bacon'
var fakeNr = { features: nrFeatures, info: nrInfo, origin: nrOrigin, offset: loader.offset, now: loader.now }

var hasSendBeacon = !!navigator.sendBeacon
var xhrUsable = loader.xhrWrappable && (ieVersion > 9 || ieVersion === 0)

function once (cb) {
  var done = false
  return function () {
    if (done) return {}
    done = true
    return cb()
  }
}

function createMockedXhr(responseCode) {
  var loadListeners = []
  return {
    status: parseInt(responseCode),
    addEventListener: function(event, fn) {
      loadListeners.push(fn)
    },
    send: function() {
      var xhr = this
      setTimeout(function() {
        loadListeners.forEach(function(fn) {
          fn.call(xhr)
        })
      }, 0)
    }
  }
}

function resetSpies (origin, options) {
  harvest.resetListeners()
  options = options || {}
  submitData.img = sinon.stub().returns(true)
  submitData.beacon = sinon.stub().returns(true)

  if (submitData.xhr.isSinonProxy) {
    submitData.xhr.restore()
  }
  sinon.stub(submitData, 'xhr', function() {
    var mockedXhr = createMockedXhr(options.xhrResponseCode)
    if (options.xhrWithLoadEvent) {
      mockedXhr.send()
    }
    return mockedXhr
  })

  origin = origin || scheme + '://foo.com?bar=crunchy#bacon'
  locationUtil.getLocation = sinon.stub().returns(origin)
}

function dummyPayload (key) {
  return function () {
    var body = {}
    body[key] = ['one', 'two', 'three']
    return {
      qs: { q1: 'v1', q2: 'v2' },
      body: body
    }
  }
}

function validateUrl (t, actualUrl, expectedUrlTemplate, message) {
  // Extract the timestamp from the actual URL
  // Can't use url.parse because this test has to run in old IE, which chokes
  // when trying to use the browserified version of url.parse.
  // Also get the ck parameter value from the actual URL
  let queryString = actualUrl.split('?')[1]
  let pairs = queryString.split('&')
  let submissionTimestamp
  let ckValue = '1'
  for (var i = 0; i < pairs.length; i++) {
    let pair = pairs[i].split('=')
    if (pair[0] === 'rst') {
      submissionTimestamp = pair[1]
    } else if (pair[0] === 'ck') {
      ckValue = pair[1]
    }
  }

  // In addition to replacing timestamp, add in the ck parameter which goes after timestamp
  let expectedUrl = expectedUrlTemplate.replace('{TIMESTAMP}', submissionTimestamp + '&ck=' + ckValue)

  t.equal(actualUrl, expectedUrl, message)
}

test('returns false if nothing is sent', function (t) {
  resetSpies()
  let result = harvest.sendX('ins', fakeNr)
  t.notOk(result, 'sendX returns a falsy value when nothing was sent')
  t.end()
})

test('encodes only the origin of the referrer url, not the fragment ', function (t) {
  resetSpies()
  harvest.on('ins', once(dummyPayload('ins')))
  let result = harvest.sendX('ins', fakeNr)
  let baseUrl = scheme + '://foo/ins/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'

  if (xhrUsable) {
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to sendBeacon')
  } else {
    t.notOk(result, 'result falsy when attempting to submit ins in unsupported browser')
  }

  t.end()
})

test('encodes referrer urls that include spaces', function (t) {
  let testOriginWithSpace = scheme + '://foo.com%20crunchy%20bacon'
  resetSpies(testOriginWithSpace)

  harvest.on('ins', once(dummyPayload('ins')))
  let testNr = { features: nrFeatures, info: nrInfo, origin: testOriginWithSpace, offset: loader.offset, now: loader.now }
  let result = harvest.sendX('ins', testNr)
  let baseUrl = scheme + '://foo/ins/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com%2520crunchy%2520bacon&q1=v1&q2=v2'

  if (xhrUsable) {
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to sendBeacon')
  } else {
    t.notOk(result, 'result falsy when attempting to submit ins in unsupported browser')
  }

  t.end()
})

test('encodes referrer urls that include ampersands', function (t) {
  let testOriginWithSpace = scheme + '://foo.com&crunchy&bacon'
  resetSpies(testOriginWithSpace)

  harvest.on('ins', once(dummyPayload('ins')))
  let testNr = { features: nrFeatures, info: nrInfo, origin: testOriginWithSpace, offset: loader.offset, now: loader.now }
  let result = harvest.sendX('ins', testNr)
  let baseUrl = scheme + '://foo/ins/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com%26crunchy%26bacon&q1=v1&q2=v2'

  if (xhrUsable) {
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to sendBeacon')
  } else {
    t.notOk(result, 'result falsy when attempting to submit ins in unsupported browser')
  }

  t.end()
})

test('uses correct submission mechanism for ins', function (t) {
  if (xhrUsable) {
    t.plan(4)
  } else {
    t.plan(2)
  }

  resetSpies(null, { xhrWithLoadEvent: true })
  harvest.on('ins', once(dummyPayload('ins')))

  function harvestFinished() {
    t.pass('harvest finished callback has been called')
  }

  let result = harvest.sendX('ins', fakeNr, null, harvestFinished)
  let baseUrl = scheme + '://foo/ins/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
  let expectedPayload = {ins: ['one', 'two', 'three']}

  if (xhrUsable) {
    t.ok(result, 'result truthy when ins submitted via XHR')
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to sendBeacon')
    t.equal(call.args[1], stringify(expectedPayload), 'correct body given to XHR')
  } else {
    t.notOk(result, 'result falsy when attempting to submit ins in unsupported browser')
    t.equal(submitData.img.callCount, 0, 'should not try to submit ins via img tag')
  }
})

test('does not send ins call when there is no body', function (t) {
  resetSpies()
  harvest.on('ins', once(testPayload))

  let result = harvest.sendX('ins', fakeNr)

  t.notOk(result, 'result should be falsy')
  t.equal(submitData.xhr.callCount, 0, 'no xhr call should have been made')
  t.equal(submitData.img.callCount, 0, 'no call via img tag should have been made')
  t.equal(submitData.beacon.callCount, 0, 'no beacon call should have been made')
  t.end()

  function testPayload() {
    return {
      qs: { q1: 'v1', q2: 'v2' },
      body: {
        ins: []
      }
    }
  }
})

test('uses correct submission mechanism for resources', function (t) {
  if (xhrUsable) {
    t.plan(4)
  } else {
    t.plan(2)
  }

  resetSpies(null, { xhrWithLoadEvent: true })
  harvest.on('resources', once(dummyPayload('resources')))

  function harvestFinished() {
    t.pass('harvest finished callback has been called')
  }

  let result = harvest.sendX('resources', fakeNr, null, harvestFinished)

  let baseUrl = scheme + '://foo/resources/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
  let expectedPayload = {resources: ['one', 'two', 'three']}

  if (xhrUsable) {
    t.ok(result, 'result truthy when resources submitted via XHR')
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to XHR')
    t.equal(call.args[1], stringify(expectedPayload), 'correct body given to XHR')
  } else {
    t.notOk(result, 'result falsy when attempting to submit resources in unsupported browser')
    t.equal(submitData.img.callCount, 0, 'should not try to submit via img')
  }
})

test('does not send resources when there is no body', function (t) {
  resetSpies()
  harvest.on('resources', once(testPayload))

  let result = harvest.sendX('resources', fakeNr)

  t.notOk(result, 'result should be falsy')
  t.equal(submitData.xhr.callCount, 0, 'no xhr call should have been made')
  t.equal(submitData.img.callCount, 0, 'no call via img tag should have been made')
  t.equal(submitData.beacon.callCount, 0, 'no beacon call should have been made')
  t.end()

  function testPayload() {
    return {
      qs: {st: '1234', ptid: 123},
      body: {res: []}
    }
  }
})

test('uses an XHR and returns it for first resources POST', function (t) {
  resetSpies()
  harvest.on('resources', once(dummyPayload('resources')))
  let result = harvest.sendX('resources', fakeNr, { needResponse: true })

  let baseUrl = scheme + '://foo/resources/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
  let expectedPayload = {resources: ['one', 'two', 'three']}

  if (xhrUsable) {
    t.ok(result, 'result truthy when resources submitted via XHR with needResponse')
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to XHR')
    t.equal(call.args[1], stringify(expectedPayload), 'correct body given to XHR')

    t.equal(submitData.img.callCount, 0, 'did not use img to submit first resources POST')
    t.equal(submitData.beacon.callCount, 0, 'did not use beacon to submit first resources POST')
  } else {
    t.notOk(result, 'result false when resources submitted via XHR with needResponse')
  }

  t.end()
})

test('uses correct submission mechanism for jserrors', function (t) {
  if (xhrUsable) {
    t.plan(4)
  } else {
    t.plan(3)
  }

  resetSpies(null, { xhrWithLoadEvent: true })
  harvest.on('jserrors', once(dummyPayload('jserrors')))

  function harvestFinished() {
    t.pass('harvest finished callback has been called')
  }

  let result = harvest.sendX('jserrors', fakeNr, null, harvestFinished)

  let baseUrl = scheme + '://foo/jserrors/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
  let expectedPayload = {jserrors: ['one', 'two', 'three']}

  if (xhrUsable) {
    t.ok(result, 'result truthy when jserrors submitted via xhr')
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to xhr')
    t.equal(call.args[1], JSON.stringify(expectedPayload), 'body arg given to xhr is correct')
  } else {
    t.ok(result, 'result truthy when jserrors submitted via img')
    let call = submitData.img.getCall(0)
    let expectedUrl = baseUrl + encode.obj(expectedPayload)
    validateUrl(t, call.args[0], expectedUrl, 'correct URL given to img')
    t.notOk(call.args[1], 'no body arg given to img')
  }
})

test('adds ptid to harvest when ptid is present', function (t) {
  if (xhrUsable) {
    t.plan(2)
  } else {
    t.plan(2)
  }

  resetSpies(null, { xhrWithLoadEvent: true })
  harvest.on('jserrors', once(dummyPayload('jserrors')))

  // simulate ptid present (session trace in progress) after initial session trace (/resources) call
  fakeNr.ptid = '54321'

  let result = harvest.sendX('jserrors', fakeNr, null, function () {})

  let baseUrl = scheme + '://foo/jserrors/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&ptid=54321&q1=v1&q2=v2'
  let expectedPayload = {jserrors: ['one', 'two', 'three']}

  if (xhrUsable) {
    t.ok(result, 'result truthy when jserrors submitted via xhr')
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to xhr')
  } else {
    t.ok(result, 'result truthy when jserrors submitted via img')
    let call = submitData.img.getCall(0)
    let expectedUrl = baseUrl + encode.obj(expectedPayload)
    validateUrl(t, call.args[0], expectedUrl, 'correct URL given to img')
  }

  delete fakeNr.ptid
})

test('does not add ptid to harvest when ptid is not present', function (t) {
  if (xhrUsable) {
    t.plan(2)
  } else {
    t.plan(2)
  }

  resetSpies(null, { xhrWithLoadEvent: true })
  harvest.on('jserrors', once(dummyPayload('jserrors')))

  // simulate session trace not started on page
  fakeNr.ptid = null

  let result = harvest.sendX('jserrors', fakeNr, null, function () {})

  if (xhrUsable) {
    t.ok(result, 'result truthy when jserrors submitted via xhr')
    let call = submitData.xhr.getCall(0)
    t.ok(call.args[0].indexOf('ptid') === -1, 'ptid not included in querystring')
  } else {
    t.ok(result, 'result truthy when jserrors submitted via img')
    let call = submitData.img.getCall(0)
    t.ok(call.args[0].indexOf('ptid') === -1, 'ptid not included in querystring')
  }
})

test('does not send jserrors when there is nothing to send', function (t) {
  resetSpies()
  harvest.on('jserrors', once(testPayload))

  let result = harvest.sendX('jserrors', fakeNr)

  t.notOk(result, 'result should be falsy')
  t.equal(submitData.xhr.callCount, 0, 'no xhr call should have been made')
  t.equal(submitData.img.callCount, 0, 'no call via img tag should have been made')
  t.equal(submitData.beacon.callCount, 0, 'no beacon call should have been made')
  t.end()

  function testPayload() {
    return {
      qs: {pve: '1', ri: '1234'},
      body: null
    }
  }
})

test('uses correct submission mechanism for events', function (t) {
  if (xhrUsable) {
    t.plan(4)
  } else {
    t.plan(3)
  }

  resetSpies(null, { xhrWithLoadEvent: true })
  harvest.on('events', once(function () {
    return {
      body: {
        e: 'bel.1;1;'
      }
    }
  }))

  function harvestFinished() {
    t.pass('harvest finished callback has been called')
  }

  let result = harvest.sendX('events', fakeNr, null, harvestFinished)

  let baseUrl = scheme + '://foo/events/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com'
  let expectedPayload = {e: 'bel.1;1;'}

  if (xhrUsable) {
    t.ok(result, 'result truthy when events submitted via xhr')
    let call = submitData.xhr.getCall(0)
    validateUrl(t, call.args[0], baseUrl, 'correct URL given to xhr')
    t.equal(call.args[1], 'bel.1;1;', 'body arg given to xhr is correct')
  } else {
    t.ok(result, 'result truthy when events submitted via img')
    let call = submitData.img.getCall(0)
    let expectedUrl = baseUrl + encode.obj(expectedPayload)
    validateUrl(t, call.args[0], expectedUrl, 'correct URL given to img')
    t.notOk(call.args[1], 'no body arg given to img')
  }
})

test('does not send eents when there is nothing to send', function (t) {
  resetSpies()
  harvest.on('events', once(testPayload))

  let result = harvest.sendX('events', fakeNr)

  t.notOk(result, 'result should be falsy')
  t.equal(submitData.xhr.callCount, 0, 'no xhr call should have been made')
  t.equal(submitData.img.callCount, 0, 'no call via img tag should have been made')
  t.equal(submitData.beacon.callCount, 0, 'no beacon call should have been made')
  t.end()

  function testPayload() {
    return {
      body: null
    }
  }
})

test('uses correct submission mechanisms on unload', function (t) {
  resetSpies()

  harvest.on('ins', once(dummyPayload('ins')))
  harvest.on('resources', once(dummyPayload('resources')))
  harvest.on('jserrors', once(dummyPayload('jserrors')))
  harvest.on('events', once(function () {
    return {
      body: {
        e: 'bel.1;1;'
      }
    }
  }))

  harvest.sendFinal(fakeNr)

  t.equal(submitData.xhr.callCount, 0, 'did not send any final submissions via XHR')

  let calls
  if (hasSendBeacon) {
    calls = submitData.beacon.getCalls()
    t.equal(submitData.beacon.callCount, 4, 'sent all final submissions via sendBeacon')
  } else {
    calls = submitData.img.getCalls()
    t.equal(submitData.img.callCount, 4, 'sent all final submissions via img')
  }

  let insCall = findCallForEndpoint(calls, 'ins')
  let resourcesCall = findCallForEndpoint(calls, 'resources')
  let jserrorsCall = findCallForEndpoint(calls, 'jserrors')
  let eventsCall = findCallForEndpoint(calls, 'events')

  t.ok(insCall, 'got unload submission for ins')
  t.ok(resourcesCall, 'got unload submission for resources')
  t.ok(jserrorsCall, 'got unload submission for jserrors')
  t.ok(eventsCall, 'got unload submission for events')

  let expectedInsPayload = {ins: ['one', 'two', 'three']}
  let expectedResourcesPayload = {resources: ['one', 'two', 'three']}
  let expectedJserrorsPayload = {jserrors: ['one', 'two', 'three']}
  let expectedEventsPayload = {e: 'bel.1;1;'}

  if (hasSendBeacon) {
    validateUrl(t, insCall.args[0], baseUrlFor('ins'), 'correct URL for ins unload submission')
    t.equal(insCall.args[1], stringify(expectedInsPayload), 'correct body for ins unload submission')
    validateUrl(t, resourcesCall.args[0], baseUrlFor('resources'), 'correct URL for resources unload submission')
    t.equal(resourcesCall.args[1], stringify(expectedResourcesPayload), 'correct body for resources unload submission')
    validateUrl(t, eventsCall.args[0], baseUrlFor('events', ''), 'correct URL for events unload submission')
    t.equal(eventsCall.args[1], expectedEventsPayload.e, 'send correct body on final events submission')
    validateUrl(t, jserrorsCall.args[0], baseUrlFor('jserrors'), 'correct URL for jserrors unload submission')
    t.equal(jserrorsCall.args[1], stringify(expectedJserrorsPayload), 'correct body for jserrors unload submission')
  } else {
    validateUrl(t, insCall.args[0], baseUrlFor('ins') + encode.obj(expectedInsPayload), 'correct URL for ins unload submission')
    t.notOk(insCall.args[1], 'did not send body on final submission of ins data')
    validateUrl(t, resourcesCall.args[0], baseUrlFor('resources') + encode.obj(expectedResourcesPayload), 'correct URL for resources unload submission')
    t.notOk(resourcesCall.args[1], 'did not send body on final submission of resources data')
    validateUrl(t, eventsCall.args[0], baseUrlFor('events', encode.obj(expectedEventsPayload)), 'correct URL for events unload submission')
    t.notOk(eventsCall.args[1], 'did not send body on final events submission')
    validateUrl(t, jserrorsCall.args[0], baseUrlFor('jserrors') + encode.obj(expectedJserrorsPayload), 'correct URL for jserrors unload submission')
    t.notOk(jserrorsCall.args[1], 'did not send body on final jserrors submission')
  }

  t.end()

  function baseUrlFor (endpoint, qs) {
    return `${scheme}://foo/${endpoint}/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref=${scheme}://foo.com${qs !== undefined ? qs : '&q1=v1&q2=v2'}`
  }

  function findCallForEndpoint (calls, desiredEndpoint) {
    for (var i = 0; i < calls.length; i++) {
      let call = calls[i]
      let url = call.args[0]
      let endpoint = url.split(/\/+/)[2]
      if (endpoint === desiredEndpoint) return call
    }
  }
})

test('when sendBeacon returns false', function(t) {
  t.test('uses img for jserrors', function(t) {
    let baseUrl = scheme + '://foo/jserrors/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
    let expectedPayload = {jserrors: ['one', 'two', 'three']}

    resetSpies()
    submitData.beacon = sinon.stub().returns(false)

    harvest.on('jserrors', once(dummyPayload('jserrors')))

    harvest.sendFinal(fakeNr)

    t.equal(submitData.img.callCount, 1, 'sent one final submissions via IMG (jserrors)')
    let call = submitData.img.getCall(0)
    let expectedUrl = baseUrl + encode.obj(expectedPayload)
    validateUrl(t, call.args[0], expectedUrl, 'correct URL given to img')
    t.notOk(call.args[1], 'no body arg given to img')

    t.end()
  })

  t.test('uses img for ins', function(t) {
    let baseUrl = scheme + '://foo/ins/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
    let expectedPayload = {ins: ['one', 'two', 'three']}

    resetSpies()
    submitData.beacon = sinon.stub().returns(false)

    harvest.on('ins', once(dummyPayload('ins')))

    harvest.sendFinal(fakeNr)

    t.equal(submitData.img.callCount, 1, 'sent one final submissions via IMG (ins)')
    let call = submitData.img.getCall(0)
    let expectedUrl = baseUrl + encode.obj(expectedPayload)
    validateUrl(t, call.args[0], expectedUrl, 'correct URL given to img')
    t.notOk(call.args[1], 'no body arg given to img')

    t.end()
  })

  t.test('uses img for resources', function(t) {
    let baseUrl = scheme + '://foo/resources/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
    let expectedPayload = {resources: ['one', 'two', 'three']}

    resetSpies()
    submitData.beacon = sinon.stub().returns(false)

    harvest.on('resources', once(dummyPayload('resources')))

    harvest.sendFinal(fakeNr)

    t.equal(submitData.img.callCount, 1, 'sent one final submissions via IMG (resources)')
    let call = submitData.img.getCall(0)
    let expectedUrl = baseUrl + encode.obj(expectedPayload)
    validateUrl(t, call.args[0], expectedUrl, 'correct URL given to img')
    t.notOk(call.args[1], 'no body arg given to img')

    t.end()
  })

  t.test('uses img for events', function(t) {
    let baseUrl = scheme + '://foo/events/1/bar?a=undefined&v=%3CVERSION%3E&t=Unnamed%20Transaction&rst={TIMESTAMP}&ref='+ scheme + '://foo.com&q1=v1&q2=v2'
    let expectedPayload = {events: ['one', 'two', 'three']}

    resetSpies()
    submitData.beacon = sinon.stub().returns(false)

    harvest.on('events', once(dummyPayload('events')))

    harvest.sendFinal(fakeNr)

    t.equal(submitData.img.callCount, 1, 'sent one final submissions via IMG (events)')
    let call = submitData.img.getCall(0)
    let expectedUrl = baseUrl + encode.obj(expectedPayload)
    validateUrl(t, call.args[0], expectedUrl, 'correct URL given to img')
    t.notOk(call.args[1], 'no body arg given to img')

    t.end()
  })
})

test('response codes', function(t) {
  if (!xhrUsable) {
    t.pass('no handling for response codes for browser without CORS support')
    t.end()
    return
  }

  var cases = {
    200: {
      retry: undefined
    },
    202: {
      retry: undefined
    },
    429: {
      retry: true
    },
    408: {
      retry: true
    },
    400: {
      retry: undefined
    },
    404: {
      retry: undefined
    },
    500: {
      retry: true
    },
    503: {
      retry: true
    },
    413: {
      retry: undefined
    },
    414: {
      retry: undefined
    },
    431: {
      retry: undefined
    }
  }

  var harvestTypes = ['ins', 'events', 'jserrors', 'resources']

  harvestTypes.forEach(function(type) {
    for (var key in cases) {
      runTest(type, key, cases[key])
    }
  })

  function runTest(type, responseCode, testCase) {
    t.test('returns correct result with ' + responseCode, function(t) {
      t.plan(1)

      resetSpies(null, { xhrWithLoadEvent: true, xhrResponseCode: responseCode })
      harvest.on(type, once(dummyPayload(type)))

      harvest.sendX(type, fakeNr, null, function(result) {
        t.equal(result.retry, testCase.retry)
      })
    })
  }
})
