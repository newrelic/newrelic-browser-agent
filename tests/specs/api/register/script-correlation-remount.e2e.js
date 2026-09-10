/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEInsRequest } from '../../../../tools/testing-server/utils/expect-tests'

/**
 * Helper to get MFE timing events from harvests
 * @param {Array} harvests - Insights harvests
 * @param {string} mfeId - MFE ID to filter by
 * @returns {Array} Filtered timing events
 */
function getMFETimingEvents (harvests, mfeId) {
  return harvests
    .flatMap(({ request: { body } }) => body?.ins || [])
    .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === mfeId)
}

describe('Register API - stale script correlation reuse on MFE remount', () => {
  let mfeInsightsCapture

  beforeEach(async () => {
    ;[mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('does not inflate FCP when an MFE is remounted after the staleness window and reuses its original script correlation', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    // Load the MFE via a real <script src> tag so its register() calls get attributed to that
    // script's resource-timing/DOM correlation -- the ScriptCorrelation this fix is about.
    // The script registers 'remount-mfe' immediately as soon as it loads (first mount).
    await browser.execute(function () {
      const script = document.createElement('script')
      script.src = './js/mfe/mfe-remount.js'
      document.head.appendChild(script)
    })

    await browser.pause(500)

    await browser.execute(function () {
      window.remountApis.first.deregister()
    })

    const firstHarvest = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const firstTiming = getMFETimingEvents(firstHarvest, 'remount-mfe').find(e => e['source.name'] === 'Remount First')
    expect(firstTiming).toBeDefined()
    expect(firstTiming['vitals.fcp.value']).toBeGreaterThan(0)
    expect(firstTiming['vitals.fcp.value']).toBeLessThan(10000)

    // Wait past the 10s staleness threshold WITHOUT the script ever reloading -- simulating an
    // SPA remounting the same MFE much later, where register() still resolves to the SAME,
    // now-stale, script correlation from the original load above.
    await browser.pause(10500)

    await browser.execute(function () {
      window.remountAgain()
    })

    await browser.pause(500)

    await browser.execute(function () {
      window.remountApis.second.deregister()
    })

    const secondHarvest = await mfeInsightsCapture.waitForResult({ totalCount: 2, timeout: 10000 })
    const secondTiming = getMFETimingEvents(secondHarvest, 'remount-mfe').find(e => e['source.name'] === 'Remount Second')
    expect(secondTiming).toBeDefined()

    // This is the exact regression this test replicates: without the staleness check, the
    // remounted MFE would reuse the ~10s+ old script correlation and report FCP as the gap since
    // the ORIGINAL script load (~10s+), instead of the near-instant paint that actually just
    // happened on remount.
    expect(secondTiming['vitals.fcp.value']).toBeGreaterThan(0)
    expect(secondTiming['vitals.fcp.value']).toBeLessThan(1000)
  })
})
