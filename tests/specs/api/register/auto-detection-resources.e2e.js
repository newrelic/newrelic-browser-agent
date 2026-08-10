/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEInsRequest } from '../../../../tools/testing-server/utils/expect-tests'

function loadAutoScript () {
  const script = document.createElement('script')
  script.src = './js/mfe/mfe-resource-auto.js'
  document.head.appendChild(script)
}

function loadManifestImage () {
  const img = document.createElement('img')
  img.src = './images/square.png'
  document.body.appendChild(img)
}

describe('Register API - Auto-Detection - BrowserPerformance (Resources)', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('attributes a BrowserPerformance resource event to the auto-detected MFE script when no manifest is supplied', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: {
        feature_flags: ['register'],
        performance: { resources: { enabled: true } }
      }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(loadAutoScript)
    await browser.pause(500)

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const resourceEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'BrowserPerformance' && event['source.id'] === 'resource-auto-mfe')

    expect(resourceEvents.length).toBeGreaterThanOrEqual(1)
    expect(resourceEvents.some(event => event.entryName?.includes('mfe-resource-auto.js'))).toBe(true)
  })

  it('attributes a BrowserPerformance resource event to the MFE via a non-script manifest asset (an image)', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: {
        feature_flags: ['register'],
        performance: { resources: { enabled: true } }
      }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.resourceManifestApi = newrelic.register({
        id: 'resource-manifest-mfe',
        name: 'ResourceManifestMFE',
        manifest: { assets: [{ path: 'square.png', type: 'png' }] }
      })
    })
    await browser.execute(loadManifestImage)
    await browser.pause(500)

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const resourceEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'BrowserPerformance' && event['source.id'] === 'resource-manifest-mfe')

    expect(resourceEvents.length).toBeGreaterThanOrEqual(1)
    expect(resourceEvents.some(event => event.entryName?.includes('square.png'))).toBe(true)
  })

  it('does not attribute an unrelated resource to a registered MFE', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: {
        feature_flags: ['register'],
        performance: { resources: { enabled: true } }
      }
    })).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.unrelatedApi = newrelic.register({ id: 'unrelated-resource-mfe', name: 'UnrelatedResourceMFE' })
    })
    await browser.execute(loadManifestImage)
    await browser.pause(500)

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const resourceEvents = insightsHarvests
      .flatMap(({ request: { body } }) => body.ins)
      .filter(event => event.eventType === 'BrowserPerformance' && event.entryName?.includes('square.png'))

    // the image is unrelated to unrelated-resource-mfe (no manifest, different script) -- it should still be
    // captured (attributed to the container agent), but never attributed to that MFE's source.id.
    expect(resourceEvents.length).toBeGreaterThanOrEqual(1)
    expect(resourceEvents.every(event => event['source.id'] !== 'unrelated-resource-mfe')).toBe(true)
  })
})
