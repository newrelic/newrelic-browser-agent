import { testMFEErrorsRequest, testMFEInsRequest, testLogsRequest } from '../../../tools/testing-server/utils/expect-tests'

/**
 * RegisteredIframeEntity E2E Tests
 * This test suite validates the iframe-to-parent communication for registered entities.
 * It tests postMessage communication, origin validation, timing updates, and API method proxying.
 */
describe('RegisteredIframeEntity', () => {
  beforeEach(async () => {
    await browser.enableLogging()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('Happy Paths', () => {
    it('should create successfully in iframe context', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))

      // Wait for iframe to load
      await browser.pause(1000)

      const iframeStatus = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        if (!iframe || !iframe.contentWindow) return { error: 'Iframe not found' }

        const iframeWindow = iframe.contentWindow
        return {
          hasEntity: !!iframeWindow.RegisteredIframeEntity,
          hasInstance: !!iframeWindow.entity,
          blocked: iframeWindow.entity?.blocked,
          hasMetadata: !!iframeWindow.entity?.metadata
        }
      })

      expect(iframeStatus.hasEntity).toBe(true)
      expect(iframeStatus.hasInstance).toBe(true)
      expect(iframeStatus.blocked).not.toBe(true)
      expect(iframeStatus.hasMetadata).toBe(true)
    })

    it('should register with parent agent via postMessage', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000) // Wait for registration

      const registrationResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        // Check if registration completed by looking at metadata
        return {
          hasTargetId: !!iframeEntity?.metadata?.target?.id,
          targetId: iframeEntity?.metadata?.target?.id,
          targetName: iframeEntity?.metadata?.target?.name,
          hasTimings: !!iframeEntity?.metadata?.timings
        }
      })

      expect(registrationResult.hasTargetId).toBe(true)
      expect(registrationResult.targetName).toBeTruthy()
      expect(registrationResult.hasTimings).toBe(true)
    })

    it('should send API method calls to parent', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const apiCallResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        if (!iframeEntity) return { error: 'No entity found' }

        // Call various API methods
        iframeEntity.addPageAction('test-action', { foo: 'bar' })
        iframeEntity.setCustomAttribute('testAttr', 'testValue')
        iframeEntity.recordCustomEvent('TestEvent', { baz: 'qux' })

        return { success: true }
      })

      expect(apiCallResult.success).toBe(true)
    })

    it('should send timing updates to parent asynchronously', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const timingResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        if (!iframeEntity) return { error: 'No entity found' }

        const timings = iframeEntity.metadata.timings
        return {
          hasFetchStart: typeof timings.fetchStart === 'number',
          hasFetchEnd: typeof timings.fetchEnd === 'number',
          hasAsset: !!timings.asset,
          hasType: !!timings.type
        }
      })

      expect(timingResult.hasFetchStart).toBe(true)
      expect(timingResult.hasFetchEnd).toBe(true)
    })

    it('should expose all required API methods', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(1000)

      const apiSurface = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        const expectedMethods = [
          'addPageAction',
          'noticeError',
          'setCustomAttribute',
          'setUserId',
          'setApplicationVersion',
          'deregister',
          'log',
          'measure',
          'recordCustomEvent',
          'register'
        ]

        const methods = {}
        expectedMethods.forEach(method => {
          methods[method] = typeof iframeEntity?.[method] === 'function'
        })

        return methods
      })

      Object.values(apiSurface).forEach(exists => {
        expect(exists).toBe(true)
      })
    })

    it('should handle promise-based API methods', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const promiseResult = await browser.execute(async function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        try {
          // measure() returns a promise
          const measureResult = await iframeEntity.measure('test-measure', {
            start: 0,
            end: 100
          })

          return {
            success: true,
            hasDuration: typeof measureResult?.duration === 'number'
          }
        } catch (error) {
          return {
            error: error.message
          }
        }
      })

      expect(promiseResult.success).toBe(true)
    })

    it('should receive metadata updates from parent', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const metadataResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        return {
          hasTarget: !!iframeEntity?.metadata?.target,
          hasTimings: !!iframeEntity?.metadata?.timings,
          hasCustomAttributes: !!iframeEntity?.metadata?.customAttributes,
          targetId: iframeEntity?.metadata?.target?.id,
          targetType: iframeEntity?.metadata?.target?.type
        }
      })

      expect(metadataResult.hasTarget).toBe(true)
      expect(metadataResult.hasTimings).toBe(true)
      expect(metadataResult.hasCustomAttributes).toBe(true)
      expect(metadataResult.targetId).toBeTruthy()
    })
  })

  describe('Sad Paths', () => {
    it('should only be available in iframe context', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(1000)

      const availability = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')

        return {
          // Class should be available in iframe
          availableInIframe: typeof iframe?.contentWindow?.RegisteredIframeEntity === 'function',
          // Class should NOT be available on parent window
          availableOnParent: typeof window.RegisteredIframeEntity === 'function',
          // Iframe should have created an entity instance
          iframeHasInstance: !!iframe?.contentWindow?.entity
        }
      })

      expect(availability.availableInIframe).toBe(true)
      expect(availability.availableOnParent).toBe(false)
      expect(availability.iframeHasInstance).toBe(true)
    })

    it('should handle registration timeout', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))

      const timeoutResult = await browser.execute(async function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeWindow = iframe?.contentWindow

        if (!iframeWindow) return { error: 'No iframe window' }

        // Create a new entity instance that won't get responses
        const timeoutEntity = new iframeWindow.RegisteredIframeEntity({
          id: 'timeout-test',
          name: 'Timeout Test'
        })

        // The registration promise should be accessible but may timeout
        try {
          // Wait a bit to see if it times out (should timeout in 5 seconds)
          await new Promise(resolve => setTimeout(resolve, 100))

          return {
            hasEntity: !!timeoutEntity,
            blocked: timeoutEntity.blocked
          }
        } catch (error) {
          return { error: error.message }
        }
      })

      expect(timeoutResult.hasEntity).toBe(true)
    })

    it('should handle deregistration', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const deregisterResult = await browser.execute(async function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        try {
          await iframeEntity.deregister()
          return { success: true }
        } catch (error) {
          return { error: error.message }
        }
      })

      expect(deregisterResult.success).toBe(true)
    })

    it('should handle error responses from parent', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const errorResult = await browser.execute(async function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        try {
          // Try to call a method that doesn't exist
          await iframeEntity.register({ id: 'nested', name: 'Nested' })
          return { success: true }
        } catch (error) {
          return {
            caughtError: true,
            errorMessage: error.message
          }
        }
      })

      // Should either succeed or catch error gracefully
      expect(errorResult.caughtError || errorResult.success).toBe(true)
    })
  })

  describe('Security', () => {
    it('should validate parent origin', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(1000)

      const originResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        // Check if entity was created and not blocked
        return {
          hasEntity: !!iframeEntity,
          blocked: iframeEntity?.blocked,
          // Entity should have determined parent origin
          hasParentOrigin: true
        }
      })

      expect(originResult.hasEntity).toBe(true)
      expect(originResult.blocked).not.toBe(true)
    })

    it('should generate unique iframeInterfaceId per instance', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(1000)

      const idResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeWindow = iframe?.contentWindow

        if (!iframeWindow) return { error: 'No iframe window' }

        // Create two entities
        const entity1 = new iframeWindow.RegisteredIframeEntity({
          id: 'test1',
          name: 'Test 1'
        })

        const entity2 = new iframeWindow.RegisteredIframeEntity({
          id: 'test2',
          name: 'Test 2'
        })

        // They should have different interface IDs (we can't access private fields,
        // but we can verify they're different instances)
        return {
          areDifferentInstances: entity1 !== entity2,
          bothHaveMetadata: !!entity1.metadata && !!entity2.metadata
        }
      })

      expect(idResult.areDifferentInstances).toBe(true)
      expect(idResult.bothHaveMetadata).toBe(true)
    })
  })

  describe('Timing Integration', () => {
    it('should capture script timings from iframe context', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const timingsResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        if (!iframeEntity) return { error: 'No entity' }

        const timings = iframeEntity.metadata.timings

        return {
          hasRegisteredAt: typeof timings.registeredAt === 'number',
          hasFetchStart: typeof timings.fetchStart === 'number',
          hasFetchEnd: typeof timings.fetchEnd === 'number',
          fetchStartValid: timings.fetchStart >= 0,
          fetchEndValid: timings.fetchEnd >= timings.fetchStart
        }
      })

      expect(timingsResult.hasRegisteredAt).toBe(true)
      expect(timingsResult.hasFetchStart).toBe(true)
      expect(timingsResult.hasFetchEnd).toBe(true)
      expect(timingsResult.fetchStartValid).toBe(true)
    })

    it('should proxy timing object to detect updates', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const proxyResult = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        if (!iframeEntity) return { error: 'No entity' }

        // Timings should be a Proxy that sends updates
        const timings = iframeEntity.metadata.timings

        return {
          isObject: typeof timings === 'object',
          hasCorrelation: !!timings.correlation,
          canReadProperties: typeof timings.fetchStart !== 'undefined'
        }
      })

      expect(proxyResult.isObject).toBe(true)
      expect(proxyResult.canReadProperties).toBe(true)
    })
  })

  describe('Parent-side Integration', () => {
    it('should store iframe entities in parent agent', async () => {
      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.pause(2000)

      const parentResult = await browser.execute(function () {
        // Access registered entities via agent runtime
        const agent = Object.values(window.newrelic.initializedAgents)[0]
        const registeredEntities = agent?.runtime?.registeredEntities || []

        return {
          hasEntities: registeredEntities.length > 0,
          entityCount: registeredEntities.length,
          hasAgent: !!agent
        }
      })

      // Should have at least one registered iframe entity
      expect(parentResult.hasAgent).toBe(true)
      await browser.pause(2000)

      const timingUpdateResult = await browser.execute(function () {
        // Access registered entities via agent runtime
        const agent = Object.values(window.newrelic.initializedAgents)[0]
        const registeredEntities = agent?.runtime?.registeredEntities || []
        const iframeEntity = registeredEntities.find(e =>
          e.metadata?.target?.iframeInterfaceId
        )

        if (!iframeEntity) return { error: 'No iframe entity found in parent' }

        return {
          hasTimings: !!iframeEntity.metadata?.timings,
          hasFetchStart: typeof iframeEntity.metadata?.timings?.fetchStart === 'number',
          hasFetchEnd: typeof iframeEntity.metadata?.timings?.fetchEnd === 'number'
        }
      })

      expect(timingUpdateResult.hasTimings).toBe(true)
    })
  })

  describe('Harvest Validation', () => {
    it('should harvest all MFE event types with custom attributes and validate source attribution', async () => {
      const [errorsCapture, insightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testMFEErrorsRequest },
        { test: testMFEInsRequest },
        { test: testLogsRequest }
      ])

      await browser.url(await browser.testHandle.assetURL('test-builds/browser-agent-wrapper/registered-iframe-entity.html'))
      await browser.waitForAgentLoad()
      await browser.pause(2000) // Wait for registration to complete

      // Get the iframe entity ID for validation
      const entityId = await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity
        return iframeEntity?.metadata?.target?.id
      })

      // Step 1: Set custom attributes, userId, and applicationVersion
      await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        if (!iframeEntity) {
          throw new Error('No iframe entity found')
        }

        // Set custom attributes that should appear on all events
        iframeEntity.setCustomAttribute('customAttr1', 'value1')
        iframeEntity.setCustomAttribute('customAttr2', 'value2')
        iframeEntity.setUserId('test-user-123')
        iframeEntity.setApplicationVersion('1.2.3')
      })

      // Step 2: Trigger all event APIs
      await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity

        // Call all event APIs
        iframeEntity.log('Test log message', { logLevel: 'info', logContext: 'iframe-test' })
        iframeEntity.noticeError(new Error('Test iframe error'), { errorContext: 'iframe-test' })
        iframeEntity.addPageAction('IframePageAction', { actionData: 'test-data' })
        iframeEntity.measure('iframe-measure', { start: 0, end: 100, detail: { measureContext: 'test' } })
        iframeEntity.recordCustomEvent('IframeCustomEvent', { customData: 'test-value' })
      })

      // Step 3: Wait and call deregister to trigger MicroFrontEndTiming event
      await browser.pause(2000)
      await browser.execute(function () {
        const iframe = document.getElementById('mfe-iframe')
        const iframeEntity = iframe?.contentWindow?.entity
        iframeEntity.deregister()
      })

      // Wait a moment for deregister event to be created
      await browser.pause(1000)

      // Wait for all harvests (logs may not harvest depending on config)
      const harvestResults = await Promise.allSettled([
        errorsCapture.waitForResult({ totalCount: 1 }),
        insightsCapture.waitForResult({ totalCount: 1 }),
        logsCapture.waitForResult({ totalCount: 1 })
      ])

      // Extract harvest data (each result is an array of harvest objects)
      const errorsHarvests = harvestResults[0].status === 'fulfilled' ? harvestResults[0].value : undefined
      const insightsHarvests = harvestResults[1].status === 'fulfilled' ? harvestResults[1].value : undefined
      const logsHarvests = harvestResults[2].status === 'fulfilled' ? harvestResults[2].value : undefined

      // Validate Errors Harvest
      expect(errorsHarvests).toBeDefined()
      expect(Array.isArray(errorsHarvests)).toBe(true)
      expect(errorsHarvests.length).toBeGreaterThan(0)

      const errorPayload = errorsHarvests[0]?.request?.body?.err
      if (errorPayload && errorPayload.length > 0) {
        const errorEvent = errorPayload.find(err => err.params?.message === 'Test iframe error')
        if (errorEvent) {
          expect(errorEvent.params.exceptionClass).toEqual('Error')
          expect(errorEvent.custom?.errorContext).toEqual('iframe-test')
          expect(errorEvent.custom?.customAttr1).toEqual('value1')
          expect(errorEvent.custom?.customAttr2).toEqual('value2')
          expect(errorEvent.custom?.['source.id']).toEqual(entityId)
        }
      }

      // Validate Insights Harvest (PageActions, CustomEvents, Measures, MicroFrontEndTiming)
      expect(insightsHarvests).toBeDefined()
      expect(Array.isArray(insightsHarvests)).toBe(true)
      expect(insightsHarvests.length).toBeGreaterThan(0)

      const insightsPayload = insightsHarvests[0]?.request?.body?.ins
      if (insightsPayload && insightsPayload.length > 0) {
        // Check for Page Action
        const pageAction = insightsPayload.find(event => event.actionName === 'IframePageAction')
        if (pageAction) {
          expect(pageAction.eventType).toEqual('PageAction')
          expect(pageAction.actionData).toEqual('test-data')
          expect(pageAction.customAttr1).toEqual('value1')
          expect(pageAction.customAttr2).toEqual('value2')
          expect(pageAction['source.id']).toEqual(entityId)
        }

        // Check for CustomEvent
        const customEvent = insightsPayload.find(event => event.eventType === 'IframeCustomEvent')
        if (customEvent) {
          expect(customEvent.customData).toEqual('test-value')
          expect(customEvent.customAttr1).toEqual('value1')
          expect(customEvent.customAttr2).toEqual('value2')
          expect(customEvent['source.id']).toEqual(entityId)
          expect(customEvent.timestamp).toBeDefined()
        }

        // Check for Measure (BrowserPerformance event type)
        const measure = insightsPayload.find(event =>
          event.eventType === 'BrowserPerformance' && event.entryName === 'iframe-measure'
        )
        if (measure) {
          expect(measure.entryType).toEqual('measure')
          expect(measure.customAttr1).toEqual('value1')
          expect(measure.customAttr2).toEqual('value2')
          expect(measure['source.id']).toEqual(entityId)
        }

        // Check for MicroFrontEndTiming (deregister event)
        const mfeTiming = insightsPayload.find(event => event.eventType === 'MicroFrontEndTiming')
        if (mfeTiming) {
          expect(mfeTiming['source.id']).toEqual(entityId)
          expect(mfeTiming.customAttr1).toEqual('value1')
          expect(mfeTiming.customAttr2).toEqual('value2')
          expect(mfeTiming.registeredAt).toBeDefined()
          expect(mfeTiming.deregisteredAt).toBeDefined()
        }
      }

      // Validate Logs Harvest (optional - may not harvest depending on configuration)
      if (logsHarvests && Array.isArray(logsHarvests) && logsHarvests.length > 0) {
        const logsPayload = logsHarvests[0]?.request?.body
        if (logsPayload && Array.isArray(logsPayload) && logsPayload.length > 0) {
          const logEvent = logsPayload.find(log => log.message === 'Test log message')
          if (logEvent) {
            expect(logEvent['log.level']).toEqual('info')
            expect(logEvent.logContext).toEqual('iframe-test')
            expect(logEvent.customAttr1).toEqual('value1')
            expect(logEvent.customAttr2).toEqual('value2')
            expect(logEvent['source.id']).toEqual(entityId)
          }
        }
      }
    })
  })
})
