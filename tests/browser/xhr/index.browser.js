/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../../tools/jil/browser-test'
import jil from 'jil'
import { setup } from '../utils/setup'
import { getLoaderConfig } from '../../../src/common/config/config'
import { registerHandler } from '../../../src/common/event-emitter/register-handler'
import { drain } from '../../../src/common/drain/drain'
import { Instrument as AjaxInstrum } from '../../../src/features/ajax/instrument/index'
//import { Aggregate as AjaxAggreg } from '../../../src/features/ajax/aggregate/index'
import { Instrument as JsErrInstrum } from '../../../src/features/jserrors/instrument/index'
import { Aggregate as JsErrAggreg } from '../../../src/features/jserrors/aggregate/index'

const { baseEE, agentIdentifier, aggregator, nr } = setup()
const ajaxTestInstr = new AjaxInstrum(agentIdentifier, aggregator, false)
const jserrTestInstr = new JsErrInstrum(agentIdentifier, aggregator, false)
const jserrTestAgg = new JsErrAggreg(agentIdentifier, aggregator)

import ffVersion from '../../../src/common/browser-version/firefox-version'
const hasXhr = window.XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.addEventListener

let onloadtime = 2
let loadeventtime = 2
let proto = location.protocol
let assetServerHTTPPort = nr.info.assetServerPort
let assetServerSSLPort = nr.info.assetServerSSLPort
let assetServerPort = proto === 'http:' ? assetServerHTTPPort : assetServerSSLPort
let corsServerPort = nr.info.corsServerPort

let assetServerHostname = window.location.host.split(':')[0]

let oldFF = false
if (ffVersion && ffVersion < 19) {
  oldFF = true
  onloadtime = 0
}

test('xhr timing', function (t) {
  if (!hasXhr) {
    t.skip('skipping because browser does not have xhr')
    t.end()
    return
  }

  if (oldFF) test.log("Can't instrument 'xhr.onload' handlers because they become not functions when assigned in FF " + ffVersion)

  baseEE.emit('feat-err', [])
  /*
  if (!window.NREUM) NREUM = {}
  if (!NREUM.loader_config) NREUM.loader_config = {}
  */
  // Set cross process id to 123#456
  getLoaderConfig(agentIdentifier).xpid = 'CAEEGwAADw=='

  let plan = 0

  for (let url in urls) {
    let testCase = urls[url]

    // Call gate function to determine if we should run this test
    try {
      if ('gate' in testCase && !testCase.gate()) continue
    } catch (e) {
      continue
    }

    if (typeof testCase.plan !== 'number') {
      t.fail('test case for ' + url + ' did not specify a plan')
    }

    plan += testCase.plan

    let fullURL = (testCase.host || '') + url + (testCase.qs || '')
    let payload = (typeof testCase.payload === 'function') ? testCase.payload() : testCase.payload
    let xhr = testCase.xhr = new XMLHttpRequest()
    xhr.open(testCase.method || 'GET', fullURL)
    fire('afterOpen', testCase, [t])
    xhr.send(payload)
    fire('afterSend', testCase, [t])
  }

  t.plan(plan)

  registerHandler('xhr', async function (params, metrics, start) {
    const { Aggregate: AjaxAggreg } = await import('../../../src/features/ajax/aggregate/index')
    const ajaxTestAgg = new AjaxAggreg(agentIdentifier, aggregator)
    ajaxTestAgg.storeXhr(params, metrics, start)

    if ('pathname' in params) fire('check', urls[params.pathname], [params, metrics, t])
    else if (params.method === 'GET') fire('check', urls['/'], [params, metrics, t])
    else if (params.method === 'PUT') fire('check', urls['/timeout'], [params, metrics, t])
    else if (params.method === 'POST') fire('check', urls['/asdf'], [params, metrics, t])
  }, undefined, baseEE)

  drain(agentIdentifier, 'feature')

  function fire (fn, obj, args) {
    if (obj && obj[fn]) return obj[fn].apply(obj, args)
  }
})

