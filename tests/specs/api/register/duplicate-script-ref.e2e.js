/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Register API - script referenced more than once', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  async function loadScriptTwice () {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    /*
     * Uses a polled flag instead of executeAsync: iOS Safari sessions can apply a ~0ms async script timeout,
     * which made executeAsync fail immediately.
     */
    let loadCount = 0
    const addScript = async () => {
      const key = `__dupRefLoaded${++loadCount}`
      await browser.execute(function (flag) {
        const script = document.createElement('script')
        script.src = './js/mfe/mfe-duplicate-ref.js'
        script.onload = script.onerror = () => { window[flag] = true }
        document.head.appendChild(script)
      }, key)
      await browser.waitUntil(() => browser.execute(flag => !!window[flag], key), { timeout: 10000, timeoutMsg: 'script did not load' })
    }
    await addScript()
    await browser.pause(500)
    // the second reference is typically re-served from the browser cache
    const secondTagAddedAt = await browser.execute(() => Math.floor(performance.now()))
    await addScript()
    await browser.pause(500)
    return secondTagAddedAt
  }

  it('reports fetch and execution timing from the first load, not a later cached one', async () => {
    const secondTagAddedAt = await loadScriptTwice()

    const { entries, fetchStart, fetchEnd, scriptStart } = await browser.execute(function () {
      const api = window.registerDuplicateRef('duplicate-ref-mfe')
      const entries = performance.getEntriesByType('resource')
        .filter(e => e.name.includes('mfe-duplicate-ref.js'))
        .map(e => ({ start: Math.floor(e.startTime), end: Math.floor(e.responseEnd) }))
      const { fetchStart, fetchEnd, scriptStart } = api.metadata.timings
      return { entries, fetchStart, fetchEnd, scriptStart }
    })

    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(fetchStart).toBe(entries[0].start)
    expect(fetchEnd).toBe(entries[0].end)
    // scriptStart is max(dom.start, performance.end) of the first load, so it must land before the second tag was added
    expect(scriptStart).toBeLessThan(secondTagAddedAt)
  })

  it('keeps the first load\'s fetch window for a manifest asset referenced more than once', async () => {
    await loadScriptTwice()

    const { entries, fetchStart, fetchEnd } = await browser.execute(function () {
      const api = window.registerDuplicateRef('duplicate-ref-manifest-mfe', {
        manifest: { assets: [{ matcher: 'mfe-duplicate-ref.js', type: 'script' }] },
        timingMethod: 'scripts'
      })
      const entries = performance.getEntriesByType('resource')
        .filter(e => e.name.includes('mfe-duplicate-ref.js'))
        .map(e => ({ start: Math.floor(e.startTime), end: Math.floor(e.responseEnd) }))
      const { fetchStart, fetchEnd } = api.metadata.timings
      return { entries, fetchStart, fetchEnd }
    })

    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(fetchStart).toBe(entries[0].start)
    // without first-wins, the manifest widening would stretch fetchEnd out to the cached duplicate's responseEnd
    expect(fetchEnd).toBe(entries[0].end)
  })
})
