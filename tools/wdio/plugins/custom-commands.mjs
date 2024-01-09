import { testRumRequest } from '../../testing-server/utils/expect-tests.js'

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
     * Used to wait for the agent to load on the page. A loaded agent
     * has made, received, and processed a RUM call.
     */
    browser.addCommand('waitForAgentLoad', async function () {
      await browser.waitUntil(
        () => browser.execute(function () {
          return window.NREUM && window.NREUM.activatedFeatures && window.NREUM.activatedFeatures.loaded
        }),
        {
          timeout: 30000,
          timeoutMsg: 'Agent never loaded'
        })

      /*
      Wait 500ms to get the agent time to perform all it's initialization processing.
      500ms is probably too long but it's better to be safe than sorry.
      */
      await browser.pause(500)
    })

    /**
     * Clears the current browser agent session from local storage by navigating
     * to the index page where the agent is not loaded and clearing the `localStorage`
     * in the browser. This completely destroys the current agent session ensuring that
     * a new session is not created that could affect another test.
     */
    browser.addCommand('destroyAgentSession', async function () {
      await browser.url(await browser.testHandle.assetURL('/'))
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

    /**
     * Retrieves agent session data from localStorage and all instantiated
     * agents on the page.
     */
    browser.addCommand('getAgentSessionInfo', async function () {
      // WDIO converts empty objects from IE to null (as with default session.state.custom).
      // Sending back a JSON string and parsing it preserves the values.
      const agentSessionsJSON = await browser.execute(function () {
        return JSON.stringify(Object.entries(newrelic.initializedAgents)
          .reduce(function (aggregate, agentEntry) {
            aggregate[agentEntry[0]] = agentEntry[1].runtime.session.state
            return aggregate
          }, {}))
      })
      const agentSessions = JSON.parse(agentSessionsJSON)
      const agentSessionInstances = await browser.execute(function () {
        return Object.entries(newrelic.initializedAgents)
          .reduce(function (aggregate, agentEntry) {
            aggregate[agentEntry[0]] = {
              key: agentEntry[1].runtime.session.key,
              isNew: agentEntry[1].runtime.session.isNew,
              initialized: agentEntry[1].runtime.session.initialized
            }
            return aggregate
          }, {})
      })
      // WDIO converts empty objects from IE to null (as with default session.state.custom).
      // Waiting to parse the JSON string until it is returned preserves the value.
      const localStorageJSON = await browser.execute(function () {
        return window.localStorage.getItem('NRBA_SESSION') || '{}'
      })
      const localStorage = JSON.parse(localStorageJSON)
      return { agentSessions, agentSessionInstances, localStorage }
    })

    /**
     * Sets a permanent scheduled reply for the rum call to include the session
     * replay flag with a value of 1 enabling the feature.
     */
    browser.addCommand('enableSessionReplay', async function () {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        permanent: true,
        body: JSON.stringify({
          stn: 1,
          err: 1,
          ins: 1,
          cap: 1,
          spa: 1,
          loaded: 1,
          sr: 1
        })
      })
    })

    /**
     * Waits for a specific feature aggregate class to be loaded.
     */
    browser.addCommand('waitForFeatureAggregate', async function (feature, timeout) {
      await browser.waitUntil(
        () => browser.execute(function (feat) {
          try {
            var initializedAgent = Object.values(newrelic.initializedAgents)[0]
            return !!(initializedAgent &&
              initializedAgent.features &&
              initializedAgent.features[feat] &&
              initializedAgent.features[feat].featAggregate)
          } catch (err) {
            console.error(err)
            return false
          }
        }, feature),
        {
          timeout: timeout || 30000,
          timeoutMsg: `Aggregate never loaded for feature ${feature}`
        })
    })

    /**
     * Waits for the session replay feature to initialize and start recording.
     */
    browser.addCommand('waitForSessionReplayRecording', async function () {
      await browser.waitForFeatureAggregate('session_replay')
      await browser.waitUntil(
        () => browser.execute(function () {
          try {
            var initializedAgent = Object.values(newrelic.initializedAgents)[0]
            return !!(initializedAgent &&
              initializedAgent.features &&
              initializedAgent.features.session_replay &&
              initializedAgent.features.session_replay.featAggregate &&
              initializedAgent.features.session_replay.featAggregate.initialized &&
              initializedAgent.features.session_replay.featAggregate.recorder &&
              initializedAgent.features.session_replay.featAggregate.recorder.recording)
          } catch (err) {
            console.error(err)
            return false
          }
        }),
        {
          timeout: 30000,
          timeoutMsg: 'Session replay recording never started'
        })
    })

    /**
     * Waits for the session replay feature to initialize and then get blocked.
     */
    browser.addCommand('waitForSessionReplayBlocked', async function () {
      await browser.waitForFeatureAggregate('session_replay')
      await browser.waitUntil(
        () => browser.execute(function () {
          try {
            var initializedAgent = Object.values(newrelic.initializedAgents)[0]
            return !!(initializedAgent &&
              initializedAgent.features &&
              initializedAgent.features.session_replay &&
              initializedAgent.features.session_replay.featAggregate &&
              initializedAgent.features.session_replay.featAggregate.initialized &&
              initializedAgent.features.session_replay.featAggregate.recorder &&
              initializedAgent.features.session_replay.featAggregate.blocked)
          } catch (err) {
            console.error(err)
            return false
          }
        }),
        {
          timeout: 30000,
          timeoutMsg: 'Session replay recording never got blocked'
        })
    })
  }
}