var urls = {
  '/xhr_with_cat/1': {
    check: function (params, metrics, t) {
      var host = params.host.split(':')
      var hostname = host[0]
      var port = host[1]
      t.equal(params.status, 200, 'correct status for /xhr_with_cat')
      t.equal(params.method, 'GET', 'correct method for /xhr_with_cat')
      t.ok(hostname.length, 'host has a hostname')
      t.equal(+port, assetServerPort, 'host correct port number')
      t.ok(typeof params.cat === 'string', 'has CAT data for /xhr_with_cat')
      t.ok(metrics.rxSize > 100, 'Has some size for /xhr_with_cat')
      t.ok(metrics.duration > 1, 'Took some time for /xhr_with_cat')
      t.equal(metrics.txSize, undefined, 'No txSize for get')
      if (oldFF) {
        t.skip('old firefox has inconsistent timing')
      } else {
        t.ok(metrics.cbTime >= onloadtime + loadeventtime, 'Callbacks Took some time for /xhr_with_cat, one load and onload : ' + metrics.cbTime)
      }
      t.skip(params.pathname, 'does not have pathname when CAT data present for /xhr_with_cat')
    },
    afterOpen: function () {
      this.xhr.onload = wait
      this.xhr.addEventListener('load', wait, false)
    },
    plan: 10
  },
  '/abort': {
    check: function (params, metrics, t) {
      t.fail('aborted XHR reported')
    },
    afterSend: function () { this.xhr.abort() },
    plan: 0
  },
  '/timeout': {
    check: function (params, metrics, t) {
      if (metrics.duration >= 300) t.skip('status code for timeout request is 0 (browser does not support timeouts)')
      else t.equal(params.status, 0, 'Status code for timeout request is 0')
      t.equal(metrics.txSize, undefined, 'No txSize for empty put')
    },
    method: 'PUT',
    payload: '',
    afterOpen: function () { this.xhr.timeout = 10 },
    plan: 2
  },
  '/echo': {
    check: function (params, metrics, t) {
      t.equal(metrics.txSize, 10, 'Get txSize on posts with a body')
      if (oldFF) {
        t.skip('old firefox has inconsistent timing')
      } else {
        t.ok(metrics.cbTime >= onloadtime, 'Callbacks Took some time for /echo, onload : ' + metrics.cbTime)
      }
    },
    method: 'POST',
    payload: 'foobarasdf',
    afterOpen: function () {
      this.xhr.onload = wait
    },
    plan: 2
  },
  '/xhr_no_cat': {
    check: function (params, metrics, t) {
      t.equal(params.status, 200, 'correct status for /xhr_no_cat')
      t.equal(params.method, 'GET', 'correct method for /xhr_no_cat')
      t.equal(params.pathname, '/xhr_no_cat', 'correct pathname for /xhr_no_cat')
      t.ok(metrics.rxSize > 5, 'Has some size for /xhr_no_cat')
      t.ok(metrics.duration > 1, 'Took some time for /xhr_no_cat')
      t.notok(params.cat, 'does not have CAT data for /xhr_no_cat')
      if (oldFF) {
        t.skip('old firefox has inconsistent timing')
      } else {
        t.ok(metrics.cbTime >= 4 && metrics.cbTime < 2000, 'Callbacks Took some time for /xhr_no_cat, two load handlers: ' + metrics.cbTime)
      }
    },
    afterOpen: function () {
      this.xhr.addEventListener('load', waitTwice, false)
      this.xhr.addEventListener('load', function () { waitTwice() }, false)

      // This should not fire because it has the same arguments as an addEventListener call above. If it is
      // called, then it will cause the cbTime to be too great. However, if our load event counting is wrong,
      // then the test will wait for three load callbacks when only two will actually fire.
      this.xhr.addEventListener('load', waitTwice, false)

      var waitFor = [3, 3, 2000]
      var waitForIndex = 0

      function waitTwice () {
        wait(waitFor[waitForIndex++])
      }
    },
    plan: 7
  },
  '/xhr_with_cat/2': {
    gate: function () {
      tryCrossDomainRequest()
      return true
    },
    check: function (params, metrics, t) {
      t.equal(params.status, 200, 'status for /xhr_with_cat/2 was ' + params.status)
      t.equal(params.pathname, '/xhr_with_cat/2', 'got pathname for cross-origin XHR request')
      t.notok(params.cat, 'does not process CAT data for cross-origin XHR request')
      if (oldFF) {
        t.skip('old firefox has inconsistent timing')
      } else {
        t.equal(typeof metrics.cbTime, 'number', 'cbTime reported even w/o long running CBs')
      }
      t.equal(params.host, assetServerHostname + ':' + corsServerPort, 'host has hostname and port')
    },
    host: proto + '//' + assetServerHostname + ':' + corsServerPort,
    plan: 5
  },
  // Test makes sure we don't swallow the only XHR event that gets fired in
  // webkit when we hit an endpoint on a different origin that doesn't return
  // CORS headers.
  '/foo?cors=false': {
    gate: function () {
      tryCrossDomainRequest()
      return true
    },
    check: function (params, metrics) {},
    host: proto + '//' + assetServerHostname + ':' + corsServerPort,
    plan: 1,
    afterOpen: function (t) {
      var xhr = this.xhr
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          t.pass('onreadystatechange fired on non-cors cross origin call')
        }
      }
    }
  },
  '/postwithhi/arraybufferxhr': {
    gate: function () {
      void new Int8Array([104, 105, 33])
      return ((new XMLHttpRequest()).responseType === '')
    },
    method: 'POST',
    afterOpen: function (t) {
      this.xhr.responseType = 'arraybuffer'
      this.xhr.setRequestHeader('Content-Type', 'text/plain')
      this.xhr.onload = function (e) {
        var buffer = new Int8Array([104, 105, 33]) // 'hi!'

        var xhr = e.target
        t.deepEqual(new Int8Array(xhr.response), buffer, 'arraybuffer content matches')
      }
    },
    payload: function () { return (new Int8Array([104, 105, 33])).buffer }, // 'hi!'
    check: function (params, metrics, t) {
      t.equal(metrics.txSize, 3, 'correct size for sent arraybuffer objects')
      t.equal(metrics.rxSize, 3, 'correct size for received arraybuffer objects')
    },
    plan: 3
  },
  '/json': {
    gate: function () {
      var xhr = new XMLHttpRequest()
      if (xhr.responseType !== '') return false
      xhr.responseType = 'json'
      return (xhr.responseType === 'json')
    },
    afterOpen: function (t) {
      let xhr = this.xhr
      xhr.responseType = 'json'
      xhr.onload = function (e) {
        t.deepEqual(e.target.response, { text: 'hi!' }, 'JSON content matches')

        let brokenFF = ffVersion && ffVersion > 33

        if (!brokenFF) {
          let descriptor = getResponsePropertyDescriptor(xhr)
          if (descriptor && descriptor.configurable) {
            Object.defineProperty(xhr, 'response', {
              get: function () {
                t.fail('should not touch the response property')
              }
            })
          }
        }
      }

      function getResponsePropertyDescriptor (xhr) {
        let obj = xhr
        while (obj && !obj.hasOwnProperty('response')) {
          obj = Object.getPrototypeOf(obj)
        }
        return obj && Object.getOwnPropertyDescriptor(obj, 'response')
      }
    },
    check: function (params, metrics, t) {
      t.equal(metrics.rxSize, '{"text":"hi!"}'.length, 'correct size for received JSON objects')
    },
    plan: 2
  },
  '/formdata': {
    gate: function () {
      return !!(new FormData())
    },
    method: 'POST',
    payload: function () {
      var data = new FormData()
      data.append('name', 'bob')
      data.append('x', 5)
      return data
    },
    afterOpen: function (t) {
      this.xhr.onload = function (e) {
        t.equal(e.target.responseText, 'good', 'correct FormData content sent')
      }
    },
    check: function (params, metrics, t) {
      t.notok(metrics.txSize, 'no size for sent FormData objects')
    },
    plan: 2
  },
  'data-uri': {
    host: 'data:,',
    gate: function () {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', 'data:,data-uri')
      xhr.send()
      return !jil.isEdge()
    },
    method: 'GET',
    afterOpen: function (t) {
      var xhr = this.xhr
      xhr.onload = function () {
        t.equal(xhr.responseText, 'data-uri', 'should get right data')
      }
    },
    plan: 1
  },
  '/gzipped': {
    plan: 1,
    check: function (params, metrics, t) {
      t.equal(metrics.rxSize, 10000, 'rxSize should be the uncompressed resource size')
    }
  },
  '/chunked': {
    plan: 2,
    check: function (params, metrics, t) {
      t.equal(metrics.rxSize, 10000, 'rxSize should be full resource size')
    },
    afterOpen: function (t) {
      let xhr = this.xhr
      xhr.addEventListener('load', function () {
        let transferEncoding = xhr.getResponseHeader('transfer-encoding')
        if (transferEncoding) transferEncoding = transferEncoding.toLowerCase()
        t.notok(xhr.getResponseHeader('content-length'), 'content-length header should not be present')
      }, false)
    }
  }
}

// IE 9 throws when opening cross domain request, so this can be used in a
// gating function to skip tests that rely on cross-domain XHRs in IE 9.
function tryCrossDomainRequest () {
  let url = proto + '//' + assetServerHostname + ':' + corsServerPort
  let xhr = new XMLHttpRequest()
  xhr.open('GET', url)
}

function wait (delay) {
  if (typeof delay !== 'number') delay = 3

  var start = new Date().getTime()
  while (new Date().getTime() < start + delay) continue
}
