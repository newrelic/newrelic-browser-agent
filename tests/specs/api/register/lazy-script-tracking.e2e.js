/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Script tracking (the DOM + resource-timing bookkeeping behind register() timings) must only run once an MFE is
 * registered, and must not watch the whole document subtree. See src/common/v2/script-tracker.js.
 */
describe('Register API - lazy script tracking', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  /* Script tracking observes only the direct children of these nodes (childList, no subtree). Nothing else the agent does uses that shape. */
  const getTrackerObserveCalls = () => browser.execute(function () {
    return window.__observeCalls.filter(call => call.childList && !call.subtree && ['HTML', 'HEAD', 'BODY'].includes(call.nodeName))
  })

  const getDocumentSubtreeObserveCount = () => browser.execute(function () {
    return window.__observeCalls.filter(call => call.nodeName === '#document' && call.subtree).length
  })

  it('does not start script tracking for an agent that never registers an MFE', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-observer-spy.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    expect(await getTrackerObserveCalls()).toEqual([])
  })

  it('starts script tracking on the first registration, watching direct children only', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-observer-spy.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    const subtreeObservesBefore = await getDocumentSubtreeObserveCount()
    await browser.execute(function () {
      window.mfe = newrelic.register({ id: 'lazy-mfe', name: 'lazy-mfe' })
    })

    const calls = await getTrackerObserveCalls()
    expect(calls.map(call => call.nodeName)).toEqual(expect.arrayContaining(['HTML', 'HEAD', 'BODY']))
    // registering must not add a document-wide subtree observer
    expect(await getDocumentSubtreeObserveCount()).toBe(subtreeObservesBefore)
  })

  it('does not start script tracking for a registration that is blocked', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-observer-spy.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.register({ id: '', name: '' }) // invalid id/name -> blocked
    })

    expect(await getTrackerObserveCalls()).toEqual([])
  })

  it('still correlates the calling script when it was injected into a container that is not observed', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    // Registration is what starts tracking, so the node is inserted before tracking exists and inside a nested
    // container -- neither the observer nor a mutation record could have caught it; only the register-time scan can.
    await browser.execute(function () {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const script = document.createElement('script')
      script.src = './js/mfe/mfe-duplicate-ref.js'
      script.onload = script.onerror = () => { window.nestedScriptLoaded = true }
      container.appendChild(script)
    })
    await browser.waitUntil(() => browser.execute(() => !!window.nestedScriptLoaded), { timeout: 10000, timeoutMsg: 'script did not load' })

    const { asset, fetchStart, hasDomNode } = await browser.execute(function () {
      const api = window.registerDuplicateRef('nested-container-mfe')
      const { asset, fetchStart, correlation } = api.metadata.timings
      return { asset, fetchStart, hasDomNode: !!correlation?.dom.value }
    })

    expect(asset).toContain('mfe-duplicate-ref.js')
    expect(fetchStart).toBeGreaterThan(0)
    expect(hasDomNode).toBe(true)
  })
})
