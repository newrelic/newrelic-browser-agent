import { LOGGING_MODE } from '../../src/features/logging/constants'
import { rumFlags } from '../../tools/testing-server/constants'
import { testInsRequest, testRumRequest } from '../../tools/testing-server/utils/expect-tests'

describe('obfuscate rules with eventFilter', () => {
  let insightsCapture

  beforeEach(async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: LOGGING_MODE.TRACE, logapi: LOGGING_MODE.TRACE })),
      permanent: true
    })
    ;[insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testInsRequest }
    ])
  })

  it('should obfuscate PageAction events when eventFilter includes PageAction', async () => {
    const config = {
      init: {
        obfuscate: [
          {
            regex: /secret-data/g,
            replacement: 'OBFUSCATED',
            eventFilter: ['PageAction']
          }
        ]
      }
    }

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.addPageAction('test-action', { data: 'secret-data here' })
      newrelic.addPageAction('another-action', { info: 'more secret-data' })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 })
    ])

    expect(insightsHarvests.length).toBeGreaterThan(0)
    const payload = JSON.stringify(insightsHarvests[0].request.body)
    expect(payload.includes('OBFUSCATED')).toBeTruthy()
    expect(payload.includes('secret-data')).toBeFalsy()
  })

  it('should NOT obfuscate PageAction events when eventFilter excludes PageAction', async () => {
    const config = {
      init: {
        obfuscate: [
          {
            regex: /secret-data/g,
            replacement: 'OBFUSCATED',
            eventFilter: ['UserAction'] // NOT PageAction
          }
        ]
      }
    }

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.addPageAction('test-action', { data: 'secret-data here' })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 })
    ])

    expect(insightsHarvests.length).toBeGreaterThan(0)
    const payload = JSON.stringify(insightsHarvests[0].request.body)
    expect(payload.includes('secret-data')).toBeTruthy()
    expect(payload.includes('OBFUSCATED')).toBeFalsy()
  })

  it('should obfuscate PageAction when no eventFilter is specified', async () => {
    const config = {
      init: {
        obfuscate: [
          {
            regex: /global-secret/g,
            replacement: 'GLOBAL-OBFUSCATED'
            // NO eventFilter - applies to all
          }
        ]
      }
    }

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.addPageAction('test', { data: 'global-secret' })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 })
    ])

    // Check Insights (PageAction)
    expect(insightsHarvests.length).toBeGreaterThan(0)
    const insPayload = JSON.stringify(insightsHarvests[0].request.body)
    expect(insPayload.includes('GLOBAL-OBFUSCATED')).toBeTruthy()
    expect(insPayload.includes('global-secret')).toBeFalsy()
  })

  it('should handle multiple event types in eventFilter array', async () => {
    const config = {
      init: {
        obfuscate: [
          {
            regex: /multi-secret/g,
            replacement: 'MULTI-OBFUSCATED',
            eventFilter: ['PageAction', 'UserAction']
          }
        ]
      }
    }

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.addPageAction('action', { data: 'multi-secret' })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 })
    ])

    // PageAction should be obfuscated (included in eventFilter)
    const insPayload = JSON.stringify(insightsHarvests[0].request.body)
    expect(insPayload.includes('MULTI-OBFUSCATED')).toBeTruthy()
    expect(insPayload.includes('multi-secret')).toBeFalsy()
  })

  it('should handle combination of global and event-specific rules', async () => {
    const config = {
      init: {
        obfuscate: [
          {
            regex: /global/g,
            replacement: 'GLOBAL'
            // No eventFilter
          },
          {
            regex: /pageaction-only/g,
            replacement: 'PA-ONLY',
            eventFilter: ['PageAction']
          }
        ]
      }
    }

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.addPageAction('action', { data: 'global pageaction-only' })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 })
    ])

    // PageAction should have both global and event-specific rules applied
    const insPayload = JSON.stringify(insightsHarvests[0].request.body)
    expect(insPayload.includes('GLOBAL')).toBeTruthy()
    expect(insPayload.includes('PA-ONLY')).toBeTruthy()
    expect(insPayload.includes('pageaction-only')).toBeFalsy()
  })

  it('should handle empty eventFilter array as global rule', async () => {
    const config = {
      init: {
        obfuscate: [
          {
            regex: /empty-filter/g,
            replacement: 'OBFUSCATED',
            eventFilter: []
          }
        ]
      }
    }

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.addPageAction('test', { data: 'empty-filter' })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 })
    ])

    expect(insightsHarvests.length).toBeGreaterThan(0)
    const payload = JSON.stringify(insightsHarvests[0].request.body)
    expect(payload.includes('OBFUSCATED')).toBeTruthy()
    expect(payload.includes('empty-filter')).toBeFalsy()
  })

  it('should handle multiple regex patterns with eventFilter', async () => {
    const config = {
      init: {
        obfuscate: [
          {
            regex: /sensitive-ssn/g,
            replacement: 'SSN-REDACTED',
            eventFilter: ['PageAction']
          },
          {
            regex: /sensitive-cc/g,
            replacement: 'CC-REDACTED',
            eventFilter: ['PageAction']
          }
        ]
      }
    }

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.addPageAction('payment', {
        ssn: 'sensitive-ssn-123',
        card: 'sensitive-cc-456'
      })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult({ timeout: 10000 })
    ])

    expect(insightsHarvests.length).toBeGreaterThan(0)
    const payload = JSON.stringify(insightsHarvests[0].request.body)
    expect(payload.includes('SSN-REDACTED')).toBeTruthy()
    expect(payload.includes('CC-REDACTED')).toBeTruthy()
    expect(payload.includes('sensitive-ssn')).toBeFalsy()
    expect(payload.includes('sensitive-cc')).toBeFalsy()
  })
})
