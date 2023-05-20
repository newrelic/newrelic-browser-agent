/**
 * This is a WDIO worker plugin that provides custom commands.
 */
export default class CustomCommands {
  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   */
  async before () {
    /**
     * Used to wait for specific features of the browser agent to be loaded.
     * @deprecated It is best to create and use a `testHandle` and call `expectRum()`
     */
    browser.addCommand('waitForFeature', async function (feature) {
      await browser.waitUntil(
        () => browser.execute(function (feat) {
          return window.NREUM && window.NREUM.activatedFeatures && window.NREUM.activatedFeatures[feat]
        }, feature),
        {
          timeout: 30000,
          timeoutMsg: 'Agent never loaded'
        })
    })

    /**
     * Clears the current browser agent session from local storage by navigating
     * to the index page where the agent is not loaded and clearing the `localStorage`
     * in the browser. This completely destroys the current agent session ensuring that
     * a new session is not created that could affect another test.
     */
    browser.addCommand('destroyAgentSession', async function (testHandle) {
      await browser.url(await testHandle.assetURL('/'))
      await browser.execute(function () { window.localStorage.clear() })
    })

    /**
     * Clears the current browser agent session from local storage and calls
     * the `reset` session method for each initialized agent on the page. This
     * will create a new session immediately and update local storage. If you need
     * to prevent a session in one test from affecting another test, use `destroyAgentSession`
     * at the end of your test or in an `afterEach`.
     */
    browser.addCommand('resetAgentSession', async function () {
      await browser.execute(function () {
        window.localStorage.clear()
        Object.values(newrelic.initializedAgents).forEach(function (agent) {
          agent.runtime.session.reset()
        })
      })
    })

    browser.addCommand('getAgentSessionInfo', async function () {
      const agentSessions = await browser.execute(function () {
        return Object.entries(newrelic.initializedAgents)
          .reduce(function (aggregate, agentEntry) {
            aggregate[agentEntry[0]] = {
              value: agentEntry[1].runtime.session.value,
              inactiveAt: agentEntry[1].runtime.session.inactiveAt,
              expiresAt: agentEntry[1].runtime.session.expiresAt,
              updatedAt: agentEntry[1].runtime.session.updatedAt,
              sessionReplayActive: agentEntry[1].runtime.session.sessionReplayActive,
              sessionTraceActive: agentEntry[1].runtime.session.sessionTraceActive,
              custom: agentEntry[1].runtime.session.custom
            }
            return aggregate
          }, {})
      })
      const localStorage = await browser.execute(function () {
        return JSON.parse(window.localStorage.getItem('NRBA_SESSION') || '{}')
      })
      return { agentSessions, localStorage }
    })
  }
}
