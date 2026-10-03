/** Triggers for harvester retry and browser connect response metrics. See tests/components/supportability-metrics/harness.js for the trigger shapes. */
import * as sendModule from '../../../../src/common/harvest/send'
import { Harvester } from '../../../../src/common/harvest/harvester'
import { Connector } from '../../../../src/common/harvest/connector'

/**
 * Harvests a feature twice through a real Harvester: the first harvest fails with the given status and is marked retryable, then the
 * next harvest of the same feature either fails again or succeeds. Only the network call itself is replaced.
 * @param {Object} agent The shared agent.
 * @param {string} featureName
 * @param {number} status HTTP status of the first (failed) harvest.
 * @param {boolean} retrySucceeds Whether the second harvest succeeds.
 */
function harvestTwice (agent, featureName, status, retrySucceeds) {
  const results = [
    { sent: true, status, retry: true },
    retrySucceeds ? { sent: true, status: 200, retry: false } : { sent: true, status, retry: true }
  ]
  jest.spyOn(sendModule, 'send').mockImplementation((_, { cbFinished }) => {
    cbFinished(results.shift())
    return true
  })
  const aggregate = {
    featureName,
    ee: agent.ee,
    harvestOpts: {},
    makeHarvestPayload: () => ({ body: {} }),
    postHarvestCleanup: () => {}
  }
  const harvester = new Harvester(agent)
  harvester.triggerHarvestFor(aggregate)
  harvester.triggerHarvestFor(aggregate)
}

/**
 * Makes a real Connector's browser connect request fail with the given status, so it reports the BCS/Error metrics. Those are sent as raw
 * `{ params, stats }` objects in the body of a request to the metrics endpoint, not through the event emitter, so see the report for
 * what the harness observer needs to watch. The shared agent's runtime and emitter are restored afterwards.
 * @param {Object} agent The shared agent.
 * @param {number} status HTTP status of the failed connect response.
 */
function failConnect (agent, status) {
  const timeKeeper = agent.runtime.timeKeeper
  const featureFlags = agent.init.feature_flags
  const sendSpy = jest.spyOn(sendModule, 'send').mockImplementation((_, { featureName, cbFinished }) => {
    if (featureName === 'connect') cbFinished({ sent: true, status, retry: false, xhr: {}, responseText: '' })
    return true
  })
  jest.spyOn(agent.ee, 'abort').mockImplementation(() => {}) // a failed connect aborts the agent, which must not affect later tests
  agent.init.feature_flags = [...featureFlags, 'rum_v2']
  const hadTextEncoder = 'TextEncoder' in globalThis
  if (!hadTextEncoder) globalThis.TextEncoder = require('util').TextEncoder // jsdom does not provide it
  try {
    new Connector(agent) // eslint-disable-line no-new
  } finally {
    if (!hadTextEncoder) delete globalThis.TextEncoder
    agent.init.feature_flags = featureFlags
    agent.runtime.timeKeeper = timeKeeper
  }
  return sendSpy
}

module.exports = {
  'Harvester/Retry/Attempted/<feature>': {
    run: (featureName, { agent }) => harvestTwice(agent, featureName, 503, true)
  },

  'Harvester/Retry/Failed/<code>': {
    run: (code, { agent }) => harvestTwice(agent, 'logging', Number(code), false)
  },

  'Harvester/Retry/Succeeded/<code>': {
    run: (code, { agent }) => harvestTwice(agent, 'logging', Number(code), true)
  },

  'BCS/Error/<code>': {
    run: (code, { agent }) => failConnect(agent, Number(code))
  },

  'BCS/Error/Dropped/Bytes': (_, { agent }) => failConnect(agent, 500),

  'BCS/Error/Duration/Ms': (_, { agent }) => failConnect(agent, 500)
}
