/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEInsRequest } from '../../../../tools/testing-server/utils/expect-tests'

const MFE_ID = 'views-mfe'

/**
 * Helper to get MFE events of a given type from harvests
 * @param {Array} harvests - Insights harvests
 * @param {string} eventType - the custom event type to filter by
 * @returns {Array} Filtered events
 */
function getMFEEvents (harvests, eventType) {
  return harvests
    .flatMap(({ request: { body } }) => body?.ins || [])
    .filter(event => event.eventType === eventType && event['source.id'] === MFE_ID)
}

/**
 * Loads the page, registers the MFE, and defines a helper to mount tracked nodes in the page.
 */
async function loadPage () {
  await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register'] } }))
    .then(() => browser.waitForAgentLoad())

  await browser.execute(function (id) {
    window.mfeApi = newrelic.register({ id, name: 'Views MFE' })
    window.mountView = function (style) {
      const node = document.createElement('div')
      node.setAttribute('data-nr-mfe-id', id)
      node.style.cssText = 'width:100px;height:40px;' + (style || '')
      node.textContent = 'view'
      document.body.prepend(node)
      return node
    }
  }, MFE_ID)
}

describe('Register API - MFE Views', () => {
  let mfeInsightsCapture

  beforeEach(async () => {
    ;[mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record a MicroFrontEndView for each new visible node, including after a remount', async () => {
    await loadPage()

    // mount, unmount, then remount a brand new node: 2 views. Pauses give the IntersectionObserver time to report.
    await browser.execute(function () { window.first = window.mountView() })
    await browser.pause(500)
    await browser.execute(function () { window.first.remove() })
    await browser.pause(200)
    await browser.execute(function () { window.mountView() })
    await browser.pause(500)

    // two concurrent nodes: 2 more views
    await browser.execute(function () { window.mountView(); window.mountView() })
    await browser.pause(500)

    await browser.execute(function () { window.mfeApi.deregister() })

    const harvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const views = getMFEEvents(harvests, 'MicroFrontEndView')

    expect(views.length).toEqual(4)
    views.forEach(view => {
      expect(view['source.id']).toEqual(MFE_ID)
      expect(view['source.name']).toEqual('Views MFE')
      expect(view['source.type']).toEqual('MFE')
      expect(view['parent.type']).toEqual('BA')
      expect(view.currentUrl).toBeDefined()
    })
  })

  it('should count a node already in the DOM when register() is called', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register'] } }))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function (id) {
      const node = document.createElement('div')
      node.setAttribute('data-nr-mfe-id', id)
      node.style.cssText = 'width:100px;height:40px;'
      node.textContent = 'pre-existing'
      document.body.prepend(node)
      window.mfeApi = newrelic.register({ id, name: 'Views MFE' })
    }, MFE_ID)
    await browser.pause(500)
    await browser.execute(function () { window.mfeApi.deregister() })

    const harvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    expect(getMFEEvents(harvests, 'MicroFrontEndView').length).toEqual(1)
  })

  it('should not record a view for nodes that are never visible', async () => {
    await loadPage()

    await browser.execute(function () {
      window.mountView('display:none;') // CSS-hidden
      window.mountView('position:absolute;top:99999px;') // far outside the viewport
      window.mountView('width:0;height:0;') // empty box
      window.mountView('visibility:hidden;') // takes up space but is not visible
    })
    await browser.pause(1000)
    await browser.execute(function () { window.mfeApi.deregister() })

    const harvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    expect(getMFEEvents(harvests, 'MicroFrontEndTiming').length).toEqual(1) // proves the harvest happened
    expect(getMFEEvents(harvests, 'MicroFrontEndView').length).toEqual(0)
  })

  it('should not record views after deregister', async () => {
    await loadPage()

    await browser.execute(function () { window.mfeApi.deregister() })
    await browser.execute(function () { window.mountView() })
    await browser.pause(1000)

    const harvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    expect(getMFEEvents(harvests, 'MicroFrontEndView').length).toEqual(0)
  })

  it('should hand an unseen node to another instance sharing the id when the claiming instance deregisters', async () => {
    await loadPage()

    await browser.execute(function (id) {
      // a second independent registration sharing the id; the first registration claims inserted nodes
      window.mfeApi2 = newrelic.register({ id, name: 'Views MFE' })
      window.hidden = window.mountView('display:none;') // claimed by the first instance, not visible yet
    }, MFE_ID)
    await browser.pause(300)

    await browser.execute(function () {
      window.mfeApi.deregister() // the claiming instance goes away before the node was ever visible
      window.hidden.style.display = 'block'
    })
    await browser.pause(1000)
    await browser.execute(function () { window.mfeApi2.deregister() })

    const harvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    expect(getMFEEvents(harvests, 'MicroFrontEndView').length).toEqual(1)
  })

  it('should attribute views to the correct MFE when 4 MFEs render in the same viewport', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register'] } }))
      .then(() => browser.waitForAgentLoad())

    // each MFE mounts a different number of nodes, so any cross-attribution or double-counting shows up as a wrong tally
    const expectedCounts = { 'multi-a': 1, 'multi-b': 2, 'multi-c': 3, 'multi-d': 1 }
    await browser.execute(function (counts) {
      window.apis = Object.keys(counts).map(id => newrelic.register({ id, name: id + ' name' }))
      const mount = (id, parent) => {
        const node = document.createElement('div')
        node.setAttribute('data-nr-mfe-id', id)
        node.style.cssText = 'width:100px;height:40px;'
        node.textContent = id
        parent.appendChild(node)
        return node
      }
      const host = document.createElement('div')
      document.body.prepend(host)
      Object.entries(counts).forEach(([id, count]) => {
        for (let i = 0; i < count; i++) mount(id, host)
      })
      // multi-d is nested inside a multi-a node: the child must not be counted for the parent, or vice versa
      mount('multi-d', host.querySelector('[data-nr-mfe-id="multi-a"]'))
    }, expectedCounts)
    expectedCounts['multi-d']++
    await browser.pause(1000)

    await browser.execute(function () { window.apis.forEach(api => api.deregister()) })
    await browser.pause(2000)

    const harvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const allViews = harvests.flatMap(({ request: { body } }) => body?.ins || []).filter(e => e.eventType === 'MicroFrontEndView')

    Object.entries(expectedCounts).forEach(([id, count]) => {
      const views = allViews.filter(e => e['source.id'] === id)
      expect(views.length).toEqual(count)
      views.forEach(view => expect(view['source.name']).toEqual(id + ' name'))
    })
    expect(allViews.length).toEqual(Object.values(expectedCounts).reduce((a, b) => a + b, 0))
  })
})
