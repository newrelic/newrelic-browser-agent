/** Triggers for ajax-session metrics. See tests/components/supportability-metrics/harness.js for the trigger shapes. */
import { Instrument as Ajax } from '../../../../src/features/ajax/instrument'
import { Connector } from '../../../../src/common/harvest/connector'
import * as sendModule from '../../../../src/common/harvest/send'
import { setDenyList } from '../../../../src/common/deny-list/deny-list'

/**
 * Sets a value on an object property, runs a callback, then restores the original value.
 * @param {Object} parent
 * @param {string} key
 * @param {*} value
 * @param {function(): (void|Promise<void>)} fn
 */
async function withValue (parent, key, value, fn) {
  const original = parent[key]
  parent[key] = value
  try { await fn() } finally { parent[key] = original }
}

/**
 * Sends an ajax request that the deny list excludes through the ajax aggregate, optionally with the metrics deny list flag on.
 * The deny list is module level state shared by every test, so it is cleared afterwards.
 */
async function excludedAjax ({ toAgentBeacon, omitMetrics }, ctx) {
  const ajax = await ctx.feature(Ajax)
  const { agent } = ctx
  const params = { method: 'GET', status: 200, host: 'excluded.example.com', hostname: toAgentBeacon ? agent.info.errorBeacon : 'excluded.example.com', pathname: '/x' }
  const flags = omitMetrics ? [...agent.init.feature_flags, 'ajax_metrics_deny_list'] : agent.init.feature_flags
  setDenyList(['*'])
  try {
    await withValue(agent.init, 'feature_flags', flags, () => ajax.storeXhr(params, { txSize: 1, rxSize: 1 }, 0, 10, 'fetch', undefined, {}))
  } finally {
    setDenyList([])
  }
}

module.exports = {
  'Ajax/Events/Excluded/Agent': (_, ctx) => excludedAjax({ toAgentBeacon: true }, ctx),
  'Ajax/Metrics/Excluded/Agent': (_, ctx) => excludedAjax({ toAgentBeacon: true, omitMetrics: true }, ctx),
  'Ajax/Events/Excluded/App': (_, ctx) => excludedAjax({}, ctx),
  'Ajax/Metrics/Excluded/App': (_, ctx) => excludedAjax({ omitMetrics: true }, ctx),

  'Ajax/Events/Payload/Bytes-Added': async (_, ctx) => {
    const ajax = await ctx.feature(Ajax)
    ajax.serializer([{ startTime: 0, endTime: 10, method: 'POST', status: 500, domain: 'example.com', path: '/x', requestSize: 1, responseSize: 1, type: 'fetch', requestBody: '{"a":1}', responseBody: '{"b":2}' }])
  },

  'Session/RaceCondition/Seen': async (_, ctx) => {
    await ctx.feature(Ajax) // bootstraps the session the connector checks
    const { agent } = ctx
    const session = agent.runtime.session
    const sends = []
    jest.spyOn(sendModule, 'send').mockImplementation((_agent, opts) => { sends.push(opts) })
    const originalTimeKeeper = agent.runtime.timeKeeper // the Connector constructor replaces it
    const originalCache = session.state.cachedRumResponse
    try {
      await withValue(agent.init, 'feature_flags', [...agent.init.feature_flags, 'rum_v2'], async () => {
        await withValue(agent.runtime, 'activatedFeatures', {}, async () => { // already activated, so the cached response is not re-applied to features
          new Connector(agent) // eslint-disable-line no-new
          /* another tab writes the cached response while this connect request is in flight */
          session.write({ cachedRumResponse: { app: {} } })
          sends[0].cbFinished({ sent: true, status: 200, retry: false, xhr: {}, responseText: '{}' })
        })
      })
    } finally {
      session.write({ cachedRumResponse: originalCache })
      agent.runtime.timeKeeper = originalTimeKeeper
    }
  }
}
