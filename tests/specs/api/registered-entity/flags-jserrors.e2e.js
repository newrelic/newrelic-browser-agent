import { runRegisteredEntityTest } from './test-helpers'
import { testMFEErrorsRequest } from '../../../../tools/testing-server/utils/expect-tests'

describe('JS Errors', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('with register', async () => {
    await runRegisteredEntityTest(['register', 'register.jserrors'])
  })

  it('without register', async () => {
    await runRegisteredEntityTest(['register.jserrors'])
  })

  it('should allow a nested register', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])
    await browser.url(await browser.testHandle.assetURL('register-api.html', { init: { feature_flags: ['register', 'register.jserrors'] } }))

    await browser.execute(function () {
      const nestedAgent1 = window.agent1.register({
        id: 'nested1',
        name: 'nested 1'
      })
      const nestedAgent2 = window.agent2.register({
        id: 'nested2',
        name: 'nested 2'
      })
      // should get data as "agent2"
      window.newrelic.noticeError('42')
      window.agent1.noticeError('1')
      window.agent2.noticeError('2')
      nestedAgent1.noticeError('3')
      nestedAgent2.noticeError('4')
    })

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1 })

    const containerAgentEntityGuid = await browser.execute(function () {
      return Object.values(newrelic.initializedAgents)[0].runtime.appMetadata.agents[0].entityGuid
    })

    errorsHarvests.forEach(({ request: { query, body } }) => {
      const data = body.err
      data.forEach((err) => {
        if (err.custom['source.id'] === 'nested1') expect(err.custom['parent.id']).toEqual(1)
        else if (err.custom['source.id'] === 'nested2') expect(err.custom['parent.id']).toEqual(2)
        else expect(err.custom['parent.id']).toEqual(containerAgentEntityGuid)
      })
    })
  })
})
