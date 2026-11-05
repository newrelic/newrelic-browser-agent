/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Script tracking (the DOM + resource-timing bookkeeping behind register() timings) is opt-in with the register API: it
 * starts at agent init when the API is enabled, never otherwise, and watches only direct children of html/head/body.
 * See src/common/v2/script-tracker.js.
 */
describe('Register API - script tracking only runs when the register API is enabled', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  /* Script tracking observes only the direct children of these nodes (childList, no subtree). Nothing else the agent does uses that shape. */
  const getTrackerObserveCalls = () => browser.execute(function () {
    return window.__observeCalls.filter(call => call.childList && !call.subtree && ['HTML', 'HEAD', 'BODY'].includes(call.nodeName))
  })

  it('does not start script tracking when the register API is not enabled', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-observer-spy.html'))
      .then(() => browser.waitForAgentLoad())

    // even an attempted (blocked) registration must not turn tracking on
    await browser.execute(function () {
      newrelic.register({ id: 'blocked-mfe', name: 'blocked-mfe' })
    })

    expect(await getTrackerObserveCalls()).toEqual([])
  })

  it('starts script tracking at init when the register API is enabled, before any registration', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-observer-spy.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    const calls = await getTrackerObserveCalls()
    expect(calls.map(call => call.nodeName)).toEqual(expect.arrayContaining(['HTML', 'HEAD', 'BODY']))
  })

  it('does not start script tracking for a blocked registration when the register API is enabled', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented-with-observer-spy.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    const before = (await getTrackerObserveCalls()).length
    await browser.execute(function () {
      newrelic.register({ id: '', name: '' }) // invalid id/name -> blocked
    })

    // already running from init; a blocked call must not add anything
    expect((await getTrackerObserveCalls()).length).toBe(before)
  })

  it('still correlates the calling script when it was injected into a container that is not observed', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    // Inserted inside a nested container, which the head/body direct-child observer does not watch -- no mutation
    // record is ever delivered for it, so only the register-time scan can find it.
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
