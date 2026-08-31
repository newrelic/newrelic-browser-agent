/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEErrorsRequest, testErrorsRequest, testMFEInsRequest, testMFEAjaxEventsRequest, testLogsRequest } from '../../../../tools/testing-server/utils/expect-tests'

function getAttr (event, key) {
  const child = event.children?.find(c => c.key === key)
  return child?.value
}

function loadScript (src) {
  const script = document.createElement('script')
  script.src = src
  document.head.appendChild(script)
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
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] }
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
      // A RegExp matcher is never inferred as a script on its own -- `type: 'script'` is required for it to
      // satisfy scriptsOnly stack-trace attribution (errors/logs/ajax/websockets).
      window.regexManifestApi = newrelic.register({
        id: 'regex-manifest-mfe',
        name: 'RegexManifestMFE',
        manifest: { assets: [{ matcher: /mfe-manifest-secondary\.js$/, type: 'script' }] }
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
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] }
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
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] },
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
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] },
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
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] },
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
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] },
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

  it('accumulates MicroFrontEndTiming totalWeight from a manifest asset even when timingMethod is left unset (weight is not gated behind timingMethod)', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // No timingMethod at all -- the 'entry' default, which never widens timeToFetch/timeToExecute from the
      // manifest. totalWeight must still count the manifest's secondary script asset.
      window.weightNoMethodApi = newrelic.register({
        id: 'manifest-weight-no-method-mfe',
        name: 'ManifestWeightNoMethodMFE',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] }
      })
    })
    await browser.execute(loadSecondaryScript)

    await browser.pause(500)
    await browser.execute(function () { window.weightNoMethodApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'manifest-weight-no-method-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]
    // timeToFetch stays 0 -- the registering script is inline and, without an opt-in timingMethod, the manifest
    // asset never widens it.
    expect(timing.timeToFetch).toBe(0)
    // But totalWeight still reflects the manifest's secondary script asset downloading over the network.
    expect(timing.totalWeight).toBeGreaterThan(0)
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
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] },
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
        manifest: { assets: [{ matcher: 'square.png' }] },
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

  it('attributes errors from TWO independent manifest-listed scripts to the same MFE', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.twoScriptErrorsApi = newrelic.register({
        id: 'two-script-errors-mfe',
        name: 'TwoScriptErrorsMFE',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }, { matcher: 'mfe-manifest-secondary-2.js' }] }
      })
    })
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary.js')
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary-2.js')

    const mfeErrorHarvests = await mfeErrorsCapture.waitForResult({ timeout: 10000 })
    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'two-script-errors-mfe')

    expect(mfeErrors.some(err => err.params.message.includes('error from manifest secondary asset') && !err.params.message.includes('2'))).toBe(true)
    expect(mfeErrors.some(err => err.params.message.includes('error from manifest secondary asset 2'))).toBe(true)
  })

  it('attributes auto-captured logs from TWO independent manifest-listed scripts to the same MFE', async () => {
    const [logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testLogsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'], logging: { enabled: true } }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.twoScriptLogsApi = newrelic.register({
        id: 'two-script-logs-mfe',
        name: 'TwoScriptLogsMFE',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }, { matcher: 'mfe-manifest-secondary-2.js' }] }
      })
    })
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary.js')
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary-2.js')

    const logsHarvests = await logsCapture.waitForResult({ timeout: 10000 })
    const mfeLogs = logsHarvests
      .flatMap(harvest => JSON.parse(harvest.request.body)[0].logs || [])
      .filter(log => log.attributes?.['source.id'] === 'two-script-logs-mfe')

    expect(mfeLogs.some(log => log.message === 'log from manifest secondary asset')).toBe(true)
    expect(mfeLogs.some(log => log.message === 'log from manifest secondary asset 2')).toBe(true)
  })

  it('attributes AJAX calls from TWO independent manifest-listed scripts to the same MFE', async () => {
    const [mfeAjaxCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEAjaxEventsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.twoScriptAjaxApi = newrelic.register({
        id: 'two-script-ajax-mfe',
        name: 'TwoScriptAjaxMFE',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }, { matcher: 'mfe-manifest-secondary-2.js' }] }
      })
    })
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary.js')
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary-2.js')

    const ajaxHarvests = await mfeAjaxCapture.waitForResult({ timeout: 10000 })
    const mfeAjaxEvents = ajaxHarvests
      .flatMap(({ request: { body } }) => body)
      .filter(event => event.type === 'ajax' && getAttr(event, 'source.id') === 'two-script-ajax-mfe')

    expect(mfeAjaxEvents.some(event => event.path?.startsWith('/mock/manifest-secondary-2'))).toBe(true)
    expect(mfeAjaxEvents.some(event => event.path?.startsWith('/mock/manifest-secondary') && !event.path?.startsWith('/mock/manifest-secondary-2'))).toBe(true)
  })

  it('attributes BrowserPerformance resource events from TWO independent manifest-listed scripts to the same MFE', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      // ignore_newrelic defaults to true, which filters out any resource whose hostname includes 'nr-local.net' --
      // the test asset server's own domain -- so every resource in this suite needs it explicitly disabled.
      init: { feature_flags: ['register'], performance: { resources: { enabled: true, ignore_newrelic: false } } }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.twoScriptResourcesApi = newrelic.register({
        id: 'two-script-resources-mfe',
        name: 'TwoScriptResourcesMFE',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }, { matcher: 'mfe-manifest-secondary-2.js' }] }
      })
    })
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary.js')
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary-2.js')
    await browser.pause(500)
    await browser.refresh() // force any pending BrowserPerformance events to flush via the page-unload harvest

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const resourceEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'BrowserPerformance' && event['source.id'] === 'two-script-resources-mfe')

    expect(resourceEvents.some(event => event.entryName?.includes('mfe-manifest-secondary.js'))).toBe(true)
    expect(resourceEvents.some(event => event.entryName?.includes('mfe-manifest-secondary-2.js'))).toBe(true)
  })

  it('attributes a WebSocket opened by a manifest-listed script to the MFE', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'], logging: { enabled: true }, web_sockets: { enabled: true } }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.wsManifestApi = newrelic.register({
        id: 'manifest-ws-mfe',
        name: 'ManifestWsMFE',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary-ws.js' }] }
      })
    })
    await browser.execute(loadScript, './js/mfe/mfe-manifest-secondary-ws.js')
    await browser.pause(500)
    await browser.execute(function () { window.manifestWs.close() })
    await browser.execute(function () { window.wsManifestApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const wsEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'WebSocket' && event['source.id'] === 'manifest-ws-mfe')

    expect(wsEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('attributes an error/log/AJAX call from a secondary manifest-listed file to the MFE when the MFE itself registers from a real (non-inline) file', async () => {
    const [mfeErrorsCapture, logsCapture, mfeAjaxCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest },
      { test: testLogsRequest },
      { test: testMFEAjaxEventsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'], logging: { enabled: true } }
    })).then(() => browser.waitForAgentLoad())

    // mfe-manifest-root.js calls newrelic.register() itself, from a real <script src> -- not an inline eval.
    await browser.execute(loadScript, './js/mfe/mfe-manifest-root.js')
    await browser.pause(300)
    await browser.execute(loadScript, './js/mfe/mfe-manifest-root-secondary.js')
    await browser.pause(300)
    await browser.refresh() // force any pending logs (and anything else buffered) to flush via the page-unload harvest

    // Wait on all three capture types concurrently over the same window, rather than sequentially burning
    // 10s per capture -- each capture accumulates independently regardless of when it's awaited.
    const [mfeErrorHarvests, logsHarvests, ajaxHarvests] = await Promise.all([
      mfeErrorsCapture.waitForResult({ timeout: 10000 }),
      logsCapture.waitForResult({ timeout: 10000 }),
      mfeAjaxCapture.waitForResult({ timeout: 10000 })
    ])

    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'manifest-root-mfe')
    expect(mfeErrors.some(err => err.params.message.includes('error from manifest root secondary asset'))).toBe(true)

    const mfeLogs = logsHarvests
      .flatMap(harvest => JSON.parse(harvest.request.body)[0].logs || [])
      .filter(log => log.attributes?.['source.id'] === 'manifest-root-mfe')
    expect(mfeLogs.some(log => log.message === 'log from manifest root secondary asset')).toBe(true)

    const mfeAjaxEvents = ajaxHarvests
      .flatMap(({ request: { body } }) => body)
      .filter(event => event.type === 'ajax' && getAttr(event, 'source.id') === 'manifest-root-mfe')
    expect(mfeAjaxEvents.some(event => event.path?.startsWith('/mock/manifest-root-secondary'))).toBe(true)
  })

  it('never attributes a registrar script\'s own activity to an MFE it registers with a manifest excluding itself', async () => {
    // A platform-level registrar script calls register() on behalf of an MFE, using a manifest that names only the
    // MFE's own file -- never the registrar's own file. The registrar's own error/log/ajax activity must never
    // attribute to the MFE, even though it's the one that called register().
    const [mfeErrorsCapture, logsCapture, mfeAjaxCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest },
      { test: testLogsRequest },
      { test: testMFEAjaxEventsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'], logging: { enabled: true } }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(loadScript, './js/mfe/mfe-manifest-registrar.js')
    await browser.pause(300)
    await browser.execute(loadScript, './js/mfe/mfe-manifest-registrar-secondary.js')
    await browser.pause(300)
    await browser.refresh() // force any pending logs (and anything else buffered) to flush via the page-unload harvest

    const [mfeErrorHarvests, logsHarvests, ajaxHarvests] = await Promise.all([
      mfeErrorsCapture.waitForResult({ timeout: 10000 }),
      logsCapture.waitForResult({ timeout: 10000 }),
      mfeAjaxCapture.waitForResult({ timeout: 10000 })
    ])

    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'manifest-registrar-mfe')
    // The MFE's own file (named in the manifest) must attribute.
    expect(mfeErrors.some(err => err.params.message.includes('error from manifest registrar secondary asset'))).toBe(true)
    // The registrar's own error must never attribute, since it's excluded from the manifest.
    expect(mfeErrors.some(err => err.params.message.includes('error from manifest registrar caller'))).toBe(false)

    const mfeLogs = logsHarvests
      .flatMap(harvest => JSON.parse(harvest.request.body)[0].logs || [])
      .filter(log => log.attributes?.['source.id'] === 'manifest-registrar-mfe')
    expect(mfeLogs.some(log => log.message === 'log from manifest registrar secondary asset')).toBe(true)
    expect(mfeLogs.some(log => log.message === 'log from manifest registrar caller')).toBe(false)

    const mfeAjaxEvents = ajaxHarvests
      .flatMap(({ request: { body } }) => body)
      .filter(event => event.type === 'ajax' && getAttr(event, 'source.id') === 'manifest-registrar-mfe')
    expect(mfeAjaxEvents.some(event => event.path?.startsWith('/mock/manifest-registrar-secondary'))).toBe(true)
    expect(mfeAjaxEvents.some(event => event.path?.startsWith('/mock/manifest-registrar-caller'))).toBe(false)
  })

  it('gives each of TWO different MFEs their own copy of an error when their manifests overlap on the same script', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.overlapApiOne = newrelic.register({
        id: 'overlap-mfe-1',
        name: 'OverlapMFE1',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] }
      })
      window.overlapApiTwo = newrelic.register({
        id: 'overlap-mfe-2',
        name: 'OverlapMFE2',
        manifest: { assets: [{ matcher: 'mfe-manifest-secondary.js' }] }
      })
    })
    await browser.execute(loadSecondaryScript)

    const mfeErrorHarvests = await mfeErrorsCapture.waitForResult({ timeout: 10000 })
    const mfeErrors = mfeErrorHarvests.flatMap(({ request: { body } }) => body.err)

    expect(mfeErrors.some(err => err.custom?.['source.id'] === 'overlap-mfe-1' && err.params.message.includes('error from manifest secondary asset'))).toBe(true)
    expect(mfeErrors.some(err => err.custom?.['source.id'] === 'overlap-mfe-2' && err.params.message.includes('error from manifest secondary asset'))).toBe(true)
  })

  it('treats an empty manifest ({ assets: [] }) the same as no manifest at all', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.emptyManifestApi = newrelic.register({
        id: 'empty-manifest-mfe',
        name: 'EmptyManifestMFE',
        manifest: { assets: [] }
      })
    })
    await browser.execute(loadSecondaryScript)

    const mfeErrorHarvests = await mfeErrorsCapture.waitForResult({ timeout: 5000 }).catch(() => [])
    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'empty-manifest-mfe')

    // an empty assets list parses to no usable manifest at all -- the secondary script's error must NOT attribute
    expect(mfeErrors.length).toBe(0)
  })

  it('is a silent no-op to set timingMethod with no manifest supplied at all', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // No manifest at all -- timingMethod has nothing to widen against, and must not warn/throw.
      window.timingNoManifestApi = newrelic.register({
        id: 'timing-no-manifest-mfe',
        name: 'TimingNoManifestMFE',
        timingMethod: 'all'
      })
    })
    await browser.execute(function () { window.timingNoManifestApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'timing-no-manifest-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    // Identical baseline to a plain no-manifest/no-timingMethod registration -- the inline caller never fetches
    // anything of its own, and there's no manifest for `timingMethod` to widen against.
    expect(timingEvents[0].timeToFetch).toBe(0)
    expect(timingEvents[0].totalWeight).toBe(0)
  })

  it('never attributes an error via stack-trace when the manifest has only non-script assets, even in "all" mode', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      // square.png is the only manifest asset -- no script asset exists at all.
      window.imageOnlyApi = newrelic.register({
        id: 'image-only-manifest-mfe',
        name: 'ImageOnlyManifestMFE',
        manifest: { assets: [{ matcher: 'square.png' }] },
        timingMethod: 'all'
      })
    })
    // mfe-manifest-secondary.js is NOT listed in the manifest and isn't the register() caller -- its error must
    // never attribute, since a manifest with zero script assets can never satisfy scriptsOnly stack-trace matching.
    await browser.execute(loadSecondaryScript)

    const mfeErrorHarvests = await mfeErrorsCapture.waitForResult({ timeout: 5000 }).catch(() => [])
    const mfeErrors = mfeErrorHarvests
      .flatMap(({ request: { body } }) => body.err)
      .filter(err => err.custom?.['source.id'] === 'image-only-manifest-mfe')

    expect(mfeErrors.length).toBe(0)
  })

  it('reports a normal MicroFrontEndTiming baseline, with no hang or error, when a supplied manifest asset never appears on the page', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.neverLoadedApi = newrelic.register({
        id: 'never-loaded-manifest-mfe',
        name: 'NeverLoadedManifestMFE',
        manifest: { assets: [{ matcher: 'never-loaded-asset.js' }] },
        timingMethod: 'all'
      })
    })
    await browser.execute(function () { window.neverLoadedApi.deregister() })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'never-loaded-manifest-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    // Never-resolving manifest asset leaves the timing/weight fields exactly at the caller-script-only baseline.
    expect(timingEvents[0].timeToFetch).toBe(0)
    expect(timingEvents[0].totalWeight).toBe(0)
  })
})
