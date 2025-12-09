import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('setCustomAttribute()', () => {
    it('tallies metadata for jsAttributes', async () => {
      const testUrl = await browser.testHandle.assetURL('instrumented.html')
      await browser.url(testUrl)
        .then(() => browser.waitForAgentLoad())

      expect(await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.jsAttributesMetadata.bytes
      })).toEqual(0) // no attributes set yet

      await browser.execute(function () {
        newrelic.setCustomAttribute('testing', 123)
      })

      expect(await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.jsAttributesMetadata.bytes
      })).toEqual(10) // testing (7) + 123 (3) = 10

      await browser.execute(function () {
        newrelic.setCustomAttribute('testing', null)
      })

      expect(await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].runtime.jsAttributesMetadata.bytes
      })).toEqual(0)
    })

    it('persists attribute onto subsequent page loads until unset', async () => {
      const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
      const testUrl = await browser.testHandle.assetURL('api/custom-attribute.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResult] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(testUrl)
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResult[0].request.body.ja).toEqual({ testing: 123 }) // initial page load has custom attribute

      const subsequentTestUrl = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResultAfterNavigate] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 2 }),
        browser.url(subsequentTestUrl)
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResultAfterNavigate[1].request.body.ja).toEqual({ testing: 123 }) // 2nd page load still has custom attribute from storage

      await browser.execute(function () {
        newrelic.setCustomAttribute('testing', null)
      })

      const [rumResultAfterUnset] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 3 }),
        browser.url(subsequentTestUrl)
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResultAfterUnset[2].request.body).not.toHaveProperty('ja') // 3rd page load does not retain custom attribute after unsetting (set to null)
    })

    it('can change persisted attribute during load race, page memory and LS', async () => {
      const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
      const testUrl = await browser.testHandle.assetURL('api/custom-attribute-persist-random.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResult, randomValue] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        browser.url(testUrl)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () { return window.value }))
      ])

      expect(rumResult[0].request.body.ja).toEqual({ testing: randomValue, 'testing-load': randomValue }) // initial page load has custom attribute

      const session = await browser.execute(function () {
        return localStorage.getItem('NRBA_SESSION')
      })
      expect(JSON.parse(session).custom.testing).toEqual(randomValue) // initial page load has custom attribute in memory
      expect(JSON.parse(session).custom['testing-load']).toEqual(randomValue) // initial page load has custom attribute in memory

      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes.testing
      }))).toEqual(randomValue) // initial page load has custom attribute in JS memory

      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes['testing-load']
      }))).toEqual(randomValue) // initial page load has custom attribute in JS memory

      await browser.testHandle.assetURL('api/custom-attribute-persist-random.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })

      const [rumResultAfterNavigate, randomValueAfterNavigate] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 2 }),
        browser.url(testUrl)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () { return window.value }))
      ])

      expect(rumResultAfterNavigate[1].request.body.ja).toEqual({ testing: randomValueAfterNavigate, 'testing-load': randomValueAfterNavigate }) // 2nd page load has new random value
      expect(rumResultAfterNavigate[1].request.body.ja).not.toEqual({ testing: randomValue, 'testing-load': randomValueAfterNavigate }) // 2nd page load value is not first load value

      const sessionAfterNavigate = await browser.execute(function () {
        return localStorage.getItem('NRBA_SESSION')
      })
      expect(JSON.parse(sessionAfterNavigate).custom.testing).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in memory
      expect(JSON.parse(sessionAfterNavigate).custom['testing-load']).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in memory

      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes.testing
      }))).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in JS memory
      expect((await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].info.jsAttributes['testing-load']
      }))).toEqual(randomValueAfterNavigate) // initial page load has custom attribute in JS memory
    })
  })
})
