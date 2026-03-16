import { testLogsRequest, testMFEErrorsRequest, testMFEInsRequest } from '../../../../tools/testing-server/utils/expect-tests'

describe('Register API - General Behaviors', () => {
  beforeEach(async () => {
    await browser.enableLogging()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should add child.* attributes to duplicated data', async () => {
    const [mfeErrorsCapture, mfeInsightsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest },
      { test: testMFEInsRequest },
      { test: testLogsRequest }
    ])

    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: {
        feature_flags: ['register', 'register.jserrors', 'register.generic_events'],
        api: {
          duplicate_registered_data: true
        }
      }
    }))

    const { agent1Id, agent2Id } = await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 'test-agent-1',
        name: 'agent1'
      })
      window.agent2 = newrelic.register({
        id: 'test-agent-2',
        name: 'agent2'
      })

      // Test all API methods
      window.agent1.noticeError(new Error('error-from-agent1'), { testAttr: 'value1' })
      window.agent2.noticeError(new Error('error-from-agent2'), { testAttr: 'value2' })

      window.agent1.addPageAction('action1', { testAttr: 'value1' })
      window.agent2.addPageAction('action2', { testAttr: 'value2' })

      window.agent1.log('log1', { customAttributes: { testAttr: 'value1' } })
      window.agent2.log('log2', { customAttributes: { testAttr: 'value2' } })

      window.agent1.recordCustomEvent('Event1', { testAttr: 'value1' })
      window.agent2.recordCustomEvent('Event2', { testAttr: 'value2' })

      window.agent1.measure('measure1', { customAttributes: { testAttr: 'value1' } })
      window.agent2.measure('measure2', { customAttributes: { testAttr: 'value2' } })

      return {
        agent1Id: window.agent1.metadata.target.id,
        agent2Id: window.agent2.metadata.target.id
      }
    })

    const [errorsHarvests, insightsHarvests, logsHarvests] = await Promise.all([
      mfeErrorsCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
      mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      logsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    ])

    const tested = {
      errors: { container: false, mfe: false },
      insights: { container: false, mfe: false },
      logs: { container: false, mfe: false }
    }

    // Check errors - distinguish by source.id
    errorsHarvests.forEach(({ request: { body } }) => {
      const data = body.err
      data.forEach((err) => {
        const hasSourceId = err.custom['source.id']
        if (hasSourceId) {
          tested.errors.mfe = true
          // MFE-specific errors should NOT have child.id or child.type
          expect(err.custom['child.id']).toBeUndefined()
          expect(err.custom['child.type']).toBeUndefined()
        } else {
          // Container errors (duplicated) should HAVE child.id and child.type
          tested.errors.container = true
          expect(err.custom['child.id']).toBeDefined()
          expect([agent1Id, agent2Id]).toContain(err.custom['child.id'])
          expect(err.custom['child.type']).toEqual('MFE')
          expect(err.custom.testAttr).toBeDefined()
        }
      })
    })

    expect(tested.errors.mfe).toEqual(true)
    expect(tested.errors.container).toEqual(true)

    // Check insights - distinguish by source.id
    insightsHarvests.forEach(({ request: { body } }) => {
      const data = body.ins
      data.forEach((ins) => {
        if (ins.eventType === 'PageAction' || ins.eventType === 'CustomEvent' || (ins.eventType === 'BrowserPerformance' && ins.entryType === 'measure')) {
          const hasSourceId = ins['source.id']
          if (hasSourceId) {
            // MFE-specific insights should NOT have child.id or child.type
            expect(ins['child.id']).toBeUndefined()
            expect(ins['child.type']).toBeUndefined()
            tested.insights.mfe = true
          } else {
            // Container insights (duplicated) should HAVE child.id and child.type
            expect(ins['child.id']).toBeDefined()
            expect([agent1Id, agent2Id]).toContain(ins['child.id'])
            expect(ins['child.type']).toEqual('MFE')
            expect(ins.testAttr).toBeDefined()
            tested.insights.container = true
          }
        }
      })
    })
    expect(tested.insights.mfe).toEqual(true)
    expect(tested.insights.container).toEqual(true)

    // Check logs - duplicated should have child.id and child.type
    logsHarvests.forEach(({ request: { body } }) => {
      const data = JSON.parse(body)[0]
      data.logs.forEach(log => {
        const hasSourceId = log.attributes['source.id']
        if (hasSourceId) {
          // MFE-specific logs should NOT have child.id or child.type
          expect(log.attributes['child.id']).toBeUndefined()
          expect(log.attributes['child.type']).toBeUndefined()
          tested.logs.mfe = true
        } else {
          // Container logs (duplicated) should HAVE child.id and child.type
          expect(log.attributes['child.id']).toBeDefined()
          expect([agent1Id, agent2Id]).toContain(log.attributes['child.id'])
          expect(log.attributes['child.type']).toEqual('MFE')
          expect(log.attributes.testAttr).toBeDefined()
          tested.logs.container = true
        }
      })
    })
    expect(tested.logs.mfe).toEqual(true)
    expect(tested.logs.container).toEqual(true)
  })

  it('should still harvest scoped data after deregistering', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1,
        name: 'agent1'
      })
      window.agent1.noticeError('1')
      window.agent1.deregister()
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    // should still get a harvest even tho the MFE was deregistered
    expect(errorsHarvests.length).toEqual(1)

    // should not get future data now that the MFE was deregistered
    await browser.execute(function () {
      window.agent1.noticeError('2')
    })

    const errorsHarvests2 = await mfeErrorsCapture.waitForResult({ timeout: 10000 })

    // should not have gotten more data
    expect(errorsHarvests2.length).toEqual(errorsHarvests.length)
  })

  it('should allow to share a registration', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1,
        name: 'my agent',
        isolated: false
      })
      window.agent2 = newrelic.register({
        id: 1,
        isolated: false
      })
      // should get data as "agent2"
      window.agent1.setCustomAttribute('sharedAttr', 'shared for both instances')
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      data.forEach((err, idx) => {
        expect(Number(err.params.message)).toEqual(idx + 1)
        expect(err.custom['source.id']).toEqual(1)
        expect(err.custom['source.name']).toEqual('my agent')
        expect(err.custom.sharedAttr).toEqual('shared for both instances')
      })
    })
  })

  it('should allow a nested register', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1,
        name: 'agent1'
      })
      window.agent2 = window.agent1.register({
        id: 2,
        name: 'agent2'
      })
      window.agent3 = window.agent2.register({
        id: 3,
        name: 'agent3'
      })
      // should get data as "agent2"
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')
      window.agent3.noticeError('3')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    const containerAgentEntityGuid = await browser.execute(function () {
      return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
    })

    // should get ALL data as "agent2" since it replaced the name of agent 1 of the same id
    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      data.forEach((err, idx) => {
        expect(err.custom['source.name']).toEqual('agent' + (idx + 1))
        if (idx === 0) {
          expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid) // first app should have container as its parent
          expect(err.custom['parent.type']).toEqual('BA') // parent is container (Browser Agent)
        }
        if (idx === 1) {
          expect(err.custom['parent.id']).toEqual(1) // second app should have first app as its parent
          expect(err.custom['parent.type']).toEqual('MFE') // parent is a registered MFE
        }
        if (idx === 2) {
          expect(err.custom['parent.id']).toEqual(2) // third app should have second app as its parent
          expect(err.custom['parent.type']).toEqual('MFE') // parent is a registered MFE
        }
      })
    })
  })

  it('should include tags as source attributes', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1,
        name: 'frontend-agent',
        tags: { module: 'checkout', feature: 'payment' }
      })

      window.agent2 = newrelic.register({
        id: 2,
        name: 'backend-agent',
        tags: { module: 'api', type: 'graphql' }
      })

      window.agent1.noticeError('error1')
      window.agent2.noticeError('error2')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      expect(data).toHaveLength(2)

      const error1 = data.find(err => err.params.message === 'error1')
      const error2 = data.find(err => err.params.message === 'error2')

      expect(error1.custom['source.module']).toEqual('checkout')
      expect(error1.custom['source.feature']).toEqual('payment')
      expect(error1.custom['source.name']).toEqual('frontend-agent')

      expect(error2.custom['source.module']).toEqual('api')
      expect(error2.custom['source.type']).toEqual('MFE') // type is a protected key, should not come from tags
      expect(error2.custom['source.name']).toEqual('backend-agent')
    })
  })

  it('should handle empty tags object', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1,
        name: 'test-agent',
        tags: {}
      })

      window.agent1.noticeError('error1')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      expect(data).toHaveLength(1)

      const error1 = data[0]
      expect(error1.custom['source.name']).toEqual('test-agent')

      // Should not have any source.* attributes except source.name, source.id, source.type
      const sourceKeys = Object.keys(error1.custom).filter(k => k.startsWith('source.'))
      expect(sourceKeys).toEqual(expect.arrayContaining(['source.name', 'source.id', 'source.type']))
      expect(sourceKeys.length).toBe(3)
    })
  })

  it('should combine tags with custom attributes', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1,
        name: 'test-agent',
        tags: { module: 'module1', layer: 'frontend' }
      })

      window.agent1.setCustomAttribute('customAttr', 'customValue')
      window.agent1.setApplicationVersion('1.0.0')
      window.agent1.noticeError('error1')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      expect(data).toHaveLength(1)

      const error1 = data[0]
      expect(error1.custom['source.module']).toEqual('module1')
      expect(error1.custom['source.layer']).toEqual('frontend')
      expect(error1.custom.customAttr).toEqual('customValue')
      expect(error1.custom['application.version']).toEqual('1.0.0')
    })
  })

  it('should exclude protected keys from tags', async () => {
    // excluded keys right now are [name, id, type]
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1234,
        name: 'test-agent',
        tags: { name: 'should-not-appear', id: 'also-not', type: 'ignored-too', validTag: 'yes' }
      })

      window.agent1.noticeError('error1')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      expect(data).toHaveLength(1)

      const error1 = data[0]

      // Should only have source.validTag, not source.name or source.id or source.type from tags
      expect(error1.custom['source.validTag']).toEqual('yes')
      expect(error1.custom['source.name']).toEqual('test-agent') // This comes from the name property
      expect(error1.custom['source.id']).toEqual(1234) // This comes from the id property
      expect(error1.custom['source.type']).toEqual('MFE') // This comes from the type property

      // Verify there are no duplicate or conflicting attributes
      const sourceNameKeys = Object.keys(error1.custom).filter(k => k === 'source.name')
      const sourceIdKeys = Object.keys(error1.custom).filter(k => k === 'source.id')
      const sourceTypeKeys = Object.keys(error1.custom).filter(k => k === 'source.type')
      expect(sourceNameKeys.length).toBe(1)
      expect(sourceIdKeys.length).toBe(1)
      expect(sourceTypeKeys.length).toBe(1)
    })
  })

  it('should handle tags with only protected keys', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      window.agent1 = newrelic.register({
        id: 1234,
        name: 'test-agent',
        tags: { name: 'ignored', id: 'also-ignored', type: 'ignored-too' }
      })

      window.agent1.noticeError('error1')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      expect(data).toHaveLength(1)

      const error1 = data[0]

      // Should only have the standard source attributes, nothing from tags
      expect(error1.custom['source.name']).toEqual('test-agent')
      expect(error1.custom['source.id']).toEqual(1234)
      expect(error1.custom['source.type']).toEqual('MFE')

      // Should not have any extra source.* attributes beyond the standard ones
      const sourceKeys = Object.keys(error1.custom).filter(k => k.startsWith('source.'))
      expect(sourceKeys).toEqual(expect.arrayContaining(['source.name', 'source.id', 'source.type']))
      expect(sourceKeys.length).toBe(3)
    })
  })
})
