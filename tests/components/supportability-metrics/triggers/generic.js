/** Triggers for generic metrics. See tests/components/supportability-metrics/harness.js for the trigger shapes. */
import { Aggregate as GenericEventsAggregate } from '../../../../src/features/generic_events/aggregate'
import { TimeKeeper } from '../../../../src/common/timing/time-keeper'
import { Connector } from '../../../../src/common/harvest/connector'
import * as sendModule from '../../../../src/common/harvest/send'
import * as featureFlagsModule from '../../../../src/common/util/feature-flags'
import { originTime } from '../../../../src/common/constants/runtime'

/**
 * Runs a callback with a new generic events aggregate, created while the given init overrides are in place. The overrides stay in place
 * for the whole callback (some are read when an event arrives) and are then restored. A new aggregate per trigger is needed because the
 * handlers it registers depend on the init settings it was created with.
 * @param {Object} ctx The shared trigger context.
 * @param {Object} overrides Init top-level keys to replace, e.g. `{ performance: {...} }`.
 * @param {function(Object): Promise<void>} fn Receives the aggregate once it has received its flags and drained.
 */
async function withGenericEvents (ctx, overrides, fn) {
  const { agent } = ctx
  const originalInit = {}
  const hadActivated = Object.prototype.hasOwnProperty.call(agent.runtime, 'activatedFeatures')
  const originalActivated = agent.runtime.activatedFeatures
  Object.keys(overrides).forEach(key => { originalInit[key] = agent.init[key] })
  Object.assign(agent.init, overrides)
  try {
    const aggregate = new GenericEventsAggregate(agent)
    agent.ee.emit('rumresp', [{ ins: 1 }])
    await new Promise(process.nextTick)
    ctx.forceDrain(aggregate)
    await fn(aggregate)
  } finally {
    Object.assign(agent.init, originalInit)
    if (hadActivated) agent.runtime.activatedFeatures = originalActivated
  }
}

/** Builds a performance resource entry for the given URL. */
const resourceEntry = (name) => ({
  toJSON: () => ({ name, duration: 10, startTime: performance.now(), initiatorType: 'script' })
})

const resourceInit = (ctx) => ({
  performance: { ...ctx.agent.init.performance, resources: { enabled: true, asset_types: [], first_party_domains: [], ignore_newrelic: false } }
})

/** Creates a click (or other) event on a button, with a controllable timestamp. */
const buttonEvent = (button, type, timeStamp) => ({ type, target: button, timeStamp })

/**
 * Emits user action events through the real 'ua' handler, then a different event so the aggregated action is completed and reported.
 * @param {Object} ctx The shared trigger context.
 * @param {function(Object, HTMLElement): Promise<void>} between Runs after the clicks and before the action is completed.
 * @param {number[]} clickTimes Timestamps of the clicks to emit.
 */
async function emitUserActions (ctx, between, clickTimes, { fakeTimers = false } = {}) {
  const userActions = { ...ctx.agent.init.user_actions, enabled: true }
  const button = document.createElement('button')
  button.id = 'sm-frustration-button'
  document.body.appendChild(button)
  try {
    await withGenericEvents(ctx, { user_actions: userActions }, async (aggregate) => {
      if (fakeTimers) jest.useFakeTimers({ doNotFake: ['nextTick'] })
      try {
        clickTimes.forEach(time => ctx.agent.ee.emit('ua', [buttonEvent(button, 'click', time)]))
        await between(aggregate, button)
      } finally {
        if (fakeTimers) jest.useRealTimers()
      }
      ctx.agent.ee.emit('ua', [buttonEvent(button, 'keydown', 10000)]) // a different action completes the click aggregation
    })
  } finally {
    button.remove()
  }
}

/**
 * Builds the fake agent and timekeeper state used to drive the connector's RUM response handling, with a timekeeper that is already
 * ready (as if the server time difference were stored in the session) and whose corrected origin time is ahead of the server time.
 */
