/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEViewRequest, testMFETimingRequest } from '../../../../tools/testing-server/utils/expect-tests'

const MFE_ID = 'views-mfe'

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
  let mfeViewsCapture
  let mfeTimingCapture

  /**
   * Waits for the deregistration flush (the harvest carrying MicroFrontEndTiming, which proves everything recorded before
   * deregister() has been sent), then collects every MicroFrontEndView harvested so far.
   * @returns {Promise<Array>} all MicroFrontEndView events, across harvests
   */
  async function waitForViews () {
    const timingHarvests = await mfeTimingCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    expect(timingHarvests.length).toBeGreaterThan(0)
    const viewHarvests = await mfeViewsCapture.waitForResult({ timeout: 1000 })
    return viewHarvests
      .flatMap(({ request: { body } }) => body?.ins || [])
      .filter(event => event.eventType === 'MicroFrontEndView')
  }

  const isOurs = event => event['source.id'] === MFE_ID

  beforeEach(async () => {
    ;[mfeViewsCapture, mfeTimingCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEViewRequest },
      { test: testMFETimingRequest }
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

    const views = (await waitForViews()).filter(isOurs)

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

    expect((await waitForViews()).filter(isOurs).length).toEqual(1)
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

    expect((await waitForViews()).filter(isOurs).length).toEqual(0)
  })

  it('should not record views after deregister', async () => {
    await loadPage()

    await browser.execute(function () { window.mfeApi.deregister() })
    await browser.execute(function () { window.mountView() })
    await browser.pause(1000)

    expect((await waitForViews()).filter(isOurs).length).toEqual(0)
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

    expect((await waitForViews()).filter(isOurs).length).toEqual(1)
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

    const allViews = await waitForViews()

    Object.entries(expectedCounts).forEach(([id, count]) => {
      const views = allViews.filter(e => e['source.id'] === id)
      expect(views.length).toEqual(count)
      views.forEach(view => expect(view['source.name']).toEqual(id + ' name'))
    })
    expect(allViews.length).toEqual(Object.values(expectedCounts).reduce((a, b) => a + b, 0))
  })
})
