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
    console.log('wait for trace node generation test complete')
  })

  test('session trace nodes', function (t) {
    const stnAgg = require('../../../feature/stn/aggregate')
    ee.emit('feat-stn', [])
    drain('feature')
    const payload = stnAgg._takeSTNs()
    const res = payload.body.res
    const resourceBuffer = window.performance.getEntriesByType('resource')

    // the tests wrapping this mimic the approach in the stn.browser.js test
    // the test below expects certain resources on the page and was separated to avoid future breakage
    t.test('stn resources match the values in the ResourceTiming API buffer', function (t) {
      const resources = res.filter(function (node) { return node.t === 'resource' })

      t.ok(resources.length >= 1, 'there is at least one resource node')
      t.equal(resources.length, resourceBuffer.length, 'STN captured same number of resources as ResourceTiming API')

      const identical = resources.every(resource => {
        const match = resourceBuffer.find(bufResource => {
          const startTime = bufResource.fetchStart | 0
          const endTime = bufResource.responseEnd | 0
          return startTime === resource.s && endTime === resource.e
        })

        t.ok(match, 'found a match for ' + resource.n + ' resource with source ' + resource.o)
        
        return match
      })
      
      t.ok(identical, 'STN resource nodes match the ResourceTiming API buffer')
      t.end()
    })
    let unknown = res.filter(function (n) { return n.o === 'unknown' })
    t.equal(unknown.length, 0, 'No events with unknown origin')

    t.end()
  })
}