function connectWithInvalidTimestamp (ctx) {
  const sendSpy = jest.spyOn(sendModule, 'send').mockReturnValue(true)
  jest.spyOn(featureFlagsModule, 'activateFeatures').mockImplementation(() => {})
  const agent = {
    init: { feature_flags: ['rum_v2'] },
    info: { licenseKey: 'license-key', applicationID: 'app-id' },
    ee: ctx.agent.ee,
    runtime: {
      appMetadata: {},
      session: { state: { cachedRumResponse: undefined }, read: () => ({}), write: () => {} }
    }
  }
  new Connector(agent) // eslint-disable-line no-new
  Object.defineProperty(agent.runtime.timeKeeper, 'ready', { value: true, configurable: true })
  Object.defineProperty(agent.runtime.timeKeeper, 'correctedOriginTime', { value: 12000, configurable: true })
  agent.runtime.timeKeeper.processRumRequest = () => {}
  sendSpy.mock.calls[0][1].cbFinished({
    sent: true,
    status: 200,
    retry: false,
    xhr: { status: 200 },
    responseText: JSON.stringify({ app: { agents: [{ entityGuid: 'guid' }], nrServerTime: 10000 }, config: { err: 1 } })
  })
}

/** Completes a WebSocket through the real 'ws-complete' handler, which reports both the count and the size metrics. */
const completeWebSocket = (_, ctx) => withGenericEvents(ctx, { web_sockets: { enabled: true } }, async () => {
  ctx.agent.ee.emit('ws-complete', [{ timestamp: 1, openedAt: 1, closedAt: 2, requestedUrl: 'wss://example.com', closeCode: 1000 }])
})

module.exports = {
  'UserAction/RageClick/Seen': (_, ctx) => emitUserActions(ctx, async () => {}, [0, 100, 200, 300, 400, 500]),

  'UserAction/ErrorClick/Seen': (_, ctx) => emitUserActions(ctx, async () => {
    ctx.agent.ee.emit('uaErr', [])
  }, [0]),

  'UserAction/DeadClick/Seen': (_, ctx) => emitUserActions(ctx, async () => {
    /* the dead click is decided by a real 2s timer, so the clicks and the wait run on fake timers */
    jest.advanceTimersByTime(2500)
  }, [0], { fakeTimers: true }),

  'Generic/Performance/Resource/Seen': (_, ctx) => withGenericEvents(ctx, resourceInit(ctx), async () => {
    ctx.agent.ee.emit('browserPerformance.resource', [resourceEntry('https://cdn.example.com/a.js')])
  }),

  'Generic/Performance/FirstPartyResource/Seen': (_, ctx) => withGenericEvents(ctx, resourceInit(ctx), async () => {
    ctx.agent.ee.emit('browserPerformance.resource', [resourceEntry(`${location.origin}/first-party.js`)])
  }),

  'Generic/Performance/NrResource/Seen': (_, ctx) => withGenericEvents(ctx, resourceInit(ctx), async () => {
    ctx.agent.ee.emit('browserPerformance.resource', [resourceEntry('https://js-agent.newrelic.com/nr-loader.min.js')])
  }),

  'WebSocket/Completed/Seen': completeWebSocket,

  'WebSocket/Completed/Bytes': completeWebSocket,

  'Generic/TimeKeeper/InvalidTimestamp/Seen': (_, ctx) => connectWithInvalidTimestamp(ctx),

  'Generic/TimeKeeper/ClockDrift/Detected': async (_, { agent }) => {
    const session = { agentRef: agent, read: () => ({}), write: () => {} }
    const timeKeeper = new TimeKeeper(session)
    timeKeeper.processRumRequest({}, 100, 200, Date.now())
    const realNow = performance.now()
    // the wall clock advances 5s more than the performance clock, as if the machine slept
    jest.spyOn(performance, 'now').mockReturnValue(realNow)
    jest.spyOn(Date, 'now').mockReturnValue(originTime + realNow + 5000)
    timeKeeper.convertRelativeTimestamp(realNow)
  }
}
