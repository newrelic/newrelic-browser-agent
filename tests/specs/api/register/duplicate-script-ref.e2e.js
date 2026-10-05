/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Register API - script referenced more than once', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('reports fetch and execution timing from the first load, not a later cached one', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    const addScript = () => browser.executeAsync(function (done) {
      const script = document.createElement('script')
      script.src = './js/mfe/mfe-duplicate-ref.js'
      script.onload = script.onerror = () => done()
      document.head.appendChild(script)
    })
    await addScript()
    await browser.pause(500)
    // the second reference is typically re-served from the browser cache
    const secondTagAddedAt = await browser.execute(() => Math.floor(performance.now()))
    await addScript()
    await browser.pause(500)

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
})
