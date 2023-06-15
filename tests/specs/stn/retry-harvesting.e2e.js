import { faker } from '@faker-js/faker'
import { testResourcesRequest } from '../../../tools/testing-server/utils/expect-tests'

const config = {
  init: {
    harvest: {
      /*
      Session Trace harvesting does not use any of the delay settings from the harvest module. It should
      just put the resources in the next harvest. Setting this value a little higher than the default
      harvest time to verify it's not being used.
      */
      tooManyRequestsDelay: 10
    }
  }
}

describe('ins retry harvesting', () => {
  [408, 429, 500, 503].forEach(statusCode =>
    it(`should send the session trace on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testResourcesRequest,
        permanent: true,
        statusCode,
        body: ''
      })

      const [firstResourcesHarvest] = await Promise.all([
        browser.testHandle.expectResources(),
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html', config))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const ptid = faker.datatype.uuid()
      await browser.testHandle.scheduleReply('bamServer', {
        test: testResourcesRequest,
        permanent: true,
        body: ptid
      })

      const secondResourcesHarvest = await browser.testHandle.expectResources()
      const [thirdResourcesHarvest] = await Promise.all([
        browser.testHandle.expectResources(),
        $('#trigger').click()
      ])

      expect(firstResourcesHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondResourcesHarvest.request.body.res).toEqual(expect.arrayContaining(firstResourcesHarvest.request.body.res))
      expect(secondResourcesHarvest.request.query.ptid).toBeUndefined()
      expect(thirdResourcesHarvest.request.query.ptid).toEqual(ptid)

      const firstHarvestTime = Number(firstResourcesHarvest.request.query.rst)
      const secondHarvestTime = Number(secondResourcesHarvest.request.query.rst)
      expect(secondHarvestTime).toBeWithin(firstHarvestTime + 5000, firstHarvestTime + 10000)
    })
  );

  [400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the page action on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testResourcesRequest,
        permanent: true,
        statusCode,
        body: ''
      })

      const [firstResourcesHarvest] = await Promise.all([
        browser.testHandle.expectResources(),
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html', config))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const ptid = faker.datatype.uuid()
      await browser.testHandle.scheduleReply('bamServer', {
        test: testResourcesRequest,
        permanent: true,
        body: ptid
      })

      const secondResourcesHarvest = await browser.testHandle.expectResources()
      const [thirdResourcesHarvest] = await Promise.all([
        browser.testHandle.expectResources(),
        $('#trigger').click()
      ])

      expect(firstResourcesHarvest.reply.statusCode).toEqual(statusCode)
      expect(secondResourcesHarvest.request.body.res).not.toEqual(expect.arrayContaining(firstResourcesHarvest.request.body.res))
      expect(secondResourcesHarvest.request.query.ptid).toBeUndefined()
      expect(thirdResourcesHarvest.request.query.ptid).toEqual(ptid)

      const firstHarvestTime = Number(firstResourcesHarvest.request.query.rst)
      const secondHarvestTime = Number(secondResourcesHarvest.request.query.rst)
      expect(secondHarvestTime).toBeWithin(firstHarvestTime + 5000, firstHarvestTime + 10000)
    })
  )
})
