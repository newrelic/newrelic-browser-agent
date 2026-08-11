/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEErrorsRequest, testErrorsRequest, testMFEInsRequest, testMFEAjaxEventsRequest } from '../../../../tools/testing-server/utils/expect-tests'

function getAttr (event, key) {
  const child = event.children?.find(c => c.key === key)
  return child?.value
}

function loadSecondaryScript () {
  const script = document.createElement('script')
  script.src = './js/mfe/mfe-manifest-secondary.js'
  document.head.appendChild(script)
}

describe('Register API - Manifest', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('attributes an error from a secondary manifest-listed script (not the register() caller) to the MFE', async () => {
    const [mfeErrorsCapture, containerErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest },
      { test: testErrorsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.manifestApi = newrelic.register({
        id: 'manifest-mfe',
        name: 'ManifestMFE',
        manifest: { assets: ['mfe-manifest-secondary.js'] }
      })
    })
    await browser.execute(loadSecondaryScript)

    const mfeErrorHarvests = await mfeErrorsCapture.waitForResult({ timeout: 10000 })
    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'manifest-mfe')

    expect(mfeErrors.length).toBeGreaterThanOrEqual(1)
    expect(mfeErrors[0].params.message).toContain('error from manifest secondary asset')

    // the container agent's own errors capture should never have received this error
    const containerErrors = (await containerErrorsCapture.waitForResult({ timeout: 500 }).catch(() => []))
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.params.message?.includes('error from manifest secondary asset'))
    expect(containerErrors.length).toBe(0)
  })

  it('attributes an error via a RegExp manifest asset (not just plain string paths)', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.regexManifestApi = newrelic.register({
        id: 'regex-manifest-mfe',
        name: 'RegexManifestMFE',
        manifest: { assets: [/mfe-manifest-secondary\.js$/] }
      })
    })
    await browser.execute(loadSecondaryScript)

    const mfeErrorHarvests = await mfeErrorsCapture.waitForResult({ timeout: 10000 })
    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'regex-manifest-mfe')

    expect(mfeErrors.length).toBeGreaterThanOrEqual(1)
  })

  it('attributes an AJAX call from a secondary manifest-listed script to the MFE', async () => {
    const [mfeAjaxCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEAjaxEventsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.manifestAjaxApi = newrelic.register({
        id: 'manifest-ajax-mfe',
        name: 'ManifestAjaxMFE',
        manifest: { assets: ['mfe-manifest-secondary.js'] }
      })
    })
    await browser.execute(loadSecondaryScript)

    const ajaxHarvests = await mfeAjaxCapture.waitForResult({ timeout: 10000 })
    const mfeAjaxEvents = ajaxHarvests
      .flatMap(({ request: { body } }) => body)
      .filter(event => event.type === 'ajax' && getAttr(event, 'source.id') === 'manifest-ajax-mfe')

    expect(mfeAjaxEvents.length).toBeGreaterThanOrEqual(1)
    expect(mfeAjaxEvents.some(event => event.path?.startsWith('/mock/manifest-secondary'))).toBe(true)
  })

  it('falls back to caller-script-only attribution when no manifest is supplied (unchanged behavior)', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.noManifestApi = newrelic.register({ id: 'no-manifest-mfe', name: 'NoManifestMFE' })
    })
    await browser.execute(loadSecondaryScript)

    const mfeErrorHarvests = await mfeErrorsCapture.waitForResult({ timeout: 5000 }).catch(() => [])
    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'no-manifest-mfe')

    // without a manifest, an error from a script that never called register() should NOT attribute to the MFE
    expect(mfeErrors.length).toBe(0)
  })

  it('widens MicroFrontEndTiming fetch window across manifest script assets when timingMethod is "scripts"', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.timingApi = newrelic.register({
        id: 'manifest-timing-mfe',
        name: 'ManifestTimingMFE',
        manifest: { assets: ['mfe-manifest-secondary.js'] },
        timingMethod: 'scripts'
      })
    })
    await browser.execute(loadSecondaryScript)

    await browser.pause(500)
    await browser.execute(function () { window.timingApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'manifest-timing-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]
    // The registering script is inline (timeToFetch=0), but the manifest's secondary script asset actually
    // downloads over the network -- once widened, timeToFetch should reflect that instead of staying 0.
    expect(timing.timeToFetch).toBeGreaterThan(0)
  })

  it('widens MicroFrontEndTiming execution window across manifest script assets when timingMethod is "scripts"', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.executeTimingApi = newrelic.register({
        id: 'manifest-execute-timing-mfe',
        name: 'ManifestExecuteTimingMFE',
        manifest: { assets: ['mfe-manifest-secondary.js'] },
        timingMethod: 'scripts'
      })
    })
    await browser.execute(loadSecondaryScript)

    await browser.pause(500)
    await browser.execute(function () { window.executeTimingApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'manifest-execute-timing-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]
    // The registering script is inline (timeToExecute would otherwise be 0), but the manifest's secondary script
    // asset actually loads and executes in the DOM -- once widened, timeToExecute should reflect that instead of
    // staying 0.
    expect(timing.timeToExecute).toBeGreaterThan(0)
  })

  it('anchors MicroFrontEndTiming assetUrl on the first-resolving manifest script asset instead of the caller script', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.firstScriptAnchorApi = newrelic.register({
        id: 'manifest-first-script-mfe',
        name: 'ManifestFirstScriptMFE',
        manifest: { assets: ['mfe-manifest-secondary.js'] },
        timingMethod: 'scripts'
      })
    })
    await browser.execute(loadSecondaryScript)

    await browser.pause(500)
    await browser.execute(function () { window.firstScriptAnchorApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timing = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .find(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'manifest-first-script-mfe')

    expect(timing).toBeDefined()
    // The inline registering script is never the resolved anchor here -- the first-resolving manifest script asset is.
    expect(timing.assetUrl).toContain('mfe-manifest-secondary.js')
    expect(timing.assetType).toBe('script')
  })

  it('accumulates MicroFrontEndTiming totalWeight from the manifest script asset when timingMethod is "scripts"', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.weightApi = newrelic.register({
        id: 'manifest-weight-mfe',
        name: 'ManifestWeightMFE',
        manifest: { assets: ['mfe-manifest-secondary.js'] },
        timingMethod: 'scripts'
      })
    })
    await browser.execute(loadSecondaryScript)

    await browser.pause(500)
    await browser.execute(function () { window.weightApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'manifest-weight-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    // The registering script is inline (0 bytes), so any weight here can only have come from the manifest's
    // secondary script asset actually downloading over the network.
    expect(timingEvents[0].totalWeight).toBeGreaterThan(0)
  })

  it('reports MicroFrontEndTiming renderBlocking as a boolean when the browser supports renderBlockingStatus, omitted otherwise', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.renderBlockingApi = newrelic.register({
        id: 'manifest-render-blocking-mfe',
        name: 'ManifestRenderBlockingMFE',
        manifest: { assets: ['mfe-manifest-secondary.js'] },
        timingMethod: 'all'
      })
    })
    await browser.execute(loadSecondaryScript)

    await browser.pause(500)
    await browser.execute(function () { window.renderBlockingApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'manifest-render-blocking-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    // Support for the underlying renderBlockingStatus attribute varies across this project's Chrome/Edge/Firefox/
    // Safari test matrix -- when unsupported, the attribute is never observed and renderBlocking is correctly
    // omitted from the event entirely (see register.js), so only the shape is asserted here. The exact
    // blocking->true / non-blocking->false / never-observed->omitted mapping is covered by the unit tests in
    // script-tracker.test.js.
    expect(['boolean', 'undefined']).toContain(typeof timingEvents[0].renderBlocking)
  })

  it('accumulates totalWeight from a non-script manifest asset lazy-loaded well after register() (late-resolution path, not the synchronous buffer pass)', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.lazyAssetApi = newrelic.register({
        id: 'manifest-lazy-asset-mfe',
        name: 'ManifestLazyAssetMFE',
        manifest: { assets: [{ path: 'square.png', type: 'png' }] },
        timingMethod: 'all'
      })
    })

    // Load the image well after register() returns, so it can only resolve via the shared observer's
    // late-resolution path -- never through the synchronous performance-buffer pass inside applyManifestTimings.
    await browser.execute(function () {
      setTimeout(function () {
        var img = document.createElement('img')
        img.src = './images/square.png'
        document.body.appendChild(img)
      }, 300)
    })

    await browser.pause(1000)
    await browser.execute(function () { window.lazyAssetApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'manifest-lazy-asset-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    // The registering script is inline (0 bytes); any weight here can only have come from the lazy-loaded image.
    expect(timingEvents[0].totalWeight).toBeGreaterThan(0)
  })
})
