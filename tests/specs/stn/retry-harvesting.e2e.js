import { faker } from '@faker-js/faker'
import { testResourcesRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('stn retry harvesting', () => {
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
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      await browser.pause(500)
      await browser.testHandle.clearScheduledReplies('bamServer')

      const ptid = faker.string.uuid()
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
    })
  );

  [400, 404, 502, 504, 512].forEach(statusCode =>
    it(`should not send the session trace on the next harvest when the first harvest statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testResourcesRequest,
        permanent: true,
        statusCode,
        body: ''
      })

      const [firstResourcesHarvest] = await Promise.all([
        browser.testHandle.expectResources(),
        browser.url(await browser.testHandle.assetURL('stn/instrumented.html'))
          .then(() => browser.waitForAgentLoad())
      ])

      // Pause a bit for browsers built-in automated retry logic crap
      // await browser.pause(500)
      // await browser.testHandle.clearScheduledReplies('bamServer')

      // const ptid = faker.string.uuid()
      // await browser.testHandle.scheduleReply('bamServer', {
      //   test: testResourcesRequest,
      //   permanent: true,
      //   body: ptid
      // })

      // const secondResourcesHarvest = await browser.testHandle.expectResources()
      // const [thirdResourcesHarvest] = await Promise.all([
      //   browser.testHandle.expectResources(),
      //   $('#trigger').click()
      // ])

      expect(firstResourcesHarvest.reply.statusCode).toEqual(statusCode)
      // expect(secondResourcesHarvest.request.body.res).not.toEqual(expect.arrayContaining(firstResourcesHarvest.request.body.res))
      // expect(secondResourcesHarvest.request.query.ptid).toBeUndefined()
      // expect(thirdResourcesHarvest.request.query.ptid).toEqual(ptid)
      await expect(browser.testHandle.expectResources(10000, true)).resolves.toBeUndefined()
    })
  )
})
