/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

let test = require('../../../tools/jil/browser-test.js')
let drain = require('../../../agent/drain')

require('../../../feature/stn/instrument')
require('../../../feature/xhr/instrument')
require('../../../feature/xhr/aggregate')
require('../../../feature/err/instrument')
require('../../../feature/err/aggregate')

drain('api')

let originalPath = window.location.pathname

if ((window.performance &&
  window.performance.timing &&
  window.performance.getEntriesByType)) {
  runTests()
} else {
  test('unsupported browser', function (t) {
    t.skip('skipping tests because browser does not have perf timing api')
    t.end()
  })
}

// create session trace nodes for load events
document.addEventListener('DOMContentLoaded', () => null)
window.addEventListener('load', () => null)

function runTests () {
  let ee = require('ee')

  test('wait for trace node generation', function (t) {
    ee.emit('feat-err', [])
    t.plan(4)
    window.history.pushState(null, '', '#foo')
    window.history.pushState(null, '', '#bar')
    setTimeout(() => t.ok(true), 0)
    let interval = setInterval(() => {
      clearInterval(interval)
      t.ok(true)
    }, 0)
    window.requestAnimationFrame(() => {
      t.ok(true)
      throw new Error('raf error')
    })
    let xhr = new XMLHttpRequest()
    xhr.open('GET', window.location)
    xhr.send()
    xhr.addEventListener('load', () => t.ok(true))
  })

  test('session trace nodes', function (t) {
    let stnAgg = require('../../../feature/stn/aggregate')

    ee.emit('feat-stn', [])
    drain('feature')
    let payload = stnAgg._takeSTNs()
    let res = payload.body.res
    let qs = payload.qs

    t.ok(+qs.st > 1404952055986 && Date.now() > +qs.st, 'Start time is between recent time and now ' + qs.st)
    t.equal(qs.ptid, '', 'no ptid generated ' + qs.ptid)

    t.test('stn DOMContentLoaded', function (t) {
      let node = res.filter(function (node) { return node.n === 'DOMContentLoaded' })[0]
      t.ok(node, 'DOMContentLoaded node created')
      t.ok(node.s > 10, 'DOMContentLoaded node has start time ' + node.s)
      t.equal(node.o, 'document', 'DOMContentLoaded node origin ' + node.o)
      t.end()
    })
    t.test('stn window load', function (t) {
      let node = res.filter(function (node) { return node.n === 'load' })[0]
      t.ok(node, 'load node created')
      t.ok(node.s > 10, 'load node has start time ' + node.s)
      t.equal(node.o, 'window', 'load node origin ' + node.o)
      t.end()
    })
    t.test('stn timer', function (t) {
      let node = res.filter(function (node) { return node.n === 'setInterval' })[0]
      t.ok(node, 'timer node created')
      t.ok(node.s > 10, 'timer node has start time ' + node.s)
      t.equal(node.o, 'window', 'setInterval origin ' + node.o)
      t.end()
    })
    t.test('stn-raf', function (t) {
      let node = res.filter(function (node) { return node.n === 'requestAnimationFrame' })[0]
      t.ok(node, 'raf node created')
      t.ok(node.s > 10, 'raf node has start time ' + node.s)
      t.equal(node.o, 'window', 'requestAnimationFrame origin ' + node.o)
      t.end()
    })
    t.test('stn error', function (t) {
      let errorNode = res.filter(function (node) { return node.o === 'raf error' })[0]
      t.ok(errorNode, 'error node created')
      t.ok(errorNode.s > 10, 'error node has start time ' + errorNode.s)
      t.equal(errorNode.s, errorNode.e, 'error node has no duration')
      t.end()
    })
    t.test('stn ajax', function (t) {
      let ajax = res.filter(function (node) { return node.t === 'ajax' })[0]
      t.ok(ajax, 'ajax node created')
      t.ok((ajax.e - ajax.s) > 1, 'Ajax has some duration')
      t.equal(ajax.n, 'Ajax', 'Ajax name')
      t.equal(ajax.t, 'ajax', 'Ajax type')
      t.end()
    })
    t.test('stn history', function (t) {
      let hist = res.filter(function (node) { return node.n === 'history.pushState' })[1]
      t.ok(hist, 'hist node created')
      t.equal(hist.s, hist.e, 'hist node has no duration')
      t.equal(hist.n, 'history.pushState', 'hist name')
      t.equal(hist.o, `${originalPath}#bar`, 'new path')
      t.equal(hist.t, `${originalPath}#foo`, 'old path')
      t.end()
    })
    let unknown = res.filter(function (n) { return n.o === 'unknown' })
    t.equal(unknown.length, 0, 'No events with unknown origin')

    t.end()
  })
}
