import { config, getSR } from './helpers'

export default (function () {
  describe('Session Replay Across Pages', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    it('should record across same-tab page refresh', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
      const { localStorage } = await browser.getAgentSessionInfo()
      const { request: page1Contents } = await browser.testHandle.expectBlob()

      expect(page1Contents.query).toMatchObject({
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: expect.any(String)
      })

      expect(page1Contents.body).toMatchObject({
        type: 'SessionReplay',
        appId: expect.any(Number),
        timestamp: expect.any(Number),
        blob: expect.any(String),
        attributes: {
          session: localStorage.value,
          hasSnapshot: true,
          hasError: false,
          agentVersion: expect.any(String),
          isFirstChunk: true,
          'nr.rrweb.version': expect.any(String)
        }
      })

      await browser.refresh()
        .then(() => browser.waitForAgentLoad())

      const { request: page2Contents } = await browser.testHandle.expectBlob()

      expect(page2Contents.query).toMatchObject({
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: expect.any(String)
      })

      expect(page2Contents.body).toMatchObject({
        type: 'SessionReplay',
        appId: expect.any(Number),
        timestamp: expect.any(Number),
        blob: expect.any(String),
        attributes: {
          session: localStorage.value,
          hasSnapshot: true,
          hasError: false,
          agentVersion: expect.any(String),
          isFirstChunk: false,
          'nr.rrweb.version': expect.any(String)
        }
      })
    })

    it('should record across same-tab page navigation', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
      const { localStorage } = await browser.getAgentSessionInfo()
      const { request: page1Contents } = await browser.testHandle.expectBlob()

      expect(page1Contents.query).toMatchObject({
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: expect.any(String)
      })

      expect(page1Contents.body).toMatchObject({
        type: 'SessionReplay',
        appId: expect.any(Number),
        timestamp: expect.any(Number),
        blob: expect.any(String),
        attributes: {
          session: localStorage.value,
          hasSnapshot: true,
          hasError: false,
          agentVersion: expect.any(String),
          isFirstChunk: true,
          'nr.rrweb.version': expect.any(String)
        }
      })

      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      const { request: page2Contents } = await browser.testHandle.expectBlob()

      expect(page2Contents.query).toMatchObject({
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: expect.any(String)
      })

      expect(page2Contents.body).toMatchObject({
        type: 'SessionReplay',
        appId: expect.any(Number),
        timestamp: expect.any(Number),
        blob: expect.any(String),
        attributes: {
          session: localStorage.value,
          hasSnapshot: true,
          hasError: false,
          agentVersion: expect.any(String),
          isFirstChunk: false,
          'nr.rrweb.version': expect.any(String)
        }
      })
    })

    it('should record across new-tab page navigation', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
      const { localStorage } = await browser.getAgentSessionInfo()
      const { request: page1Contents } = await browser.testHandle.expectBlob()

      expect(page1Contents.query).toMatchObject({
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: expect.any(String)
      })

      expect(page1Contents.body).toMatchObject({
        type: 'SessionReplay',
        appId: expect.any(Number),
        timestamp: expect.any(Number),
        blob: expect.any(String),
        attributes: {
          session: localStorage.value,
          hasSnapshot: true,
          hasError: false,
          agentVersion: expect.any(String),
          isFirstChunk: true,
          'nr.rrweb.version': expect.any(String)
        }
      })

      const newTab = await browser.createWindow('tab')
      await browser.switchToWindow(newTab.handle)
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      const { request: page2Contents } = await browser.testHandle.expectBlob()

      expect(page2Contents.query).toMatchObject({
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: expect.any(String)
      })

      expect(page2Contents.body).toMatchObject({
        type: 'SessionReplay',
        appId: expect.any(Number),
        timestamp: expect.any(Number),
        blob: expect.any(String),
        attributes: {
          session: localStorage.value,
          hasSnapshot: true,
          hasError: false,
          agentVersion: expect.any(String),
          isFirstChunk: false,
          'nr.rrweb.version': expect.any(String)
        }
      })

      await browser.closeWindow()
      await browser.switchToWindow((await browser.getWindowHandles())[0])
    })
    it('should not record across navigations if not active', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
      const { localStorage } = await browser.getAgentSessionInfo()
      const { request: page1Contents } = await browser.testHandle.expectBlob()

      expect(page1Contents.query).toMatchObject({
        protocol_version: '0',
        content_encoding: 'gzip',
        browser_monitoring_key: expect.any(String)
      })

      expect(page1Contents.body).toMatchObject({
        type: 'SessionReplay',
        appId: expect.any(Number),
        timestamp: expect.any(Number),
        blob: expect.any(String),
        attributes: {
          session: localStorage.value,
          hasSnapshot: true,
          hasError: false,
          agentVersion: expect.any(String),
          isFirstChunk: true,
          'nr.rrweb.version': expect.any(String)
        }
      })

      await browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.state.sessionReplay = 0
      })

      await browser.refresh()
        .then(() => browser.waitForAgentLoad())

      const sr = await getSR()

      expect(sr.exists).toEqual(false)
    })
  })
})()
